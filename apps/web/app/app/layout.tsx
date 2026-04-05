import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { BottomNav } from '@/components/BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  )
}
