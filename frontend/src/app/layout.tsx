import type { Metadata } from "next"
import "./globals.css"
import { APP_CONFIG } from "@/lib/config"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { AppProviders } from "@/components/providers/AppProviders"

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.description,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()
  const defaultTheme = process.env.UI_DEFAULT_THEME ?? "dark"

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme={defaultTheme}>
          <NextIntlClientProvider messages={messages}>
            <AppProviders>{children}</AppProviders>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
