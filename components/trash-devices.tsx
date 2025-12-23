"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { getUserData, setUserData } from "@/lib/storage"

export function TrashDevices() {
  const [deletedTickets, setDeletedTickets] = useState<any[]>([])
  const [deletedMembers, setDeletedMembers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"devices" | "members">("devices")

  useEffect(() => {
    const userData = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData))
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    const loadDeletedItems = async () => {
      try {
        // Try to get from localStorage first (fallback for deleted items)
        if (typeof window !== "undefined") {
          const storedTicketsStr = localStorage.getItem("deletedTickets")
          const storedMembersStr = localStorage.getItem("deletedMembers")
          
          if (storedTicketsStr) {
            try {
              const storedTickets = JSON.parse(storedTicketsStr)
              const sortedTickets = storedTickets.sort((a: any, b: any) => 
                new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
              )
              setDeletedTickets(sortedTickets)
            } catch (error) {
              console.error("Error parsing deleted tickets:", error)
              setDeletedTickets([])
            }
          } else {
            setDeletedTickets([])
          }

          if (storedMembersStr) {
            try {
              const storedMembers = JSON.parse(storedMembersStr)
              const sortedMembers = storedMembers.sort((a: any, b: any) => 
                new Date(b.deletedAt || 0).getTime() - new Date(a.deletedAt || 0).getTime()
              )
              setDeletedMembers(sortedMembers)
            } catch (error) {
              console.error("Error parsing deleted members:", error)
              setDeletedMembers([])
            }
          } else {
            setDeletedMembers([])
          }
        }
      } catch (error) {
        console.error("Error loading deleted items:", error)
        setDeletedTickets([])
        setDeletedMembers([])
      }
    }

    loadDeletedItems()
    const interval = setInterval(loadDeletedItems, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleRestoreDevice = async (ticketId: string) => {
    const ticketToRestore = deletedTickets.find((t: any) => String(t.id) === String(ticketId))
    if (!ticketToRestore) return

    try {
      // Restore via API
      const { deletedAt, ...ticketWithoutDeletedDate } = ticketToRestore
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketWithoutDeletedDate),
      })

      if (!response.ok) {
        throw new Error("Failed to restore device")
      }

      // Update localStorage for deleted tickets
      if (typeof window !== "undefined") {
        const updatedDeleted = deletedTickets.filter((t: any) => String(t.id) !== String(ticketId))
        localStorage.setItem("deletedTickets", JSON.stringify(updatedDeleted))
        setDeletedTickets(updatedDeleted)
      }

      toast.success("Device restored successfully!")
    } catch (error) {
      console.error("Error restoring device:", error)
      toast.error("Failed to restore device. Please try again.")
    }
  }

  const handleRestoreMember = async (memberId: string) => {
    const memberToRestore = deletedMembers.find((m: any) => String(m.id) === String(memberId))
    if (!memberToRestore) return

    try {
      // Restore via API
      const { deletedAt, ...memberWithoutDeletedDate } = memberToRestore
      const response = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberWithoutDeletedDate),
      })

      if (!response.ok) {
        throw new Error("Failed to restore member")
      }

      // Update localStorage for deleted members
      if (typeof window !== "undefined") {
        const updatedDeleted = deletedMembers.filter((m: any) => String(m.id) !== String(memberId))
        localStorage.setItem("deletedMembers", JSON.stringify(updatedDeleted))
        setDeletedMembers(updatedDeleted)
      }

      toast.success("Member restored successfully!")
    } catch (error) {
      console.error("Error restoring member:", error)
      toast.error("Failed to restore member. Please try again.")
    }
  }

  const handlePermanentDelete = (ticketId: string, customerName: string) => {
    if (typeof window === "undefined") return
    
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the device entry for ${customerName}? This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const updatedDeleted = deletedTickets.filter((t: any) => String(t.id) !== String(ticketId))
      localStorage.setItem("deletedTickets", JSON.stringify(updatedDeleted))
      setDeletedTickets(updatedDeleted)
      toast.success("Device permanently deleted")
    } catch (error) {
      console.error("Error deleting device:", error)
      toast.error("Failed to delete device. Please try again.")
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-gray-900 text-white border border-gray-800"
      case "member":
        return "bg-gray-800 text-white border border-gray-700"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "devices" | "members")}>
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-200">
          <TabsTrigger value="devices" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
            Deleted Devices ({deletedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
            Deleted Members ({deletedMembers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4">
          {deletedTickets.length > 0 ? (
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-900 border-b border-gray-800 rounded-t-lg">
                <CardTitle className="text-2xl flex items-center gap-2 text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Deleted Devices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {deletedTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border-2 border-gray-300 rounded-xl p-6 space-y-4 bg-white hover:shadow-lg transition-all hover:border-gray-400 opacity-90"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {ticket.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-xl text-gray-900">{ticket.customerName}</h3>
                              <Badge className={`${getStatusColor(ticket.status)} font-medium px-2.5 py-0.5 mt-1`}>
                                {ticket.status.replace("_", " ").toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 text-sm mt-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-gray-600">Contact:</span>
                              <span className="font-medium text-gray-900">{ticket.contact}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                              <span className="text-gray-600">IMEI:</span>
                              <span className="font-medium text-gray-900">{ticket.imeiNo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="text-gray-600">Model:</span>
                              <span className="font-medium text-gray-900">{ticket.model}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-gray-600">Service:</span>
                              <span className="font-medium text-gray-900">{ticket.serviceName}</span>
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="text-gray-600 font-medium">Problem:</span>
                              <span className="ml-2">{ticket.problem}</span>
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Deleted on: {ticket.deletedAt ? new Date(ticket.deletedAt).toLocaleString() : "Unknown"}
                          </p>
                        </div>
                        <div className="text-right ml-6">
                          <div className="bg-gray-900 p-4 rounded-xl border-2 border-gray-800">
                            <p className="font-bold text-2xl text-white">€{ticket.price}</p>
                            <p className="text-xs text-gray-300 mt-1 flex items-center gap-1 justify-end">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreDevice(ticket.id)}
                          className="hover:bg-gray-100 border-gray-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePermanentDelete(ticket.id, ticket.customerName)}
                          className="hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Permanently
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="p-12">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 text-lg">No deleted devices</p>
                  <p className="text-sm text-gray-500 mt-2">Deleted devices will appear here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {deletedMembers.length > 0 ? (
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-900 border-b border-gray-800 rounded-t-lg">
                <CardTitle className="text-2xl flex items-center gap-2 text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Deleted Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {deletedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border-2 border-gray-300 rounded-xl p-6 space-y-4 bg-white hover:shadow-lg transition-all hover:border-gray-400 opacity-90"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg text-gray-900">{member.name}</h3>
                              <Badge className={`${getRoleBadgeColor(member.role)} font-medium px-2.5 py-0.5`}>
                                {member.role === "admin" ? "Admin" : "Team Member"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {member.email}
                            </p>
                            {member.username && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Username: <code className="font-mono text-xs font-semibold">{member.username}</code>
                                </p>
                                {member.password && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Password: <code className="font-mono text-xs font-semibold">{member.password}</code>
                                  </p>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Deleted on: {member.deletedAt ? new Date(member.deletedAt).toLocaleString() : "Unknown"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreMember(member.id)}
                          className="hover:bg-gray-100 border-gray-300"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="p-12">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-600 text-lg">No deleted team members</p>
                  <p className="text-sm text-gray-500 mt-2">Deleted team members will appear here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

