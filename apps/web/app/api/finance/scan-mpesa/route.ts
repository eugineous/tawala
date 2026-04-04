import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { deduplicateTransactions } from '@tawala/core'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Transaction } from '@tawala/core'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()

  // Parse multipart form data
  const formData = await req.formData()
  const imageFile = formData.get('image') as File | null

  if (!imageFile) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  // Convert to buffer and base64
  const arrayBuffer = await imageFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64 = buffer.toString('base64')
  const mimeType = imageFile.type || 'image/jpeg'
  const imageBase64DataUrl = `data:${mimeType};base64,${base64}`

  // Upload to Supabase Storage
  const fileName = `${user.id}/${Date.now()}-${imageFile.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('mpesa-screenshots')
    .upload(fileName, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
  }

  // Get signed URL if upload succeeded
  let signedUrl = ''
  if (uploadData) {
    const { data: urlData } = await supabase.storage
      .from('mpesa-screenshots')
      .createSignedUrl(fileName, 3600)
    signedUrl = urlData?.signedUrl ?? ''
  }

  // Call NVIDIA NIM vision API for OCR
  let rawTransactions: Array<{
    amount: number
    recipient: string
    date: string
    mpesa_ref: string
    type: string
  }> = []

  try {
    const nvResponse = await fetch(
      'https://ai.api.nvidia.com/v1/gr/meta-llama/llama-3.2-11b-vision-instruct/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.2-11b-vision-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all M-Pesa transaction details from this screenshot. Return JSON array with fields: amount, recipient, date, mpesa_ref, type (sent/received/payment).',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageBase64DataUrl },
                },
              ],
            },
          ],
          max_tokens: 1024,
        }),
      }
    )

    if (nvResponse.ok) {
      const nvData = await nvResponse.json()
      const content = nvData.choices?.[0]?.message?.content ?? ''
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        rawTransactions = JSON.parse(jsonMatch[0])
      }
    }
  } catch (err) {
    console.error('NVIDIA NIM error:', err)
    return NextResponse.json({ error: 'UNREADABLE', transactions: [] })
  }

  if (!rawTransactions.length) {
    return NextResponse.json({ error: 'UNREADABLE', transactions: [] })
  }

  // Use Gemini to categorize transactions
  let categorized: Array<{ category: string; mpesa_ref: string }> = []
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const catResult = await model.generateContent(
      `Categorize these M-Pesa transactions into one of: food, transport, rent, utilities, entertainment, health, savings, investment, family_support, tithe, other. Return JSON array with fields: mpesa_ref, category.\n\nTransactions: ${JSON.stringify(rawTransactions)}`
    )
    const catText = catResult.response.text()
    const catMatch = catText.match(/\[[\s\S]*\]/)
    if (catMatch) {
      categorized = JSON.parse(catMatch[0])
    }
  } catch (err) {
    console.error('Gemini categorization error:', err)
  }

  const categoryMap: Record<string, string> = {}
  for (const c of categorized) {
    categoryMap[c.mpesa_ref] = c.category
  }

  // Build Transaction objects
  const today = new Date().toISOString().slice(0, 10)
  const transactions: Omit<Transaction, 'id' | 'created_at'>[] = rawTransactions.map((rt) => ({
    user_id: user.id,
    amount_kes: rt.amount,
    type: rt.type === 'received' ? 'income' : 'expense',
    category: (categoryMap[rt.mpesa_ref] ?? 'other') as Transaction['category'],
    description: `M-Pesa: ${rt.recipient}`,
    source: 'mpesa_scan' as const,
    mpesa_ref: rt.mpesa_ref || null,
    date: rt.date || today,
  }))

  // Deduplicate using core function
  const existingRefs = new Set<string>()
  const { data: existingTxs } = await supabase
    .from('transactions')
    .select('mpesa_ref')
    .eq('user_id', user.id)
    .not('mpesa_ref', 'is', null)

  for (const tx of existingTxs ?? []) {
    if (tx.mpesa_ref) existingRefs.add(tx.mpesa_ref)
  }

  const toInsert = transactions.filter(
    (tx) => !tx.mpesa_ref || !existingRefs.has(tx.mpesa_ref)
  )

  // Also run deduplicateTransactions from core on the new batch
  const deduped = deduplicateTransactions(
    toInsert.map((t) => ({ ...t, id: '', created_at: '' }))
  )

  let saved: Transaction[] = []
  if (deduped.length > 0) {
    const { data: insertedData } = await supabase
      .from('transactions')
      .insert(deduped.map(({ id: _id, created_at: _ca, ...rest }) => rest))
      .select()
    saved = insertedData ?? []
  }

  return NextResponse.json({ transactions: saved, count: saved.length, signedUrl })
}
