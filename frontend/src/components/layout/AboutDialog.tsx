"use client"

import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Heart, ExternalLink } from "lucide-react"
import { APP_CONFIG } from "@/lib/config"

interface AboutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutDialog({ isOpen, onClose }: AboutDialogProps) {
  const t = useTranslations("about")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{t("title")}</DialogTitle>
            <Badge variant="secondary" className="text-xs">
              v{APP_CONFIG.version}
            </Badge>
          </div>
          <DialogDescription className="text-base pt-2">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t("purpose")}
          </p>

          <div>
            <p className="text-sm font-medium mb-2">{t("featuresTitle")}:</p>
            <p className="text-sm text-muted-foreground">
              {t("features")}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{t("techStack")}:</p>
            <div className="flex flex-wrap gap-2">
              {["Next.js", "React", "TypeScript", "Tailwind CSS", "Fastify", "Prisma", "PostgreSQL"].map((tech) => (
                <Badge key={tech} variant="secondary" className="text-xs">
                  {tech}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t">
            <Heart className="h-4 w-4 text-red-500" />
            <p className="text-sm text-muted-foreground flex-1">
              {t("contribute")}
            </p>
            <a
              href="https://github.com/dotch3/qauthority"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
