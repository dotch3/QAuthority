"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { PasswordInput } from "./PasswordInput"
import { OAuthButtons } from "./OAuthButtons"

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

export function RegisterForm() {
  const t = useTranslations("auth")
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!name.trim()) {
      newErrors.name = "Name is required"
    } else if (name.length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearFieldError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!validate()) return

    setIsLoading(true)

    try {
      const data = await api.register({ email, password, name })
      localStorage.setItem("access_token", data.accessToken)
      localStorage.setItem("refresh_token", data.refreshToken)
      router.push("/dashboard")
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : "Registration failed. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errors.general}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">
            {t("name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              clearFieldError("name")
            }}
            autoComplete="name"
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            {t("email")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearFieldError("email")
            }}
            autoComplete="email"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            {t("password")} <span className="text-destructive">*</span>
          </Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError("password")
              if (errors.confirmPassword === "Passwords do not match") {
                clearFieldError("confirmPassword")
              }
            }}
            autoComplete="new-password"
            className={errors.password ? "border-destructive" : ""}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters long
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">
            {t("confirmPassword")} <span className="text-destructive">*</span>
          </Label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              clearFieldError("confirmPassword")
            }}
            autoComplete="new-password"
            className={errors.confirmPassword ? "border-destructive" : ""}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("loading") : t("register")}
        </Button>
      </form>

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <a href="/login" className="text-primary hover:underline">
          {t("login")}
        </a>
      </p>
    </div>
  )
}
