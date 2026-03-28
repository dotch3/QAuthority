"use client"

import { useState, useEffect, Suspense } from "react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import { PasswordInput } from "./PasswordInput"
import { OAuthButtons } from "./OAuthButtons"

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

function LoginFormContent() {
  const t = useTranslations("auth")
  const { login, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl") || "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(returnUrl)
    }
  }, [authLoading, user, router, returnUrl])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = "Password is required"
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
      await login(email, password)
      router.push(returnUrl)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed. Please check your credentials."
      setErrors({
        general: errorMessage,
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">
              {t("password")} <span className="text-destructive">*</span>
            </Label>
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {t("forgotPassword")}
            </a>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearFieldError("password")
            }}
            autoComplete="current-password"
            className={errors.password ? "border-destructive" : ""}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("loading") : t("login")}
        </Button>
      </form>

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        {t("dontHaveAccount")}{" "}
        <a href="/register" className="text-primary hover:underline">
          {t("register")}
        </a>
      </p>
    </div>
  )
}

export function LoginForm() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  )
}
