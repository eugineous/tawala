import Link from 'next/link'
import type { ReactNode } from 'react'

const navItems = [
  { href: '/app', label: 'Home', icon: '🏠' },
  { href: '/app/finance', label: 'Finance', icon: '💰' },
  { href: '/app/keto', label: 'Keto', icon: '🥑' },
  { href: '/app/spirit', label: 'Spirit', icon: '✝️' },
  { href: '/app/goals', label: 'Goals', icon: '🎯' },
  { href: '/app/mental', label: 'Mental', icon: '🧠' },
  { href: '/app/family', label: 'Family', icon: '👨‍👩‍👧' },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-black">
        <ul className="flex items-center justify-around px-1 py-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1 text-zinc-400 transition-colors hover:text-white"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
