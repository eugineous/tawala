import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const SEED_VERSES = [
  { reference: 'Proverbs 3:5-6', text_en: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', text_sw: 'Mtumainie Bwana kwa moyo wako wote, wala usitegemee akili zako mwenyewe; katika njia zako zote mkiri yeye, naye atazirekebisha njia zako.', theme: 'trust' },
  { reference: 'Philippians 4:13', text_en: 'I can do all this through him who gives me strength.', text_sw: 'Naweza kufanya mambo yote katika yeye aniyenipa nguvu.', theme: 'strength' },
  { reference: 'Jeremiah 29:11', text_en: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.', text_sw: 'Kwa maana najua mawazo ninayowafikiria ninyi, asema Bwana, mawazo ya amani wala si ya mabaya, kuwapa mustakabali na tumaini.', theme: 'purpose' },
  { reference: 'Romans 8:28', text_en: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', text_sw: 'Nasi tunajua ya kwamba mambo yote yanafanya kazi pamoja kwa wale wampendao Mungu, yaani, wale walioitwa kwa kusudi lake.', theme: 'faith' },
  { reference: 'Joshua 1:9', text_en: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.', text_sw: 'Je, sikukuamrisha? Uwe hodari na jasiri. Usiogope wala usifadhaike, kwa maana Bwana Mungu wako yuko pamoja nawe kila uendako.', theme: 'courage' },
  { reference: 'Matthew 6:33', text_en: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.', text_sw: 'Bali utafuteni kwanza ufalme wake na haki yake, na hizi zote mtazidishiwa.', theme: 'priorities' },
  { reference: 'Psalm 23:1', text_en: 'The LORD is my shepherd, I lack nothing.', text_sw: 'Bwana ndiye mchungaji wangu; sitapungukiwa na kitu chochote.', theme: 'provision' },
  { reference: 'Isaiah 40:31', text_en: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', text_sw: 'Bali wao wamtumainio Bwana watapata nguvu mpya; watapaa juu kwa mabawa kama tai; watakimbia, wala hawatachoka; watakwenda, wala hawatalegea.', theme: 'renewal' },
  { reference: '2 Timothy 1:7', text_en: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.', text_sw: 'Kwa maana Mungu hakutupa roho ya woga, bali ya nguvu na ya upendo na ya moyo wa kiasi.', theme: 'boldness' },
  { reference: 'Psalm 46:1', text_en: 'God is our refuge and strength, an ever-present help in trouble.', text_sw: 'Mungu ni kimbilio letu na nguvu zetu, msaada utakaoonekana sana katika shida.', theme: 'refuge' },
  { reference: 'John 3:16', text_en: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', text_sw: 'Kwa maana Mungu aliupenda ulimwengu kiasi kwamba alimtoa Mwanawe wa pekee, ili kila mtu amwaminiye asipotee bali awe na uzima wa milele.', theme: 'love' },
  { reference: 'Psalm 119:105', text_en: 'Your word is a lamp for my feet, a light on my path.', text_sw: 'Neno lako ni taa ya miguu yangu, na mwanga wa njia yangu.', theme: 'guidance' },
  { reference: 'Galatians 5:22-23', text_en: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.', text_sw: 'Bali tunda la Roho ni upendo, furaha, amani, uvumilivu, utu wema, fadhili, uaminifu, upole, kiasi.', theme: 'character' },
  { reference: 'Proverbs 16:3', text_en: 'Commit to the LORD whatever you do, and he will establish your plans.', text_sw: 'Mkabidhi Bwana kazi zako, na mipango yako itafanikiwa.', theme: 'commitment' },
  { reference: 'Romans 12:2', text_en: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind.', text_sw: 'Msiifuate mfano wa dunia hii, bali mgeuzwe kwa kufanywa upya nia zenu.', theme: 'transformation' },
  { reference: 'Psalm 37:4', text_en: 'Take delight in the LORD, and he will give you the desires of your heart.', text_sw: 'Umfurahie Bwana, naye atakupa haja za moyo wako.', theme: 'delight' },
  { reference: 'Matthew 11:28', text_en: 'Come to me, all you who are weary and burdened, and I will give you rest.', text_sw: 'Njooni kwangu, ninyi nyote msumbukao na wenye mzigo mzito, nami nitawapumzisha.', theme: 'rest' },
  { reference: 'Ephesians 2:10', text_en: 'For we are God\'s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.', text_sw: 'Kwa maana sisi tu kazi yake, tuliumbwa katika Kristo Yesu tupate kufanya matendo mema.', theme: 'purpose' },
  { reference: '1 Corinthians 10:13', text_en: 'No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear.', text_sw: 'Hakuna jaribu lililowapata ila la kawaida ya wanadamu; na Mungu ni mwaminifu, ambaye hatawaacha mjaribiwe kupita mwezavyo.', theme: 'faithfulness' },
  { reference: 'Philippians 4:6-7', text_en: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', text_sw: 'Msijishughulishe na neno lolote, bali katika kila neno, kwa maombi na dua pamoja na kushukuru, haja zenu na zijulikane na Mungu. Na amani ya Mungu, ipitayo akili zote, itazilinda nyoyo zenu na nia zenu katika Kristo Yesu.', theme: 'peace' },
  { reference: 'Isaiah 41:10', text_en: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.', text_sw: 'Usiogope, kwa maana mimi niko pamoja nawe; usifadhaike, kwa maana mimi ni Mungu wako; nitakutia nguvu, naam, nitakusaidia; naam, nitakushika kwa mkono wangu wa kuume wa haki.', theme: 'courage' },
  { reference: 'Lamentations 3:22-23', text_en: 'Because of the LORD\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.', text_sw: 'Ni kwa sababu ya fadhili za Bwana ambazo haziishi, kwa maana rehema zake haziishi. Zinaendelea upya kila asubuhi; uaminifu wako ni mkubwa.', theme: 'mercy' },
  { reference: 'Hebrews 11:1', text_en: 'Now faith is confidence in what we hope for and assurance about what we do not see.', text_sw: 'Basi imani ni kuwa na hakika ya mambo yatarajiwayo, ni ushahidi wa mambo yasiyoonekana.', theme: 'faith' },
  { reference: 'James 1:5', text_en: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.', text_sw: 'Na kama mtu wenu anapungukiwa na hekima, na aombe kwa Mungu, awapaye wote kwa ukarimu wala hakemei; naye atapewa.', theme: 'wisdom' },
  { reference: 'Psalm 1:1-2', text_en: 'Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take or sit in the company of mockers, but whose delight is in the law of the LORD, and who meditates on his law day and night.', text_sw: 'Heri mtu asiyekwenda katika shauri la waovu, wala kusimama katika njia ya wenye dhambi, wala kuketi katika mkutano wa wenye dharau. Bali anayependezwa na sheria ya Bwana, na kuifikiria sheria yake mchana na usiku.', theme: 'righteousness' },
  { reference: 'Colossians 3:23', text_en: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.', text_sw: 'Lolote mfanyalo, fanyeni kwa moyo wote, kama kwa Bwana, wala si kwa wanadamu.', theme: 'diligence' },
  { reference: '2 Chronicles 7:14', text_en: 'If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven, and I will forgive their sin and will heal their land.', text_sw: 'Kama watu wangu, wanaoitwa kwa jina langu, watajinyenyekeza, na kuomba, na kutafuta uso wangu, na kuacha njia zao mbaya; basi nitasikia kutoka mbinguni, na kuwasamehe dhambi zao, na kuiponya nchi yao.', theme: 'repentance' },
  { reference: 'Micah 6:8', text_en: 'He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.', text_sw: 'Amekuonyesha, Ee mtu, lililo jema; na Bwana anataka nini kwako, ila kutenda haki, na kupenda rehema, na kuinamia kwa unyenyekevu mbele za Mungu wako?', theme: 'justice' },
  { reference: 'Psalm 121:1-2', text_en: 'I lift up my eyes to the mountains — where does my help come from? My help comes from the LORD, the Maker of heaven and earth.', text_sw: 'Nainua macho yangu juu ya milima; msaada wangu utatoka wapi? Msaada wangu unatoka kwa Bwana, aliyezifanya mbingu na nchi.', theme: 'help' },
  { reference: 'John 14:6', text_en: 'Jesus answered, "I am the way and the truth and the life. No one comes to the Father except through me."', text_sw: 'Yesu akamwambia, Mimi ndimi njia, na kweli, na uzima; mtu haji kwa Baba, ila kwa njia ya mimi.', theme: 'salvation' },
]

export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  // Check for today's verse
  const { data: existing } = await supabase
    .from('bible_verses')
    .select('*')
    .eq('date', today)
    .single()

  if (existing) {
    return NextResponse.json({ verse: existing })
  }

  // Check total verse count
  const { count } = await supabase
    .from('bible_verses')
    .select('*', { count: 'exact', head: true })

  // Seed if fewer than 30 verses
  if ((count ?? 0) < 30) {
    const { data: existingVerses } = await supabase
      .from('bible_verses')
      .select('reference')

    const existingRefs = new Set((existingVerses ?? []).map((v: { reference: string }) => v.reference))
    const toInsert = SEED_VERSES.filter((v) => !existingRefs.has(v.reference))

    if (toInsert.length > 0) {
      await supabase.from('bible_verses').insert(toInsert)
    }
  }

  // Pick a verse for today (deterministic by day-of-year)
  const { data: allVerses } = await supabase
    .from('bible_verses')
    .select('*')
    .is('date', null)
    .order('id')

  if (!allVerses || allVerses.length === 0) {
    return NextResponse.json({ error: 'No verses available' }, { status: 500 })
  }

  const dayOfYear = Math.floor(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  const verse = allVerses[dayOfYear % allVerses.length]

  // Assign today's date to this verse
  await supabase
    .from('bible_verses')
    .update({ date: today })
    .eq('id', verse.id)

  return NextResponse.json({ verse: { ...verse, date: today } })
}
