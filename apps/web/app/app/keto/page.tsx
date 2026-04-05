import dynamic from 'next/dynamic'
const KetoPage = dynamic(() => import('@/components/pages/KetoPage'), { ssr: false })
export default KetoPage
