"use client"

import { useTranslations } from "next-intl"
import { AuthCard } from "@/components/auth/AuthCard"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  const t = useTranslations("auth")

  return (
    <AuthCard title={t("login")} description={t("enterYourCredentials")}>
      <LoginForm />
    </AuthCard>
  )
}
