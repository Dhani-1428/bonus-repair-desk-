"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "@/components/language-provider"
import { toast } from "sonner"
import { getUserData, setUserData } from "@/lib/storage"

type SearchRepairTicketsProps = {
  initialStatusFilter?: string
}

export function SearchRepairTickets({ initialStatusFilter }: SearchRepairTicketsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const [tickets, setTickets] = useState<any[]>([])
  const [filteredTickets, setFilteredTickets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [editingTicket, setEditingTicket] = useState<any>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchInputFocused, setSearchInputFocused] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get user from sessionStorage
        const userData = sessionStorage.getItem("user")
        if (userData) {
          const user = JSON.parse(userData)
          setCurrentUser(user)
          
          // Load tickets from API instead of localStorage
          const response = await fetch(`/api/repairs?userId=${user.id}`)
          if (response.ok) {
            const data = await response.json()
            const ticketsArray = Array.isArray(data.tickets) ? data.tickets : []
            setTickets(ticketsArray)
          } else {
            console.error("[SearchRepairTickets] Failed to load tickets from API")
            setTickets([])
          }
        }
      } catch (error) {
        console.error("[SearchRepairTickets] Error loading tickets:", error)
        setTickets([])
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const statusFromUrl = searchParams.get("status")
    if (statusFromUrl) {
      setStatusFilter(statusFromUrl)
    } else if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter)
    }
  }, [searchParams, initialStatusFilter])

  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      handleSearch(searchTerm, searchType)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchType])

  useEffect(() => {
    // Ensure tickets is an array before filtering
    const ticketsArray = Array.isArray(tickets) ? tickets : []
    let filtered = [...ticketsArray]
    if (searchTerm.trim() && searchType !== "date") {
      const lowercaseTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((ticket: any) => {
        switch (searchType) {
          case "id":
            return ticket.repairNumber?.toLowerCase().includes(lowercaseTerm) || 
                   ticket.id?.toLowerCase().includes(lowercaseTerm)
          case "name":
            return ticket.customerName.toLowerCase().includes(lowercaseTerm)
          case "contact":
            return ticket.contact.toLowerCase().includes(lowercaseTerm)
          case "imei":
            return ticket.imeiNo.toLowerCase().includes(lowercaseTerm)
          case "model":
            return ticket.model.toLowerCase().includes(lowercaseTerm)
          default:
            // Search in all allowed fields: ID, IMEI, Contact, name, model
            return (
              ticket.repairNumber?.toLowerCase().includes(lowercaseTerm) ||
              ticket.id?.toLowerCase().includes(lowercaseTerm) ||
              ticket.customerName.toLowerCase().includes(lowercaseTerm) ||
              ticket.contact.toLowerCase().includes(lowercaseTerm) ||
              ticket.imeiNo.toLowerCase().includes(lowercaseTerm) ||
              ticket.model.toLowerCase().includes(lowercaseTerm)
            )
        }
      })
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket: any) => ticket.status === statusFilter)
    }
    if (dateFilter && searchType === "date") {
      filtered = filtered.filter((ticket: any) => {
        if (!ticket.createdAt) return false
        try {
          const ticketDate = new Date(ticket.createdAt)
          if (isNaN(ticketDate.getTime())) return false
          const ticketDateStr = ticketDate.toISOString().split('T')[0]
          return ticketDateStr === dateFilter
        } catch (error) {
          return false
        }
      })
    }
    setFilteredTickets(filtered)
  }, [tickets, searchTerm, searchType, statusFilter, dateFilter])

  const handleSearch = (term: string, type: string) => {
    setSearchTerm(term)
    setSearchType(type)
    
    if (term.trim().length > 0) {
      const lowercaseTerm = term.toLowerCase()
      const suggestionList: any[] = []
      const seen = new Set<string>()
      
      const ticketsArray = Array.isArray(tickets) ? tickets : []
      ticketsArray.forEach((ticket: any) => {
        let matchValue = ""
        let displayText = ""
        
        switch (type) {
          case "name":
            if (ticket.customerName.toLowerCase().includes(lowercaseTerm)) {
              matchValue = ticket.customerName
              displayText = `${ticket.customerName} - ${ticket.model}`
            }
            break
          case "contact":
            if (ticket.contact.toLowerCase().includes(lowercaseTerm)) {
              matchValue = ticket.contact
              displayText = `${ticket.contact} - ${ticket.customerName}`
            }
            break
          case "imei":
            if (ticket.imeiNo.toLowerCase().includes(lowercaseTerm)) {
              matchValue = ticket.imeiNo
              displayText = `${ticket.imeiNo} - ${ticket.model}`
            }
            break
          case "model":
            if (ticket.model.toLowerCase().includes(lowercaseTerm)) {
              matchValue = ticket.model
              displayText = `${ticket.model} - ${ticket.customerName}`
            }
            break
          case "service":
            if (ticket.serviceName?.toLowerCase().includes(lowercaseTerm)) {
              matchValue = ticket.serviceName
              displayText = `${ticket.serviceName} - ${ticket.customerName}`
            }
            break
          case "repairNumber":
            if (ticket.repairNumber?.toLowerCase().includes(lowercaseTerm)) {
              matchValue = ticket.repairNumber
              displayText = `${ticket.repairNumber} - ${ticket.customerName}`
            }
            break
          case "all":
            if (ticket.customerName.toLowerCase().includes(lowercaseTerm) && !seen.has(ticket.customerName)) {
              seen.add(ticket.customerName)
              suggestionList.push({ value: ticket.customerName, display: ticket.customerName, type: "name" })
            }
            if (ticket.model.toLowerCase().includes(lowercaseTerm) && !seen.has(ticket.model)) {
              seen.add(ticket.model)
              suggestionList.push({ value: ticket.model, display: `${ticket.model} - ${ticket.customerName}`, type: "model" })
            }
            if (ticket.imeiNo.toLowerCase().includes(lowercaseTerm) && !seen.has(ticket.imeiNo)) {
              seen.add(ticket.imeiNo)
              suggestionList.push({ value: ticket.imeiNo, display: `${ticket.imeiNo} - ${ticket.model}`, type: "imei" })
            }
            if (ticket.repairNumber?.toLowerCase().includes(lowercaseTerm) && !seen.has(ticket.repairNumber)) {
              seen.add(ticket.repairNumber)
              suggestionList.push({ value: ticket.repairNumber, display: `${ticket.repairNumber} - ${ticket.customerName}`, type: "repairNumber" })
            }
            break
        }
        
        if (matchValue && !seen.has(matchValue) && type !== "all") {
          seen.add(matchValue)
          suggestionList.push({ value: matchValue, display: displayText, type: type, ticket: ticket })
        }
      })
      
      setSuggestions(suggestionList.slice(0, 8))
      setShowSuggestions(suggestionList.length > 0 && searchInputFocused)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }
  
  const handleSuggestionClick = (suggestion: any) => {
    setSearchTerm(suggestion.value)
    setSearchType(suggestion.type)
    setShowSuggestions(false)
    setSearchInputFocused(false)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
  }

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const ticketsArray = Array.isArray(tickets) ? tickets : []
      const updatedTickets = ticketsArray.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket))
      
      // Update via API
      const ticket = ticketsArray.find((t: any) => t.id === ticketId)
      if (ticket) {
        const userId = currentUser?.id
        if (userId) {
          const response = await fetch(`/api/repairs/${ticketId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, status: newStatus }),
          })
          
          if (response.ok) {
            // Reload tickets
            const storedTickets = await getUserData<any[]>("repairTickets", [])
            const reloadedTickets = Array.isArray(storedTickets) ? storedTickets : []
            setTickets(reloadedTickets)
            
            // Update filtered tickets
            setFilteredTickets(reloadedTickets.filter((t: any) => {
              if (statusFilter !== "all" && t.status !== statusFilter) return false
              if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                return t.customerName.toLowerCase().includes(term) || t.model.toLowerCase().includes(term) || t.imeiNo.toLowerCase().includes(term)
              }
              return true
            }))
          }
        }
      }
    } catch (error) {
      console.error("[SearchRepairTickets] Error updating ticket status:", error)
      toast.error(t("error.ticketStatusUpdateFailed"))
    }
  }

  const handleEditClick = (ticket: any) => {
    setEditingTicket(ticket)
    setEditFormData({
      customerName: ticket.customerName,
      contact: ticket.contact,
      imeiNo: ticket.imeiNo,
      model: ticket.model,
      problem: ticket.problem,
      condition: ticket.condition,
      price: ticket.price,
      serviceName: ticket.serviceName,
      status: ticket.status,
    })
    setIsEditDialogOpen(true)
  }

  const handleModelClick = (ticket: any) => {
    router.push(`/tickets/${ticket.id}`)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTicket) return

    try {
      const userId = currentUser?.id
      if (!userId) {
        toast.error(t("error.userNotFound"))
        return
      }

      // Update via API
      const response = await fetch(`/api/repairs/${editingTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          ...editFormData,
          price: Number.parseFloat(editFormData.price),
        }),
      })

      if (response.ok) {
        // Reload tickets
        const storedTickets = await getUserData<any[]>("repairTickets", [])
        const reloadedTickets = Array.isArray(storedTickets) ? storedTickets : []
        setTickets(reloadedTickets)
        toast.success(t("success.deviceUpdated"))
        setIsEditDialogOpen(false)
        setEditingTicket(null)
      } else {
        const data = await response.json()
        throw new Error(data.error || t("error.deviceUpdateFailed"))
      }
    } catch (error: any) {
      console.error("[SearchRepairTickets] Error updating ticket:", error)
      toast.error(error.message || t("error.deviceUpdateFailed"))
    }
  }

  const handleDelete = async (ticketId: string) => {
    try {
      const userId = currentUser?.id
      if (!userId) {
        toast.error(t("error.userNotFound"))
        return
      }

      // Delete via API
      const response = await fetch(`/api/repairs/${ticketId}?userId=${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Reload tickets
        const storedTickets = await getUserData<any[]>("repairTickets", [])
        const reloadedTickets = Array.isArray(storedTickets) ? storedTickets : []
        setTickets(reloadedTickets)
        toast.success(t("success.deviceMovedToTrash"))
      } else {
        const data = await response.json()
        throw new Error(data.error || t("error.deviceDeleteFailed"))
      }
    } catch (error: any) {
      console.error("[SearchRepairTickets] Error deleting ticket:", error)
      toast.error(error.message || t("error.device.notFound"))
    }
  }

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
    <div className="space-y-6">
      <Card className="shadow-2xl border border-gray-300/50 bg-gradient-to-br from-gray-100/95 via-gray-50/95 to-gray-100/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-300/50 rounded-t-xl p-6">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-blue-500/50 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {t("search.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-gray-900">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search" className="font-medium text-gray-700">{t("search.searchLabel")}</Label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchType === "date" ? (
                  <Input
                    id="search"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || "")}
                    className="pl-10 bg-white/80 border-gray-300 text-gray-900 focus:border-blue-500"
                  />
                ) : (
                  <Input
                    id="search"
                    placeholder={t("search.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value, searchType)}
                    onFocus={() => {
                      setSearchInputFocused(true)
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    onBlur={() => setTimeout(() => { setSearchInputFocused(false); setShowSuggestions(false) }, 200)}
                    className="pl-10 bg-white/80 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500"
                  />
                )}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900">{suggestion.display}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="searchType" className="font-medium text-gray-700">{t("search.searchBy")}</Label>
              <Select value={searchType} onValueChange={(value) => {
                setSearchType(value)
                if (value === "date") {
                  setSearchTerm("")
                } else {
                  setDateFilter("")
                  if (searchTerm.trim()) handleSearch(searchTerm, value)
                }
              }}>
                <SelectTrigger id="searchType" className="bg-white/80 border-gray-300 text-gray-900">
                  <SelectValue placeholder={t("search.field.all")} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300" side="bottom" sideOffset={4}>
                  <SelectItem value="all" className="text-gray-900">{t("search.field.all")}</SelectItem>
                  <SelectItem value="id" className="text-gray-900">ID</SelectItem>
                  <SelectItem value="name" className="text-gray-900">{t("search.field.name")}</SelectItem>
                  <SelectItem value="contact" className="text-gray-900">{t("search.field.contact")}</SelectItem>
                  <SelectItem value="imei" className="text-gray-900">{t("search.field.imei")}</SelectItem>
                  <SelectItem value="model" className="text-gray-900">{t("search.field.model")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusFilter" className="font-medium text-gray-700">{t("search.filterByStatus")}</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger id="statusFilter" className="bg-white/80 border-gray-300 text-gray-900">
                  <SelectValue placeholder={t("status.all")} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300" side="bottom" sideOffset={4}>
                  <SelectItem value="all" className="text-gray-900">{t("status.all")}</SelectItem>
                  <SelectItem value="pending" className="text-gray-900">{t("status.pending")}</SelectItem>
                  <SelectItem value="in_progress" className="text-gray-900">{t("status.in_progress")}</SelectItem>
                  <SelectItem value="completed" className="text-gray-900">{t("status.completed")}</SelectItem>
                  <SelectItem value="delivered" className="text-gray-900">{t("status.delivered")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-2xl border border-gray-300/50 bg-gradient-to-br from-gray-100/95 via-gray-50/95 to-gray-100/95 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-300/50 rounded-t-xl p-6">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center ring-2 ring-blue-500/50 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            {t("common.allDevices")} ({filteredTickets.length} {filteredTickets.length === 1 ? t("search.results.device") : t("search.results.devices")})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-gray-900">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 border border-gray-800/50">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-300 text-lg font-medium">
                {tickets.length === 0 ? t("search.noDevicesYet") : t("search.noDevicesMatch")}
              </p>
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
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => handleModelClick(ticket)}
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
                          {ticket.status === "pending" || ticket.status === "PENDING" ? t("status.pending") :
                           ticket.status === "in_progress" || ticket.status === "IN_PROGRESS" ? t("status.in_progress") :
                           ticket.status === "completed" || ticket.status === "COMPLETED" ? t("status.completed") :
                           ticket.status === "delivered" || ticket.status === "DELIVERED" ? t("status.delivered") :
                           ticket.status.replace("_", " ")}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{t("ticket.edit")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-customerName" className="text-gray-200">{t("form.customerName")} *</Label>
                <Input id="edit-customerName" value={editFormData.customerName || ""} onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact" className="text-gray-200">{t("table.contact")} *</Label>
                <Input id="edit-contact" value={editFormData.contact || ""} onChange={(e) => setEditFormData({ ...editFormData, contact: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-imeiNo" className="text-gray-200">{t("form.imei")} *</Label>
                <Input id="edit-imeiNo" value={editFormData.imeiNo || ""} onChange={(e) => setEditFormData({ ...editFormData, imeiNo: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model" className="text-gray-200">{t("form.model")} *</Label>
                <Input id="edit-model" value={editFormData.model || ""} onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-gray-200">{t("form.price")} *</Label>
                <Input id="edit-price" type="number" step="0.01" value={editFormData.price || ""} onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-serviceName" className="text-gray-200">{t("form.serviceNames")} *</Label>
                <Input id="edit-serviceName" value={editFormData.serviceName || ""} onChange={(e) => setEditFormData({ ...editFormData, serviceName: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="text-gray-200">{t("table.status")} *</Label>
                <Select value={editFormData.status || "pending"} onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}>
                  <SelectTrigger id="edit-status" className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700" side="bottom" sideOffset={4}>
                    <SelectItem value="pending" className="text-white">{t("status.pending")}</SelectItem>
                    <SelectItem value="in_progress" className="text-white">{t("status.in_progress")}</SelectItem>
                    <SelectItem value="completed" className="text-white">{t("status.completed")}</SelectItem>
                    <SelectItem value="delivered" className="text-white">{t("status.delivered")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-condition" className="text-gray-200">{t("form.condition")}</Label>
              <Textarea id="edit-condition" value={editFormData.condition || ""} onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })} className="bg-gray-800/50 border-gray-700 text-white min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-problem" className="text-gray-200">{t("form.technicianNotes")} *</Label>
              <Textarea id="edit-problem" value={editFormData.problem || ""} onChange={(e) => setEditFormData({ ...editFormData, problem: e.target.value })} required className="bg-gray-800/50 border-gray-700 text-white min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTicket(null) }} className="border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800">{t("form.cancel")}</Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/20 transform hover:scale-105 transition-all duration-300">{t("common.saveChanges")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

