import { PrismaClient, AIProvider } from '@prisma/client'
import crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(
  process.env.AI_KEY_ENCRYPTION_SECRET ?? 'qauthority-ai-key-default-secret!',
  'utf-8'
).slice(0, 32)

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf-8')
}

interface CreateProviderInput {
  name: string
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl?: string
  isDefault?: boolean
  projectId?: string
}

export class AIProviderService {
  constructor(private prisma: PrismaClient) {}

  async listProviders(projectId?: string) {
    const providers = await this.prisma.aIProviderConfig.findMany({
      where: projectId ? { OR: [{ projectId }, { projectId: null }] } : {},
      orderBy: { createdAt: 'desc' },
    })
    return providers.map(p => ({ ...p, apiKey: '***' }))
  }

  async createProvider(input: CreateProviderInput) {
    return this.prisma.aIProviderConfig.create({
      data: { ...input, apiKey: encrypt(input.apiKey) },
    })
  }

  async updateProvider(id: string, input: Partial<CreateProviderInput>) {
    const data: any = { ...input }
    if (input.apiKey) data.apiKey = encrypt(input.apiKey)
    return this.prisma.aIProviderConfig.update({ where: { id }, data })
  }

  async deleteProvider(id: string) {
    return this.prisma.aIProviderConfig.delete({ where: { id } })
  }

  async getDecryptedProvider(id: string) {
    const provider = await this.prisma.aIProviderConfig.findUnique({ where: { id } })
    if (!provider) throw new Error('Provider not found')
    return { ...provider, apiKey: decrypt(provider.apiKey) }
  }

  async getDefaultProvider(projectId?: string) {
    const provider = await this.prisma.aIProviderConfig.findFirst({
      where: {
        isDefault: true,
        OR: [{ projectId: projectId ?? null }, { projectId: null }],
      },
      orderBy: { projectId: 'desc' },
    })
    if (!provider) throw new Error('No default AI provider configured')
    return { ...provider, apiKey: decrypt(provider.apiKey) }
  }
}
