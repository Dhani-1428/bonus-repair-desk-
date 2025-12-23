"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { AlertCircle, CheckCircle, Loader2, Sparkles } from "lucide-react"
import { PLAN_PRICING, type SubscriptionPlan } from "@/lib/constants"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [formData, setFormData] = useState({
    name: "",
    shopName: "",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    companyEmail: "",
    website: "",
    vatNumber: "",
    selectedPlan: "THREE_MONTH" as SubscriptionPlan,
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoading(false)
      return
    }

    try {
      await register(formData.name, formData.email, formData.password, formData.shopName, formData.contactNumber, formData.selectedPlan)
      
      // Save company information to localStorage
      if (formData.address || formData.companyEmail || formData.website || formData.vatNumber) {
        const companyInfo = {
          address: formData.address,
          email: formData.companyEmail,
          website: formData.website,
          vatNumber: formData.vatNumber,
          phone: formData.contactNumber,
        }
        localStorage.setItem("companyInfo", JSON.stringify(companyInfo))
      }
      
      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-black via-zinc-900 to-black">
      <div className="w-full max-w-4xl space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black font-bold text-xl">
              B
            </div>
            <span className="font-bold text-2xl text-white">Bonus Repair Desk</span>
          </Link>
          <h1 className="text-3xl font-bold mt-4 text-white">Get Started</h1>
          <p className="text-gray-400">Create your account and get your custom admin panel</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Create your account</CardTitle>
            <CardDescription className="text-gray-400">Fill in your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="py-8 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-white">Account Created Successfully!</h3>
                  <p className="text-sm text-gray-400 mb-2">
                    🎉 You've been granted a <strong className="text-yellow-400">15-day FREE trial</strong>!
                  </p>
                  <p className="text-sm text-gray-400">Redirecting you to login...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Information - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-200 text-sm">
                      Full Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200 text-sm">
                      Email <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shopName" className="text-gray-200 text-sm">
                      Shop/Company Name
                    </Label>
                    <Input
                      id="shopName"
                      name="shopName"
                      type="text"
                      placeholder="Mobile Fix Pro"
                      value={formData.shopName}
                      onChange={handleChange}
                      disabled={loading}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                    />
                    <p className="text-xs text-gray-500">Displayed as logo on admin panel</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber" className="text-gray-200 text-sm">
                      Contact Number <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                    />
                    <p className="text-xs text-gray-500">Appears on receipts</p>
                  </div>
                </div>

                {/* Company Information - 2 columns */}
                <div className="pt-3 border-t border-zinc-800">
                  <p className="text-sm font-medium text-gray-300 mb-3">Company Information (Optional - for receipts)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-gray-200 text-sm">
                        Company Address
                      </Label>
                      <Input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="Street, City, Postal Code"
                        value={formData.address}
                        onChange={handleChange}
                        disabled={loading}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyEmail" className="text-gray-200 text-sm">
                        Company Email
                      </Label>
                      <Input
                        id="companyEmail"
                        name="companyEmail"
                        type="email"
                        placeholder="company@email.com"
                        value={formData.companyEmail}
                        onChange={handleChange}
                        disabled={loading}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-gray-200 text-sm">
                        Website
                      </Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        placeholder="www.example.com"
                        value={formData.website}
                        onChange={handleChange}
                        disabled={loading}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vatNumber" className="text-gray-200 text-sm">
                        VAT Number
                      </Label>
                      <Input
                        id="vatNumber"
                        name="vatNumber"
                        type="text"
                        placeholder="VAT Number"
                        value={formData.vatNumber}
                        onChange={handleChange}
                        disabled={loading}
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Fields - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-200 text-sm">
                      Password <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-200 text-sm">
                      Confirm Password <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 h-10"
                    />
                  </div>
                </div>

                {/* Subscription Plan Selection */}
                <div className="pt-3 border-t border-zinc-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <Label className="text-sm font-semibold text-gray-200">
                      Choose Your Subscription Plan (After Free Trial)
                    </Label>
                  </div>
                  <div className="mb-3 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-sm text-yellow-200 font-semibold mb-1">
                      🎉 15 Days FREE Trial Included!
                    </p>
                    <p className="text-xs text-yellow-300/80">
                      All new signups automatically receive a <strong>15-day FREE trial</strong>. After the trial ends, you'll need to subscribe to the plan below to continue.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(PLAN_PRICING).map(([planKey, planDetails]) => (
                      <Card
                        key={planKey}
                        className={`cursor-pointer transition-all ${
                          formData.selectedPlan === planKey
                            ? "border-yellow-500 bg-yellow-500/10"
                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                        }`}
                        onClick={() => !loading && setFormData(prev => ({ ...prev, selectedPlan: planKey as SubscriptionPlan }))}
                      >
                        <CardContent className="p-3">
                          <div className="text-center">
                            <p className="font-semibold text-white text-sm mb-1">{planDetails.name}</p>
                            <p className="text-xs text-gray-400 mb-2">
                              {planKey === "SIX_MONTH" ? "6 months" : "12 months"}
                            </p>
                            <p className="text-lg font-bold text-white">€{planDetails.price}</p>
                            <p className="text-xs text-gray-400">After trial</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    You'll start with a 15-day free trial. After the trial ends, you'll need to subscribe to continue.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm border border-red-500/20">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full bg-white text-black hover:bg-gray-200" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <div className="text-xs text-center text-gray-500">
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </div>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-400">Already have an account? </span>
                <Link href="/login" className="text-white font-medium hover:underline">
                  Log in
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-400">
          <Link href="/" className="hover:text-white transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
