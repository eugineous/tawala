'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/app', label: 'Home', icon: '🏠' },
  { href: '/app/finance', label: 'Finance', icon: '💰' },
  { href: '/app/keto', label: 'Keto', icon: '🥑' },
  { href: '/app/spirit', label: 'Spirit', icon: '✝️' },
  { href: '/app/goals', label: 'Goals', icon: '🎯' },
  { href: '/app/mental', label: 'Mental', icon: '🧠' },
  { href: '/app/family', label: 'Family', icon: '👨‍👩‍👧' },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-900 bg-black">
      <ul className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                  active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
