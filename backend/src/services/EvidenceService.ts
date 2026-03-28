import { prisma } from "../infrastructure/database/prisma.js"
import { NotFoundError } from "../utils/errors.js"
import { config } from "../config.js"
import path from "path"
import fs from "fs"
import { randomUUID } from "crypto"
import { logger } from "../logger.js"

export interface AttachmentInfo {
  id: string
  fileName: string
  fileType: string
  fileSizeKb: number
  entityType: string
  entityId: string
  storagePath: string
}

export class EvidenceService {
  private uploadDir: string

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), config.STORAGE_PATH || "data/uploads", "evidence")
    console.log(`[Evidence] Upload directory: ${this.uploadDir}`)
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async uploadEvidence(
    file: {
      filename: string
      content: Buffer
      mimetype: string
    },
    entityType: "bug" | "test_case" | "test_execution" | "et_charter",
    entityId: string,
    projectId: string | undefined,
    userId: string
  ): Promise<AttachmentInfo> {
    let finalProjectId = projectId
    
    if (!finalProjectId) {
      if (entityType === "bug") {
        const bug = await prisma.defect.findUnique({ where: { id: entityId }, select: { projectId: true } })
        finalProjectId = bug?.projectId
      } else if (entityType === "test_case") {
        const tc = await prisma.testCase.findUnique({ where: { id: entityId }, include: { suite: { include: { testPlan: true } } } })
        finalProjectId = tc?.suite?.testPlan?.projectId
      } else if (entityType === "test_execution") {
        const exec = await prisma.testExecution.findUnique({ where: { id: entityId }, include: { testCase: { include: { suite: { include: { testPlan: true } } } } } })
        finalProjectId = exec?.testCase?.suite?.testPlan?.projectId
      } else if (entityType === "et_charter") {
        const charter = await prisma.eTCharter.findUnique({ where: { id: entityId }, include: { suite: { include: { testPlan: true } } } })
        finalProjectId = charter?.suite?.testPlan?.projectId
      }
    }

    if (!finalProjectId) {
      logger.error("[Evidence] Could not determine project for entity", { entityType, entityId })
      throw new Error("Could not determine project for this entity")
    }

    logger.debug("[Evidence] Uploading file", { fileName: file.filename, entityType, entityId, projectId: finalProjectId })

    const ext = path.extname(file.filename)
    const storedFileName = `${randomUUID()}${ext}`
    
    const folderMap: Record<string, string> = {
      test_case: "test-cases",
      bug: "bugs",
      test_execution: "executions",
      et_charter: "et-charters",
    }
    const folder = folderMap[entityType] || "other"
    
    const entityFolder = path.join(this.uploadDir, folder, entityId)
    logger.debug("[Evidence] Creating folder", { entityFolder })
    if (!fs.existsSync(entityFolder)) {
      fs.mkdirSync(entityFolder, { recursive: true })
    }
    
    const filePath = path.join(entityFolder, storedFileName)
    logger.debug("[Evidence] Writing file", { filePath, fileSize: file.content.length })
    fs.writeFileSync(filePath, file.content)

    const fileSizeKb = Math.round(file.content.length / 1024)

    logger.debug("[Evidence] Creating DB record", { projectId: finalProjectId, entityType, entityId, fileName: file.filename, storagePath: `${folder}/${entityId}/${storedFileName}` })

    const attachment = await prisma.attachment.create({
      data: {
        projectId: finalProjectId,
        entityType,
        entityId,
        fileName: file.filename,
        fileType: file.mimetype,
        fileSizeKb,
        storagePath: `${folder}/${entityId}/${storedFileName}`,
        uploadedById: userId,
      },
    })

    logger.info("[Evidence] File uploaded successfully", { attachmentId: attachment.id, fileName: file.filename, storagePath: attachment.storagePath })

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSizeKb: attachment.fileSizeKb,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      storagePath: attachment.storagePath,
    }
  }

  async getByEntity(
    entityType: "bug" | "test_case" | "test_execution" | "et_charter",
    entityId: string
  ): Promise<AttachmentInfo[]> {
    const attachments = await prisma.attachment.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSizeKb: a.fileSizeKb,
      entityType: a.entityType,
      entityId: a.entityId,
      storagePath: a.storagePath,
    }))
  }

  async getById(id: string): Promise<AttachmentInfo & { data: Buffer } | null> {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    })

    if (!attachment) return null

    const filePath = path.join(this.uploadDir, attachment.storagePath)
    let data: Buffer | undefined

    if (fs.existsSync(filePath)) {
      data = fs.readFileSync(filePath)
    }

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSizeKb: attachment.fileSizeKb,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      storagePath: attachment.storagePath,
      data: data!,
    }
  }

  async delete(id: string): Promise<void> {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
    })

    if (!attachment) {
      throw new NotFoundError("Attachment not found")
    }

    const filePath = path.join(this.uploadDir, attachment.storagePath)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    await prisma.attachment.delete({
      where: { id },
    })
  }
}

export const evidenceService = new EvidenceService()
