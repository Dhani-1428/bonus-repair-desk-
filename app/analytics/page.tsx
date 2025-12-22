"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/components/language-provider"
import { useAuth } from "@/hooks/use-auth"
import { getUserData } from "@/lib/storage"

export default function AnalyticsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [analytics, setAnalytics] = useState({
    totalDevices: 0,
    totalRevenue: 0,
    averagePrice: 0,
    statusDistribution: {
      pending: 0,
      inProgress: 0,
      completed: 0,
      delivered: 0,
    },
    recentDevices: [] as any[],
  })

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    const updateAnalytics = async () => {
      if (!user?.id) return
      
      try {
        // Load tickets from API instead of localStorage
        const response = await fetch(`/api/repairs?userId=${user.id}`)
        if (!response.ok) {
          console.error("[Analytics] Failed to load tickets from API")
          return
        }
        
        const data = await response.json()
        const ticketsArray = Array.isArray(data.tickets) ? data.tickets : []
        
        const totalRevenue = ticketsArray.reduce((sum: number, ticket: any) => {
          return sum + (parseFloat(ticket.price) || 0)
        }, 0)

        const averagePrice = ticketsArray.length > 0 ? totalRevenue / ticketsArray.length : 0

        const statusDistribution = {
          pending: ticketsArray.filter((t: any) => t.status === "PENDING" || t.status === "pending").length,
          inProgress: ticketsArray.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "in_progress").length,
          completed: ticketsArray.filter((t: any) => t.status === "COMPLETED" || t.status === "completed").length,
          delivered: ticketsArray.filter((t: any) => t.status === "DELIVERED" || t.status === "delivered").length,
        }

        const recentDevices = ticketsArray
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)

        setAnalytics({
          totalDevices: ticketsArray.length,
          totalRevenue,
          averagePrice,
          statusDistribution,
          recentDevices,
        })
      } catch (error) {
        console.error("[Analytics] Error fetching tickets:", error)
        // Set default analytics on error
        setAnalytics({
          totalDevices: 0,
          totalRevenue: 0,
          averagePrice: 0,
          statusDistribution: {
            pending: 0,
            inProgress: 0,
            completed: 0,
            delivered: 0,
          },
          recentDevices: [],
        })
      }
    }

    updateAnalytics()
    const interval = setInterval(updateAnalytics, 5000) // Update every 5 seconds instead of 1
    return () => clearInterval(interval)
  }, [])

  if (!user) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50"
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "delivered":
        return "bg-purple-500/20 text-purple-400 border-purple-500/50"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-gray-300">Comprehensive insights into your repair business</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Total Devices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white mb-1">{analytics.totalDevices}</div>
              <p className="text-xs text-gray-400">All repair devices</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white mb-1">€{Number.parseFloat(analytics.totalRevenue || 0).toFixed(2)}</div>
              <p className="text-xs text-gray-400">From all completed repairs</p>
            </CardContent>
          </Card>

          <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-lg">
              <CardTitle className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Average Price
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-4xl font-bold text-white mb-1">€{Number.parseFloat(analytics.averagePrice || 0).toFixed(2)}</div>
              <p className="text-xs text-gray-400">Per device repair</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Distribution */}
        <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-600/10 to-yellow-500/5 border border-yellow-500/20">
                <div className="text-3xl font-bold text-yellow-400 mb-1">{analytics.statusDistribution.pending}</div>
                <p className="text-sm text-gray-300">Pending</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-600/10 to-blue-500/5 border border-blue-500/20">
                <div className="text-3xl font-bold text-blue-400 mb-1">{analytics.statusDistribution.inProgress}</div>
                <p className="text-sm text-gray-300">In Progress</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-600/10 to-green-500/5 border border-green-500/20">
                <div className="text-3xl font-bold text-green-400 mb-1">{analytics.statusDistribution.completed}</div>
                <p className="text-sm text-gray-300">Completed</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-600/10 to-purple-500/5 border border-purple-500/20">
                <div className="text-3xl font-bold text-purple-400 mb-1">{analytics.statusDistribution.delivered}</div>
                <p className="text-sm text-gray-300">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Devices */}
        <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {analytics.recentDevices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No devices yet. Create your first device entry!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.recentDevices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 border-2 border-gray-800/50 rounded-xl bg-gradient-to-r from-gray-900/50 to-black/50 hover:from-gray-800/50 hover:to-gray-900/50 transition-all shadow-lg hover:shadow-xl hover:border-blue-500/50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {device.customerName?.charAt(0).toUpperCase() || "D"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-lg text-white">{device.customerName}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(device.status)}`}>
                            {device.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                          <span>{device.model}</span>
                          <span>•</span>
                          <span className="font-mono text-xs">{device.imeiNo}</span>
                          <span>•</span>
                          <span className="font-bold text-white">€{device.price}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {new Date(device.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

