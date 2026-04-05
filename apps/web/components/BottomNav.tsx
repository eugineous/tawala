'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, WalletIcon, LeafIcon, CrossIcon, TargetIcon, BrainIcon, UsersIcon } from '@/components/icons'

const navItems = [
  { href: '/app', label: 'Home', Icon: HomeIcon },
  { href: '/app/finance', label: 'Finance', Icon: WalletIcon },
  { href: '/app/keto', label: 'Keto', Icon: LeafIcon },
  { href: '/app/spirit', label: 'Spirit', Icon: CrossIcon },
  { href: '/app/goals', label: 'Goals', Icon: TargetIcon },
  { href: '/app/mental', label: 'Mental', Icon: BrainIcon },
  { href: '/app/family', label: 'Family', Icon: UsersIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/app') return pathname === '/app'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1f1f1f] bg-black">
      <ul className="flex items-center justify-around px-1 py-2">
        {navItems.map(({ href, label, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 px-2 py-1 transition-colors ${
                  active ? 'text-violet-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {active && <span className="w-1 h-1 rounded-full bg-violet-500" />}
                <span className="hidden sm:block text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
