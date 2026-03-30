import { PrismaClient, TestFramework } from '@prisma/client'
import { PromptBuilderService } from './PromptBuilderService'

interface AIProviderDecrypted {
  provider: 'ANTHROPIC' | 'OPENAI' | 'OLLAMA' | 'CUSTOM'
  apiKey: string
  model: string
  baseUrl?: string | null
}

interface GenerateInput {
  testCaseId: string
  framework: TestFramework
  provider: AIProviderDecrypted
  createdById?: string
}

export class CodeGeneratorService {
  private promptBuilder = new PromptBuilderService()

  constructor(private prisma: PrismaClient) {}

  async generate(input: GenerateInput): Promise<string> {
    const testCase = await this.prisma.testCase.findUnique({
      where: { id: input.testCaseId },
    })
    if (!testCase) throw new Error('Test case not found')

    const prompt = this.promptBuilder.buildPrompt(testCase as any, input.framework)
    const code = await this.callProvider(input.provider, prompt)

    if (input.createdById) {
      await this.prisma.generatedTestCode.create({
        data: {
          testCaseId: input.testCaseId,
          framework: input.framework,
          code,
          promptUsed: prompt,
          createdById: input.createdById,
        },
      })
    }

    return code
  }

  private async callProvider(provider: AIProviderDecrypted, prompt: string): Promise<string> {
    if (provider.provider === 'ANTHROPIC') {
      return this.callAnthropic(provider, prompt)
    } else if (provider.provider === 'OPENAI') {
      return this.callOpenAI(provider, prompt)
    } else if (provider.provider === 'OLLAMA' || provider.provider === 'CUSTOM') {
      return this.callOpenAICompatible(provider, prompt)
    }
    throw new Error(`Unsupported provider: ${provider.provider}`)
  }

  private async callAnthropic(provider: AIProviderDecrypted, prompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic API error: ${err}`)
    }
    const data = await res.json() as any
    return data.content[0].text
  }

  private async callOpenAI(provider: AIProviderDecrypted, prompt: string): Promise<string> {
    return this.callOpenAICompatible(
      { ...provider, baseUrl: provider.baseUrl ?? 'https://api.openai.com' },
      prompt
    )
  }

  private async callOpenAICompatible(provider: AIProviderDecrypted, prompt: string): Promise<string> {
    const baseUrl = (provider.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '')
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`AI provider error: ${err}`)
    }
    const data = await res.json() as any
    return data.choices[0].message.content
  }

  async getGeneratedCodes(testCaseId: string) {
    return this.prisma.generatedTestCode.findMany({
      where: { testCaseId },
      orderBy: { generatedAt: 'desc' },
    })
  }
}
