"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useTranslation } from "@/components/language-provider"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { getUserData, setUserData, getCurrentUser } from "@/lib/storage"

interface DeviceFormData {
  model: string
  brand: string
  imeiNo: string
  serialNo: string
  warrantyUntil30Days: boolean
  simCard: boolean
  memoryCard: boolean
  charger: boolean
  battery: boolean
  waterDamaged: boolean
  loanEquipment: boolean
  equipmentObs: string
  repairObs: string
  selectedServices: string[]
  condition: string
  customCondition: string
  problem: string
  price: string
  imeiError: string | null
  repairNumber?: string // Auto-generated, read-only
}

// Brand and Model data
const BRANDS_AND_MODELS: Record<string, string[]> = {
  "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini", "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini", "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11", "iPhone XS Max", "iPhone XS", "iPhone XR", "iPhone X", "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7", "iPhone SE (2022)", "iPhone SE (2020)"],
  "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22", "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21", "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy A54", "Galaxy A34", "Galaxy A24", "Galaxy A14", "Galaxy A04", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy Z Fold 4", "Galaxy Z Flip 4"],
  "Xiaomi": ["Mi 13 Pro", "Mi 13", "Mi 12 Pro", "Mi 12", "Redmi Note 13 Pro", "Redmi Note 13", "Redmi Note 12 Pro", "Redmi Note 12", "Redmi Note 11", "Redmi 13C", "Redmi 12C", "POCO X6 Pro", "POCO X5 Pro", "POCO F5", "POCO M5"],
  "Huawei": ["P60 Pro", "P60", "P50 Pro", "P50", "Mate 60 Pro", "Mate 60", "Mate 50 Pro", "Mate 50", "Nova 12", "Nova 11", "Nova 10"],
  "Oppo": ["Find X6 Pro", "Find X5 Pro", "Find X5", "Reno 11 Pro", "Reno 11", "Reno 10 Pro", "Reno 10", "A98", "A78", "A58"],
  "Vivo": ["X100 Pro", "X90 Pro", "X90", "V30 Pro", "V30", "V29", "Y36", "Y27", "Y17"],
  "OnePlus": ["12", "11", "10 Pro", "10T", "Nord 3", "Nord 2T", "Nord CE 3"],
  "Realme": ["GT 5 Pro", "GT 5", "GT 3", "11 Pro+", "11 Pro", "11", "10 Pro+", "10 Pro"],
  "Motorola": ["Edge 40 Pro", "Edge 40", "Edge 30 Pro", "Moto G84", "Moto G73", "Moto G54"],
  "Nokia": ["G60 5G", "G42 5G", "G22", "X30 5G", "X20"],
  "Sony": ["Xperia 1 V", "Xperia 5 V", "Xperia 10 V", "Xperia Pro-I"],
  "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7 Pro", "Pixel 7", "Pixel 6a", "Pixel 6"],
  "Honor": ["Magic 6 Pro", "Magic 5 Pro", "90 Pro", "90", "70"],
  "Nothing": ["Phone (2)", "Phone (1)"],
  "Other": []
}

const ALL_BRANDS = Object.keys(BRANDS_AND_MODELS)

// Mobile Conditions on Arrival
const MOBILE_CONDITIONS = [
  "Excellent - Like new",
  "Good - Minor scratches",
  "Fair - Visible wear",
  "Poor - Significant damage",
  "Screen cracked",
  "Back panel damaged",
  "Water damage visible",
  "Button not working",
  "Charging port damaged",
  "Other",
]

// Generate Client ID
const generateClientId = (): string => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `CLI-${timestamp}-${random}`
}

