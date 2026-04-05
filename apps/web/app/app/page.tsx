'use client'

import dynamic from 'next/dynamic'

// Dynamically import the dashboard with no SSR to avoid hydration mismatches
const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false })

export default function AppHomePage() {
  return <Dashboard />
}
