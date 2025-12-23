"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/components/language-provider"
import { useAuth } from "@/hooks/use-auth"

export function RepairTicketList() {
  const router = useRouter()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    const loadTickets = async () => {
      if (!user?.id) return
      
      try {
        // Load tickets from API instead of localStorage
        const response = await fetch(`/api/repairs?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          const ticketsArray = Array.isArray(data.tickets) ? data.tickets : []
          setTickets(ticketsArray.slice(0, 5))
        } else {
          console.error("[RepairTicketList] Failed to load tickets from API")
          setTickets([])
        }
      } catch (error) {
        console.error("[RepairTicketList] Error fetching tickets:", error)
        setTickets([])
      }
    }
    loadTickets()
  }, [user?.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"
      case "in_progress":
        return "bg-gray-700 text-white border border-gray-600"
      case "completed":
        return "bg-gray-800 text-white border border-gray-700"
      case "delivered":
        return "bg-gray-900 text-white border border-gray-800"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200"
    }
  }

  return (
    <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-xl p-6">
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-blue-500/50 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          {t("dashboard.recentDevicesInformation")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-white">
        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 border border-gray-800/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-300 text-lg font-medium">{t("dashboard.noRepairDevicesYet")}</p>
            <p className="text-sm text-gray-400 mt-2">Create your first device entry to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-b-2 border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.customer")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.contact")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.model")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.imei")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.service")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">{t("table.price")}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => {
                      router.push(`/tickets/${ticket.id}`)
                    }}
                    className="bg-gradient-to-r from-gray-900/30 to-black/30 hover:from-gray-800/50 hover:to-gray-900/50 transition-all cursor-pointer border-b border-gray-800/30"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300 border-r border-gray-800/30 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white border-r border-gray-800/30 whitespace-nowrap">
                      {ticket.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 border-r border-gray-800/30 whitespace-nowrap">
                      {ticket.contact}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-white border-r border-gray-800/30 whitespace-nowrap">
                      {ticket.model}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 font-mono border-r border-gray-800/30 whitespace-nowrap">
                      {ticket.imeiNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 border-r border-gray-800/30 max-w-xs truncate">
                      {ticket.serviceName || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm border-r border-gray-800/30 whitespace-nowrap">
                      <Badge className={`${getStatusColor(ticket.status)} text-xs px-2 py-1`}>
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-white border-r border-gray-800/30 whitespace-nowrap">
                      €{ticket.price}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

