"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/components/language-provider"
import { useAuth } from "@/hooks/use-auth"

export function StatsCards() {
  const router = useRouter()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    delivered: 0,
  })

  useEffect(() => {
    const updateStats = async () => {
      if (!user?.id) return
      
      try {
        // Load tickets from API instead of localStorage
        const response = await fetch(`/api/repairs?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          const ticketsArray = Array.isArray(data.tickets) ? data.tickets : []
          setStats({
            total: ticketsArray.length,
            pending: ticketsArray.filter((t: any) => t.status === "PENDING" || t.status === "pending").length,
            inProgress: ticketsArray.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "in_progress").length,
            completed: ticketsArray.filter((t: any) => t.status === "COMPLETED" || t.status === "completed").length,
            delivered: ticketsArray.filter((t: any) => t.status === "DELIVERED" || t.status === "delivered").length,
          })
        } else {
          console.error("[StatsCards] Failed to load tickets from API")
          setStats({
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            delivered: 0,
          })
        }
      } catch (error) {
        console.error("[StatsCards] Error fetching tickets:", error)
        // Set default stats on error
        setStats({
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          delivered: 0,
        })
      }
    }
    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds instead of 1
    return () => clearInterval(interval)
  }, [user?.id])

  const handleCardClick = (status?: string) => {
    if (!status || status === "all") {
      router.push("/tickets")
    } else if (status === "pending") {
      router.push("/tickets/pending")
    } else if (status === "in_progress") {
      router.push("/tickets/in-progress")
    } else if (status === "completed") {
      router.push("/tickets/completed")
    } else if (status === "delivered") {
      router.push("/tickets/out")
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
      <Card
        className="shadow-lg border-0 bg-gray-800 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative"
        onClick={() => handleCardClick("all")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-white uppercase tracking-wide">
            {t("stats.totalDevices")}
          </CardTitle>
          <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-gray-600">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-white mb-1">{stats.total}</div>
          <p className="text-xs text-gray-300 font-medium">{t("stats.allRepairDevices")}</p>
        </CardContent>
      </Card>

      <Card
        className="shadow-lg border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative"
        onClick={() => handleCardClick("pending")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-yellow-300 uppercase tracking-wide">
            {t("status.pending")}
          </CardTitle>
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-yellow-500/50">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-yellow-300 mb-1">{stats.pending}</div>
          <p className="text-xs text-yellow-200 font-medium">{t("stats.awaitingService")}</p>
        </CardContent>
      </Card>

      <Card
        className="shadow-lg border-2 border-red-500/50 bg-gradient-to-br from-red-900/30 to-red-800/20 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative"
        onClick={() => handleCardClick("in_progress")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-red-300 uppercase tracking-wide">
            {t("status.in_progress")} (Not OK)
          </CardTitle>
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-red-500/50">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-red-300 mb-1">{stats.inProgress}</div>
          <p className="text-xs text-red-200 font-medium">{t("stats.currentlyBeingCompleted")}</p>
        </CardContent>
      </Card>

      <Card
        className="shadow-lg border-2 border-green-500/50 bg-gradient-to-br from-green-900/30 to-green-800/20 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative"
        onClick={() => handleCardClick("completed")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-green-300 uppercase tracking-wide">
            {t("status.completed")}
          </CardTitle>
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-green-500/50">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-green-300 mb-1">{stats.completed}</div>
          <p className="text-xs text-green-200 font-medium">{t("stats.repairsFinished")}</p>
        </CardContent>
      </Card>

      <Card
        className="shadow-lg border-0 bg-gray-800 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group overflow-hidden relative"
        onClick={() => handleCardClick("delivered")}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
          <CardTitle className="text-sm font-semibold text-white uppercase tracking-wide">
            {t("status.delivered")}
          </CardTitle>
          <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-gray-600">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-4xl font-bold text-white mb-1">{stats.delivered}</div>
          <p className="text-xs text-gray-300 font-medium">{t("stats.returnedToCustomers")}</p>
        </CardContent>
      </Card>
    </div>
  )
}

