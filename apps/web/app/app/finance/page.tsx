'use client'
import dynamic from 'next/dynamic'
const FinancePage = dynamic(() => import('@/components/pages/FinancePage'), { ssr: false })
export default FinancePage