export function NewRepairTicketForm() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [customerName, setCustomerName] = useState("")
  const [clientId, setClientId] = useState(generateClientId())
  const [contact, setContact] = useState("")
  const [devices, setDevices] = useState<DeviceFormData[]>([
    {
      model: "",
      brand: "",
      imeiNo: "",
      serialNo: "",
      warrantyUntil30Days: false,
      simCard: false,
      memoryCard: false,
      charger: false,
      battery: false,
      waterDamaged: false,
      loanEquipment: false,
      equipmentObs: "",
      repairObs: "",
      selectedServices: [],
      condition: "",
      customCondition: "",
      problem: "",
      price: "",
      imeiError: null,
    },
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConditionDialog, setShowConditionDialog] = useState<number | null>(null)
  const [showCustomConditionDialog, setShowCustomConditionDialog] = useState<number | null>(null)

  // Generate preview Repair Number
  const getRepairNumberPreview = (): string => {
    const year = new Date().getFullYear()
    return `REP-${year}-XXXX` // XXXX will be replaced with actual sequence on server
  }

  const toggleService = (deviceIndex: number, service: string) => {
    setDevices((prev) =>
      prev.map((device, idx) =>
        idx === deviceIndex
          ? {
              ...device,
              selectedServices: device.selectedServices.includes(service)
                ? device.selectedServices.filter((s) => s !== service)
                : [...device.selectedServices, service],
            }
          : device
      )
    )
  }

  const addDevice = () => {
    setDevices((prev) => [
      ...prev,
      {
        model: "",
        brand: "",
        imeiNo: "",
        serialNo: "",
        warrantyUntil30Days: false,
        battery: false,
        charger: false,
        simCard: false,
        memoryCard: false,
        loanEquipment: false,
        equipmentObs: "",
        repairObs: "",
        selectedServices: [],
        condition: "",
        problem: "",
        price: "",
        imeiError: null,
      },
    ])
  }

  const removeDevice = (index: number) => {
    if (devices.length > 1) {
      setDevices((prev) => prev.filter((_, idx) => idx !== index))
    }
  }

  const updateDevice = (index: number, field: keyof DeviceFormData, value: any) => {
    setDevices((prev) =>
      prev.map((device, idx) => {
        if (idx === index) {
          if (field === "imeiNo") {
            const imeiRegex = /^\d{0,15}$/
            if (!imeiRegex.test(value)) {
              return device
            }
            const imeiError =
              value.length > 0 && value.length !== 15 ? t("error.imei.inline") : null
            return { ...device, imeiNo: value, imeiError }
          }
          return { ...device, [field]: value }
        }
        return device
      })
    )
  }


  // Generate Repair Number (client-side) - Format: YYYY-XXXX
  const generateRepairNumberClient = (existingTickets: any[]): string => {
    const year = new Date().getFullYear()
    const prefix = `${year}-`
    // Support both old format (REP-YYYY-XXXX) and new format (YYYY-XXXX)
    const matchingTickets = existingTickets.filter(t => 
      t.repairNumber?.startsWith(prefix) || t.repairNumber?.startsWith(`REP-${prefix}`)
    )
    const sequence = String(matchingTickets.length + 1).padStart(4, "0")
    return `${prefix}${sequence}`
  }

  // Generate Serial Number (client-side)
  const generateSerialNumberClient = (existingTickets: any[]): string => {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, "0")
    const prefix = `SN${year}${month}`
    const matchingTickets = existingTickets.filter(t => t.serialNo?.startsWith(prefix))
    const sequence = String(matchingTickets.length + 1).padStart(4, "0")
    return `${prefix}${sequence}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast.error("User not authenticated")
      return
    }

    if (!customerName.trim() || !contact.trim()) {
      toast.error("Customer name and contact are required")
      return
    }

    // Validate all devices
    for (let i = 0; i < devices.length; i++) {
      const device = devices[i]
      const imeiRegex = /^\d{15}$/
      if (!imeiRegex.test(device.imeiNo)) {
        toast.error(`Device ${i + 1}: IMEI must be exactly 15 digits`)
        return
      }
      if (device.selectedServices.length === 0) {
        toast.error(`Device ${i + 1}: At least one service is required`)
        return
      }
      if (!device.model.trim() || !device.problem.trim() || !device.price.trim()) {
        toast.error(`Device ${i + 1}: Model, technician notes, and price are required`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Create tickets for all devices via API
      const createdTickets = []
      for (const device of devices) {
        const response = await fetch("/api/repairs/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            clientId: clientId.trim(),
            customerName,
            contact,
            imeiNo: device.imeiNo,
            brand: device.brand || device.model.split(" ")[0] || "N/A",
            model: device.model,
            serialNo: device.serialNo || null,
            warranty: device.warrantyUntil30Days ? "Warranty Until 30 days" : "Without Warranty",
            simCard: device.simCard,
            memoryCard: device.memoryCard,
            charger: device.charger,
            battery: device.battery,
            waterDamaged: device.waterDamaged,
            loanEquipment: device.loanEquipment,
            equipmentObs: device.equipmentObs || null,
            repairObs: device.repairObs || null,
            selectedServices: device.selectedServices,
            condition: device.condition === "Other" && device.customCondition 
              ? `Other: ${device.customCondition}` 
              : device.condition || null,
            problem: device.problem,
            price: parseFloat(device.price),
            status: "PENDING",
          }),
        })

        let data
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("[NewRepairTicketForm] Failed to parse JSON response:", jsonError)
          const text = await response.text()
          console.error("[NewRepairTicketForm] Response text:", text)
          throw new Error("Invalid response from server. Please try again.")
        }

        if (!response.ok) {
          console.error("[NewRepairTicketForm] API Error:", {
            status: response.status,
            statusText: response.statusText,
            data: data,
            error: data?.error || data?.message || "Unknown error"
          })
          throw new Error(data?.error || data?.message || `Failed to create ticket for device ${devices.indexOf(device) + 1}`)
        }

        // Normalize ticket data - parse JSON fields if needed
        const ticket = data.ticket
        if (ticket) {
          // Parse selectedServices if it's a string
          if (typeof ticket.selectedServices === 'string') {
            try {
              ticket.selectedServices = JSON.parse(ticket.selectedServices)
            } catch (e) {
              console.error("[NewRepairTicketForm] Error parsing selectedServices:", e)
              ticket.selectedServices = []
            }
          }
          
          // Ensure all required fields exist
          const normalizedTicket = {
            ...ticket,
            clientId: ticket.clientId || null,
            customerName: ticket.customerName || customerName,
            contact: ticket.contact || contact,
            imeiNo: ticket.imeiNo || device.imeiNo,
            brand: ticket.brand || device.brand || "N/A",
            model: ticket.model || device.model,
            serialNo: ticket.serialNo || null,
            warranty: ticket.warranty || "Without Warranty",
            simCard: ticket.simCard ?? false,
            memoryCard: ticket.memoryCard ?? false,
            charger: ticket.charger ?? false,
            battery: ticket.battery ?? false,
            waterDamaged: ticket.waterDamaged ?? false,
            loanEquipment: ticket.loanEquipment ?? false,
            equipmentObs: ticket.equipmentObs || null,
            repairObs: ticket.repairObs || null,
            selectedServices: Array.isArray(ticket.selectedServices) ? ticket.selectedServices : (device.selectedServices || []),
            condition: ticket.condition || null,
            problem: ticket.problem || device.problem,
            price: ticket.price || parseFloat(device.price),
            repairNumber: ticket.repairNumber || "N/A",
            createdAt: ticket.createdAt || new Date().toISOString(),
          }
          
          createdTickets.push(normalizedTicket)
        } else {
          throw new Error("No ticket data returned from server")
        }
      }

      toast.success(`${createdTickets.length} device${createdTickets.length > 1 ? "s" : ""} entry created successfully!`)

      // Print receipt for all devices
      if (createdTickets.length > 0) {
        try {
          printReceipt(createdTickets)
        } catch (printError) {
          console.error("[NewRepairTicketForm] Error printing receipt:", printError)
          toast.error("Device entry created, but failed to print receipt. You can print it later from the device list.")
        }
      } else {
        console.error("[NewRepairTicketForm] No tickets created to print")
        toast.error("Device entry created, but no receipt data available.")
      }

      // Reset form
      setCustomerName("")
      setClientId(generateClientId())
      setContact("")
      setDevices([{
        model: "",
        brand: "",
        imeiNo: "",
        serialNo: "",
        warrantyUntil30Days: false,
        battery: false,
        charger: false,
        simCard: false,
        memoryCard: false,
        loanEquipment: false,
        equipmentObs: "",
        repairObs: "",
        selectedServices: [],
        condition: "",
        problem: "",
        price: "",
        imeiError: null,
      }])

      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error.message || "Failed to create repair ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  const printReceipt = (tickets: any[]) => {
    // Use the exported function
    printReceiptForTickets(tickets)
  }

  // Export printReceipt function for use in other components
  // This will be available via the component's ref or we can create a separate export
  return (
    <Card className="shadow-2xl border border-gray-800/50 bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-800/50 rounded-t-lg px-6 py-4">
        <CardTitle className="text-2xl flex items-center gap-2 text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t("page.newTicket.customerDeviceInformation")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information - Larger, more clickable */}
          <div className="grid gap-6 md:grid-cols-3 border-b border-gray-800 pb-6">
            <div className="space-y-3">
              <Label htmlFor="clientId" className="text-gray-200 text-base font-semibold">Client ID (Auto-generated)</Label>
              <Input
                id="clientId"
                value={clientId}
                disabled
                className="bg-blue-900/20 border-blue-700/50 text-blue-300 font-mono font-semibold cursor-not-allowed h-12 text-lg"
              />
              <p className="text-xs text-gray-500">
                Client ID is automatically generated
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-gray-200">{t("form.customerName")} *</Label>
              <Input
                id="customerName"
                placeholder={t("placeholder.customerName")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact" className="text-gray-200">Client Phone *</Label>
              <Input
                id="contact"
                type="tel"
                placeholder="Enter Client Phone Number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Devices */}
          <div className="space-y-6">
            {devices.map((device, deviceIndex) => (
              <div
                key={deviceIndex}
                className="border-2 border-gray-800/50 rounded-xl p-6 bg-gradient-to-br from-gray-900/50 to-black/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Device {deviceIndex + 1}</h3>
                  {devices.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDevice(deviceIndex)}
                      className="border-red-600/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:border-red-500"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-gray-200">Brand *</Label>
                    <div className="relative">
                      <Input
                        placeholder="Type or select brand"
                        value={device.brand}
                        onChange={(e) => {
                          updateDevice(deviceIndex, "brand", e.target.value)
                          // Clear model when brand changes
                          if (e.target.value !== device.brand) {
                            updateDevice(deviceIndex, "model", "")
                          }
                        }}
                        required
                        className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 pr-10"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-700/50"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="bg-gray-900 border-gray-700 w-[200px] p-1 max-h-[300px] overflow-y-auto">
                          <div className="space-y-1">
                            {ALL_BRANDS.map((brand) => (
                              <button
                                key={brand}
                                type="button"
                                onClick={() => {
                                  updateDevice(deviceIndex, "brand", brand)
                                  updateDevice(deviceIndex, "model", "")
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded-md transition-colors"
                              >
                                {brand}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-200">{t("form.model")} *</Label>
                    <div className="relative">
                      <Input
                        placeholder={device.brand ? "Type or select model" : "Select brand first"}
                        value={device.model}
                        onChange={(e) => updateDevice(deviceIndex, "model", e.target.value)}
                        required
                        disabled={!device.brand}
                        className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 pr-10 disabled:opacity-50"
                      />
                      {device.brand && device.brand !== "Other" && BRANDS_AND_MODELS[device.brand] && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-700/50"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="bg-gray-900 border-gray-700 w-[250px] p-1 max-h-[300px] overflow-y-auto">
                            <div className="space-y-1">
                              {BRANDS_AND_MODELS[device.brand].map((model) => (
                                <button
                                  key={model}
                                  type="button"
                                  onClick={() => updateDevice(deviceIndex, "model", model)}
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded-md transition-colors"
                                >
                                  {model}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-200 text-base font-semibold">{t("form.imei")} *</Label>
                    <Input
                      placeholder={t("placeholder.imei")}
                      value={device.imeiNo}
                      onChange={(e) => updateDevice(deviceIndex, "imeiNo", e.target.value)}
                      required
                      maxLength={15}
                      inputMode="numeric"
                      className={`bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 h-12 text-lg ${device.imeiError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {device.imeiError && <p className="text-xs text-red-400">{device.imeiError}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-200 text-base font-semibold">Laptop Serial Number *</Label>
                    <Input
                      placeholder="Enter laptop serial number"
                      value={device.serialNo || ""}
                      onChange={(e) => updateDevice(deviceIndex, "serialNo", e.target.value)}
                      required
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 h-12 text-lg"
                    />
                    <p className="text-xs text-gray-500">Enter the laptop serial number</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-200">Warranty</Label>
                    <label className="flex items-center gap-2 text-sm text-gray-200 hover:text-white cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        checked={device.warrantyUntil30Days}
                        onChange={(e) => updateDevice(deviceIndex, "warrantyUntil30Days", e.target.checked)}
                      />
                      <span>Warranty Until 30 days</span>
                    </label>
                  </div>

                  {/* Equipment Check - Large clickable buttons for easy use */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-200 text-lg font-semibold mb-3 block">Equipment Check</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 1. SIM Card */}
                      <label className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="h-6 w-6 accent-blue-600 cursor-pointer"
                          checked={device.simCard}
                          onChange={(e) => updateDevice(deviceIndex, "simCard", e.target.checked)}
                        />
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-base font-medium text-white">SIM Card</span>
                        </div>
                      </label>
                      
                      {/* 2. Memory Card */}
                      <label className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="h-6 w-6 accent-blue-600 cursor-pointer"
                          checked={device.memoryCard}
                          onChange={(e) => updateDevice(deviceIndex, "memoryCard", e.target.checked)}
                        />
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          <span className="text-base font-medium text-white">Memory Card</span>
                        </div>
                      </label>
                      
                      {/* 3. Charger */}
                      <label className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="h-6 w-6 accent-blue-600 cursor-pointer"
                          checked={device.charger}
                          onChange={(e) => updateDevice(deviceIndex, "charger", e.target.checked)}
                        />
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-base font-medium text-white">Charger</span>
                        </div>
                      </label>
                      
                      {/* 4. Battery */}
                      <label className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="h-6 w-6 accent-blue-600 cursor-pointer"
                          checked={device.battery}
                          onChange={(e) => updateDevice(deviceIndex, "battery", e.target.checked)}
                        />
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          <span className="text-base font-medium text-white">Battery</span>
                        </div>
                      </label>
                      
                      {/* 5. Water Damaged */}
                      <label className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-red-500 hover:bg-gray-800 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="h-6 w-6 accent-red-600 cursor-pointer"
                          checked={device.waterDamaged}
                          onChange={(e) => updateDevice(deviceIndex, "waterDamaged", e.target.checked)}
                        />
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                          </svg>
                          <span className="text-base font-medium text-white">Water Damaged</span>
                        </div>
                      </label>
                      
                      {/* Loan Equipment */}
                      <label className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg border-2 border-gray-700 hover:border-blue-500 hover:bg-gray-800 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          className="h-6 w-6 accent-blue-600 cursor-pointer"
                          checked={device.loanEquipment}
                          onChange={(e) => updateDevice(deviceIndex, "loanEquipment", e.target.checked)}
                        />
                        <div className="flex items-center gap-2">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <span className="text-base font-medium text-white">Loan Equipment</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-200">Equipment Observations</Label>
                    <Textarea
                      placeholder="Equipment Observations"
                      value={device.equipmentObs}
                      onChange={(e) => updateDevice(deviceIndex, "equipmentObs", e.target.value)}
                      rows={2}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-200">Repair Number (Auto-generated)</Label>
                    <Input
                      value={getRepairNumberPreview()}
                      disabled
                      className="bg-purple-900/20 border-purple-700/50 text-purple-300 font-mono font-semibold cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500">Unique repair number will be generated on server</p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-200">Repair Observations</Label>
                    <Textarea
                      placeholder="Repair Observations"
                      value={device.repairObs}
                      onChange={(e) => updateDevice(deviceIndex, "repairObs", e.target.value)}
                      rows={2}
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-200">{t("form.serviceNames")} *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-800/50 rounded-md border border-gray-700 p-3">
                      {[
                        "LCD Repair",
                        "Phone dead",
                        "Restarting problem",
                        "Software problem",
                        "Camera",
                        "Back Panel",
                        "Mobile Body Replacement",
                        "Network Issue",
                        "Battery Replacement",
                        "Charging Port & Power issue",
                        "Software & Os troubleshooting",
                        "Speaker repair",
                        "Water Damage Treatment",
                      ].map((service) => (
                        <label key={service} className="flex items-center gap-2 text-sm text-gray-200 hover:text-white cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-blue-600"
                            checked={device.selectedServices.includes(service)}
                            onChange={() => toggleService(deviceIndex, service)}
                          />
                          <span>{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-200">{t("form.price")} *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={t("placeholder.price")}
                      value={device.price}
                      onChange={(e) => updateDevice(deviceIndex, "price", e.target.value)}
                      required
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-200">Mobile Conditions on Arrival</Label>
                    <Dialog open={showConditionDialog === deviceIndex} onOpenChange={(open) => setShowConditionDialog(open ? deviceIndex : null)}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full bg-gray-800/50 border-gray-700 text-white hover:bg-gray-800"
                        >
                          {device.condition === "Other" && device.customCondition 
                            ? `Other: ${device.customCondition.substring(0, 30)}${device.customCondition.length > 30 ? "..." : ""}`
                            : device.condition || "Select condition"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                        <DialogHeader>
                          <DialogTitle>Select Mobile Condition on Arrival</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Choose the condition of the device when it arrived
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {MOBILE_CONDITIONS.map((condition) => (
                            <button
                              key={condition}
                              type="button"
                              onClick={() => {
                                if (condition === "Other") {
                                  setShowConditionDialog(null)
                                  setShowCustomConditionDialog(deviceIndex)
                                } else {
                                  updateDevice(deviceIndex, "condition", condition)
                                  updateDevice(deviceIndex, "customCondition", "")
                                  setShowConditionDialog(null)
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 rounded-md transition-colors"
                            >
                              {condition}
                            </button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Custom Condition Dialog */}
                    <Dialog open={showCustomConditionDialog === deviceIndex} onOpenChange={(open) => setShowCustomConditionDialog(open ? deviceIndex : null)}>
                      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
                        <DialogHeader>
                          <DialogTitle>Specify Custom Condition</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Please describe the condition of the device when it arrived
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Textarea
                            placeholder="Enter custom condition description"
                            value={device.customCondition}
                            onChange={(e) => updateDevice(deviceIndex, "customCondition", e.target.value)}
                            rows={4}
                            className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowCustomConditionDialog(null)
                                if (!device.customCondition.trim()) {
                                  updateDevice(deviceIndex, "condition", "")
                                }
                              }}
                              className="border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                if (device.customCondition.trim()) {
                                  updateDevice(deviceIndex, "condition", "Other")
                                  setShowCustomConditionDialog(null)
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={!device.customCondition.trim()}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-200">Technician Notes *</Label>
                    <Textarea
                      placeholder="Enter technician notes about the problem/issue"
                      value={device.problem}
                      onChange={(e) => updateDevice(deviceIndex, "problem", e.target.value)}
                      rows={4}
                      required
                      className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={addDevice}
              className="border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Device
            </Button>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} className="px-8 border-gray-700 bg-gray-900/50 text-white hover:bg-gray-800">
                {t("form.cancel")}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg px-8 text-white hover:shadow-xl hover:shadow-blue-500/20 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create {devices.length} Device{devices.length > 1 ? "s" : ""} Entry
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// Exported function to print receipts from anywhere
export function printReceiptForTickets(tickets: any[]) {
  const user = getCurrentUser()
  const shopName = user?.shopName || user?.name || "TUDO4MOBILE IMP EXP LDA"
  const contactNumber = user?.contactNumber || "N/A"
  
  // Get company info from localStorage or use defaults
  let companyInfo = {}
  try {
    const stored = localStorage.getItem("companyInfo")
    if (stored) {
      companyInfo = JSON.parse(stored)
    }
  } catch (e) {
    console.error("Error parsing company info:", e)
  }
  
  const companyAddress = companyInfo.address || "Avenida Almirente Reis n 23a, Lisboa, 1150-008"
  // Use only the admin's contact number from signup, not super admin's number
  // Priority: user's contactNumber > companyInfo.phone1 > companyInfo.phone > default
  const companyPhone1 = contactNumber && contactNumber !== "N/A" ? contactNumber : (companyInfo.phone1 || companyInfo.phone || "218870168")
  // Only show phone2 if explicitly set in companyInfo, don't use default super admin number
  const companyPhone2 = companyInfo.phone2 || null
  const companyEmail = companyInfo.email || companyInfo.companyEmail || "geral.tudo4mobile@gmail.com"
  const companyWebsite = companyInfo.website || "www.Tudo4Mobile.Pt"
  const companyVAT = companyInfo.vatNumber || "515570664"

  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    console.error("Could not open print window")
    return
  }

  // Function to generate a single receipt HTML
  const generateReceiptHTML = (ticket: any, copyType: 'CLIENT' | 'ADMIN' = 'CLIENT') => {
    // Parse selectedServices if it's a string (from database JSON)
    let servicesArray = ticket.selectedServices
    if (typeof servicesArray === 'string') {
      try {
        servicesArray = JSON.parse(servicesArray)
      } catch (e) {
        console.error("[printReceiptForTickets] Error parsing selectedServices:", e)
        servicesArray = []
      }
    }
    
    const services = Array.isArray(servicesArray) 
      ? servicesArray.join(", ") 
      : (servicesArray || ticket.serviceName || "N/A")
    
    const copyLabel = copyType === 'CLIENT' ? 'CLIENT COPY' : 'ADMIN COPY'
    const entryDate = new Date(ticket?.createdAt || Date.now())
    const formattedDate = entryDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const formattedTime = entryDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    
    return `
      <div style="font-family: Arial, sans-serif; width: 100%; font-size: 7pt; line-height: 1.2; page-break-inside: avoid;">
        <div style="text-align: center; font-weight: bold; font-size: 8pt; margin-bottom: 4px; padding: 3px; background-color: #e0e0e0; border: 1px solid #999;">
          ${copyLabel}
        </div>
        <div style="display: table; width: 100%; margin-bottom: 6px; border-bottom: 1.5px solid #000; padding-bottom: 5px;">
          <div style="display: table-row;">
            <div style="display: table-cell; width: 50%; vertical-align: top; padding-right: 8px;">
              <div style="font-weight: bold; font-size: 9pt; margin-bottom: 2px; color: #000;">${shopName}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000; line-height: 1.2;">${companyAddress}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000;">${companyPhone1}${companyPhone2 ? `, ${companyPhone2}` : ""}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000;">${companyEmail}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000;">${companyWebsite}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000;">VAT: ${companyVAT}</div>
            </div>
            <div style="display: table-cell; width: 50%; vertical-align: top; padding-left: 8px;">
              <div style="font-weight: bold; font-size: 8pt; margin-bottom: 2px; color: #000;">Client's NIF: ${ticket.clientId || "N/A"}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000;"><strong>Name:</strong> ${ticket.customerName || "N/A"}</div>
              <div style="margin: 1px 0; font-size: 7pt; color: #000;"><strong>Client Phone:</strong> ${ticket.contact || "N/A"}</div>
            </div>
          </div>
        </div>
        
        <div style="margin: 4px 0;">
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Entry Date:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${formattedDate} ${formattedTime}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Repair nº:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.repairNumber || "N/A"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">IMEI:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.imeiNo || "000000000000000"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Brand-Model:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.brand || "N/A"} - ${ticket.model || "N/A"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Laptop Serial Nº:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.serialNo || "-"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Warranty:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.warranty || "Without Warranty"}</div>
          </div>
        </div>
        
        <div style="margin: 4px 0;">
          <div style="font-weight: bold; margin-bottom: 2px; font-size: 7pt;">Equipment Check:</div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 30%; font-weight: bold; font-size: 7pt;">SIM Card:</div>
            <div style="display: table-cell; width: 70%; font-size: 7pt;">${ticket.simCard ? "Yes" : "No"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 30%; font-weight: bold; font-size: 7pt;">Memory Card:</div>
            <div style="display: table-cell; width: 70%; font-size: 7pt;">${ticket.memoryCard ? "Yes" : "No"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 30%; font-weight: bold; font-size: 7pt;">Charger:</div>
            <div style="display: table-cell; width: 70%; font-size: 7pt;">${ticket.charger ? "Yes" : "No"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 30%; font-weight: bold; font-size: 7pt;">Battery:</div>
            <div style="display: table-cell; width: 70%; font-size: 7pt;">${ticket.battery ? "Yes" : "No"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 30%; font-weight: bold; font-size: 7pt;">Water Damaged:</div>
            <div style="display: table-cell; width: 70%; font-size: 7pt;">${ticket.waterDamaged ? "Yes" : "No"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 30%; font-weight: bold; font-size: 7pt;">Loan Equipment:</div>
            <div style="display: table-cell; width: 70%; font-size: 7pt;">${ticket.loanEquipment ? "Yes" : "No"}</div>
          </div>
        </div>
        
        <div style="margin: 4px 0;">
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Equipment Obs.:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.equipmentObs || "-"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Repair Obs.:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.repairObs || "-"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Services:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${services}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Problem:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">${ticket.problem || "-"}</div>
          </div>
          <div style="display: table; width: 100%; margin: 1px 0;">
            <div style="display: table-cell; width: 40%; font-weight: bold; font-size: 7pt;">Price:</div>
            <div style="display: table-cell; width: 60%; font-size: 7pt;">€${Number.parseFloat(ticket.price || 0).toFixed(2)}</div>
          </div>
        </div>
        
        <div style="margin: 6px 0; padding: 5px; background-color: #f0f0f0; text-align: center; font-weight: bold; font-size: 7.5pt; border: 1px solid #ddd;">
          WE ARE RESPONSIBLE FOR THE ASSISTANCE / REPAIRING OF THE DESCRIBED ANOMALIES.
        </div>
        
        <div style="margin-top: 6px; padding: 5px; background-color: #f9f9f9; font-size: 6.5pt; line-height: 1.3; border: 1px solid #ddd;">
          <div style="font-weight: bold; margin-bottom: 5px; font-size: 7.5pt;">Condições de Armazenamento e Levantamento</div>
          <div style="text-align: justify; margin-bottom: 4px;">
            O equipamento deverá ser levantado no prazo máximo de sessenta (60) dias após a conclusão da reparação e respetiva notificação por <strong>${shopName}</strong>.
          </div>
          <div style="text-align: justify; margin-bottom: 4px;">
            Decorrido este prazo, será aplicada uma taxa de armazenamento de 0,95 € por dia, a partir do 61.º dia, até ao limite máximo de cento e vinte (120) dias, aplicável independentemente de a reparação ter sido realizada ou de o orçamento ter sido recusado.
          </div>
          <div style="text-align: justify; margin-bottom: 4px;">
            Ao aceitar o presente documento, o cliente declara que leu, compreendeu e aceita os termos e condições de reparação.
          </div>
          <div style="margin-top: 5px; font-weight: bold; font-size: 7pt;">Referência da Reparação: ${ticket.repairNumber || "N/A"}</div>
        </div>
      </div>
    `
  }

  // Generate receipts with 2 copies side by side (CLIENT and ADMIN) - compact A4 portrait, single page
  const ticketsHTML = tickets.map(ticket => {
    const clientCopy = generateReceiptHTML(ticket, 'CLIENT')
    const adminCopy = generateReceiptHTML(ticket, 'ADMIN')
    
    return `
      <div class="ticket-container" style="page-break-inside: avoid; page-break-after: avoid; break-inside: avoid; break-after: avoid; margin-bottom: 0; height: auto; max-height: calc(100vh - 20mm); overflow: hidden;">
        <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 5px; height: auto;">
          <div style="display: table-row; height: auto;">
            <div style="display: table-cell; width: 50%; vertical-align: top; padding-right: 8px; border-right: 2px dashed #ccc; page-break-inside: avoid;">
              ${clientCopy}
            </div>
            <div style="display: table-cell; width: 50%; vertical-align: top; padding-left: 8px; page-break-inside: avoid;">
              ${adminCopy}
            </div>
          </div>
        </div>
      </div>
    `
  }).join("")

  const printHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Repair Ticket Receipt</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 5mm;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                height: auto;
                overflow: visible;
              }
              .no-print {
                display: none !important;
              }
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              html, body {
                height: auto;
                overflow: visible;
                page-break-after: avoid;
              }
              /* Hide all links and URLs in print */
              a {
                text-decoration: none !important;
                color: inherit !important;
              }
              a::after {
                content: "" !important;
              }
              a[href]::after {
                content: "" !important;
              }
              /* Prevent page breaks - force everything on one page */
              .ticket-container {
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                break-inside: avoid !important;
                break-after: avoid !important;
                height: auto !important;
                max-height: none !important;
              }
              /* Prevent any element from breaking across pages */
              div, table, tr, td {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              /* Ensure table doesn't break */
              table {
                page-break-inside: avoid !important;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 7pt;
              line-height: 1.2;
              margin: 0;
              padding: 5mm;
              color: #000;
              width: 100%;
              box-sizing: border-box;
            }
            .ticket-container {
              width: 100%;
              box-sizing: border-box;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 10px 20px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              z-index: 1000;
            }
            .print-button:hover {
              background: #0056b3;
            }
            @media print {
              .print-button {
                display: none;
              }
            }
          </style>
          <script>
            // Remove all links and URLs before printing
            window.onbeforeprint = function() {
              // Remove href attributes from all links to prevent URLs from printing
              document.querySelectorAll('a').forEach(function(link) {
                link.removeAttribute('href');
                link.style.textDecoration = 'none';
                link.style.color = 'inherit';
              });
              
              // Ensure content fits on one page
              const body = document.body;
              const html = document.documentElement;
              const pageHeight = 1123; // A4 height in pixels at 96 DPI (297mm)
              const currentHeight = Math.max(
                body.scrollHeight,
                body.offsetHeight,
                html.clientHeight,
                html.scrollHeight,
                html.offsetHeight
              );
              
              // If content is taller than one page, scale it down
              if (currentHeight > pageHeight) {
                const scale = pageHeight / currentHeight;
                body.style.transform = 'scale(' + scale + ')';
                body.style.transformOrigin = 'top left';
                body.style.width = (100 / scale) + '%';
              }
            };
            
            // Also check after load
            window.onload = function() {
              setTimeout(function() {
                // Remove href attributes from all links
                document.querySelectorAll('a').forEach(function(link) {
                  link.removeAttribute('href');
                  link.style.textDecoration = 'none';
                  link.style.color = 'inherit';
                });
                
                const body = document.body;
                const html = document.documentElement;
                const pageHeight = 1123; // A4 height in pixels
                const currentHeight = Math.max(
                  body.scrollHeight,
                  body.offsetHeight,
                  html.clientHeight,
                  html.scrollHeight,
                  html.offsetHeight
                );
                
                if (currentHeight > pageHeight) {
                  const scale = pageHeight / currentHeight;
                  body.style.transform = 'scale(' + scale + ')';
                  body.style.transformOrigin = 'top left';
                  body.style.width = (100 / scale) + '%';
                }
              }, 100);
            };
          </script>
      </head>
      <body>
        <button class="no-print print-button" onclick="window.print()">Print Receipt</button>
        ${ticketsHTML}
      </body>
    </html>
  `

  printWindow.document.write(printHTML)
  printWindow.document.close()
  printWindow.document.title = "Repair Ticket Receipt"

  // Remove any URLs and href attributes from the document before printing
  setTimeout(() => {
    try {
      printWindow.document.querySelectorAll('a').forEach((link: any) => {
        // Remove href attribute to prevent URLs from appearing in print
        link.removeAttribute('href')
        link.style.textDecoration = 'none'
        link.style.color = 'inherit'
      })
    } catch (e) {
      // Ignore if querySelector fails
    }
  }, 100)

  setTimeout(() => {
    try {
      printWindow.focus()
      printWindow.print()
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.close()
        }
      }, 1000)
    } catch (error) {
      console.error("Print error:", error)
    }
  }, 500)
}
