"use client"

import dynamic from 'next/dynamic'

const GeoAIDashboard = dynamic(() => import('@/components/geo-ai-dashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">Loading GeoAI Dashboard...</p>
      </div>
    </div>
  ),
})

export default function GeoAIDashboardWrapper() {
  return <GeoAIDashboard />
}
