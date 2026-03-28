# Plan 6: AI Code Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let QA Engineers select a test case and generate Playwright/Cypress/Jest automation code using the Page Object Model pattern. Admin configures the AI provider (Anthropic, OpenAI, Ollama, or custom). Generated code is stored and viewable/downloadable.

**Architecture:** `AIProviderConfig` stores encrypted API keys per provider. `PromptBuilderService` constructs prompts from test case steps. `CodeGeneratorService` calls the configured AI provider and stores results in `GeneratedTestCode`. Frontend shows a code editor with copy/download.

**Tech Stack:** Fastify 5, Prisma 6, `node-fetch` (for AI API calls), `crypto` (AES-256 key encryption), Next.js 16, Vitest 2

**Depends on:** Plan 0 (permissions for AI_CODEGEN module), existing TestCase model

---

## ⚠️ Path & URL Convention — Read This First

Pages live under `frontend/src/app/[locale]/(app)/`. The `[locale]` segment is **NOT in the URL** — the app uses `localePrefix: 'never'` in `middleware.ts`. URL is `/ai/generator` not `/en/ai/generator`. Use `Link` from `next-intl` with clean hrefs.

---

## File Map

### Backend — New
- `backend/prisma/migrations/XXXXXX_add_ai_codegen/migration.sql`
- `backend/src/services/AIProviderService.ts`
- `backend/src/services/PromptBuilderService.ts`
- `backend/src/services/CodeGeneratorService.ts`
- `backend/src/interfaces/http/routes/aiCodegen.ts`
- `backend/tests/services/PromptBuilderService.test.ts`
- `backend/tests/services/CodeGeneratorService.test.ts`

### Backend — Modified
- `backend/prisma/schema.prisma`
- `backend/src/interfaces/http/routes/index.ts`

### Frontend — New
- `frontend/src/app/[locale]/(app)/ai/generator/page.tsx`
- `frontend/src/app/[locale]/(app)/ai/providers/page.tsx`
- `frontend/src/components/ai/CodeGeneratorPanel.tsx`
- `frontend/src/components/ai/GeneratedCodeViewer.tsx`
- `frontend/src/components/ai/AIProviderForm.tsx`

---

## Task 1: Prisma Schema

- [ ] **Step 1: Add AI models**

Append to `backend/prisma/schema.prisma`:

```prisma
enum AIProvider { ANTHROPIC OPENAI OLLAMA CUSTOM }
enum TestFramework { PLAYWRIGHT CYPRESS JEST SELENIUM }

model AIProviderConfig {
  id        String     @id @default(uuid())
  name      String
  provider  AIProvider
  apiKey    String
  model     String
  baseUrl   String?
  isDefault Boolean    @default(false)
  projectId String?
  project   Project?   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
}

model GeneratedTestCode {
  id          String        @id @default(uuid())
  testCaseId  String
  framework   TestFramework
  code        String        @db.Text
  promptUsed  String        @db.Text
  generatedAt DateTime      @default(now())
  createdById String
  testCase    TestCase      @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
}
```

Add to `Project` model:
```prisma
  aiProviderConfigs AIProviderConfig[]
```

Add to `TestCase` model:
```prisma
  generatedCodes GeneratedTestCode[]
```

- [ ] **Step 2: Run migration**

```bash
cd backend && npx prisma migrate dev --name add_ai_codegen
```

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add AIProviderConfig and GeneratedTestCode models"
```

---

## Task 2: AIProviderService (with encryption)

**Files:**
- Create: `backend/src/services/AIProviderService.ts`

- [ ] **Step 1: Implement AIProviderService**

Create `backend/src/services/AIProviderService.ts`:

```typescript
import { PrismaClient, AIProvider } from '@prisma/client'
import crypto from 'crypto'

const ENCRYPTION_KEY = Buffer.from(
  process.env.AI_KEY_ENCRYPTION_SECRET ?? 'qauthority-ai-key-default-secret!',
  'utf-8'
).slice(0, 32) // AES-256 needs 32 bytes

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
    // Mask API keys in list view
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
    // Prefer project-specific default, fall back to org-wide default
    const provider = await this.prisma.aIProviderConfig.findFirst({
      where: {
        isDefault: true,
        OR: [{ projectId: projectId ?? null }, { projectId: null }],
      },
      orderBy: { projectId: 'desc' }, // project-specific first
    })
    if (!provider) throw new Error('No default AI provider configured')
    return { ...provider, apiKey: decrypt(provider.apiKey) }
  }
}
```

- [ ] **Step 2: Add to .env.example**

In `.env.example`, add:
```
AI_KEY_ENCRYPTION_SECRET=your-32-char-secret-here-replace
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/AIProviderService.ts .env.example
git commit -m "feat(service): add AIProviderService with AES-256 API key encryption"
```

---

## Task 3: PromptBuilderService

**Files:**
- Create: `backend/src/services/PromptBuilderService.ts`
- Create: `backend/tests/services/PromptBuilderService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/PromptBuilderService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PromptBuilderService } from '../../src/services/PromptBuilderService'

const testCase = {
  title: 'User Login with valid credentials',
  description: 'Test that a user can log in with valid email and password',
  steps: [
    { order: 1, description: 'Navigate to /login', expectedResult: 'Login page is displayed' },
    { order: 2, description: 'Enter email "user@example.com" in the email field', expectedResult: 'Email field shows the value' },
    { order: 3, description: 'Enter password "Password123" in the password field', expectedResult: 'Password field is filled (masked)' },
    { order: 4, description: 'Click the "Login" button', expectedResult: 'User is redirected to /dashboard' },
  ],
}

describe('PromptBuilderService', () => {
  const service = new PromptBuilderService()

  it('builds a Playwright POM prompt containing all test steps', () => {
    const prompt = service.buildPrompt(testCase as any, 'PLAYWRIGHT')
    expect(prompt).toContain('User Login with valid credentials')
    expect(prompt).toContain('Navigate to /login')
    expect(prompt).toContain('Click the "Login" button')
    expect(prompt).toContain('Page Object Model')
    expect(prompt).toContain('Playwright')
    expect(prompt).toContain('TypeScript')
  })

  it('builds a Cypress prompt with correct framework references', () => {
    const prompt = service.buildPrompt(testCase as any, 'CYPRESS')
    expect(prompt).toContain('Cypress')
    expect(prompt).toContain('cy.visit')
  })

  it('builds a Jest prompt', () => {
    const prompt = service.buildPrompt(testCase as any, 'JEST')
    expect(prompt).toContain('Jest')
    expect(prompt).toContain('describe')
  })
})
```

- [ ] **Step 2: Implement PromptBuilderService**

Create `backend/src/services/PromptBuilderService.ts`:

```typescript
interface TestStep {
  order: number
  description: string
  expectedResult?: string | null
}

interface TestCaseInput {
  title: string
  description?: string | null
  steps: TestStep[]
}

type Framework = 'PLAYWRIGHT' | 'CYPRESS' | 'JEST' | 'SELENIUM'

const FRAMEWORK_CONTEXT: Record<Framework, string> = {
  PLAYWRIGHT: `Use Playwright with TypeScript and the Page Object Model pattern.
Create two files:
1. A Page Object class (e.g., LoginPage) with:
   - A constructor accepting a Playwright Page object
   - Locator properties for each UI element
   - Action methods for each interaction
2. A test file using @playwright/test that:
   - Imports the Page Object
   - Uses test() blocks with descriptive names
   - Uses expect() for assertions
   - Uses cy.visit() for navigation is WRONG — use page.goto()`,

  CYPRESS: `Use Cypress with TypeScript and the Page Object Model pattern.
Create two files:
1. A Page Object class with:
   - Action methods wrapping Cypress commands (cy.get, cy.click, etc.)
   - Type-safe return values
2. A test file using describe()/it() blocks that:
   - Imports the Page Object
   - Uses cy.visit() for navigation
   - Uses expect()/should() for assertions`,

  JEST: `Use Jest with TypeScript.
Create a test file using describe()/it() blocks with:
   - Proper setup/teardown with beforeEach/afterEach
   - Mock functions where needed
   - expect() assertions matching the expected results`,

  SELENIUM: `Use Selenium WebDriver with TypeScript and the Page Object Model pattern.
Create two files:
1. A Page Object class using By selectors and WebElement interactions
2. A test file using describe()/it() blocks`,
}

export class PromptBuilderService {
  buildPrompt(testCase: TestCaseInput, framework: Framework): string {
    const stepsText = testCase.steps
      .sort((a, b) => a.order - b.order)
      .map(s => `  Step ${s.order}: ${s.description}${s.expectedResult ? `\n    Expected: ${s.expectedResult}` : ''}`)
      .join('\n')

    return `You are an expert QA automation engineer.

Generate automation code for the following test case.

## Test Case
Title: ${testCase.title}
${testCase.description ? `Description: ${testCase.description}\n` : ''}
## Test Steps
${stepsText}

## Framework Requirements
${FRAMEWORK_CONTEXT[framework]}

## Output Requirements
- Output ONLY the code, no explanations before or after
- Use meaningful variable names
- Add comments for non-obvious steps
- Handle async/await correctly
- Separate the Page Object file and the test file with a comment like: // --- PAGE OBJECT: LoginPage.ts ---

Generate the complete, working automation code now:`
  }
}
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npx vitest run tests/services/PromptBuilderService.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/PromptBuilderService.ts backend/tests/services/PromptBuilderService.test.ts
git commit -m "feat(service): add PromptBuilderService with POM prompts for Playwright, Cypress, Jest"
```

---

## Task 4: CodeGeneratorService

**Files:**
- Create: `backend/src/services/CodeGeneratorService.ts`
- Create: `backend/tests/services/CodeGeneratorService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/services/CodeGeneratorService.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { CodeGeneratorService } from '../../src/services/CodeGeneratorService'

const mockPrisma = {
  testCase: {
    findUnique: vi.fn(),
  },
  generatedTestCode: {
    create: vi.fn(),
  },
}

// Mock fetch
global.fetch = vi.fn()

describe('CodeGeneratorService', () => {
  const service = new CodeGeneratorService(mockPrisma as any)

  it('throws if test case not found', async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue(null)
    await expect(
      service.generate({ testCaseId: 'tc-999', framework: 'PLAYWRIGHT', provider: { provider: 'ANTHROPIC', apiKey: 'key', model: 'claude-haiku-4-5-20251001' } as any })
    ).rejects.toThrow('Test case not found')
  })

  it('calls correct Anthropic endpoint and saves result', async () => {
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: 'tc-1',
      title: 'Login test',
      description: null,
      steps: [{ order: 1, description: 'Go to /login', expectedResult: 'Login page shown' }],
    })

    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ text: 'const code = "generated playwright code"' }],
      }),
    })

    mockPrisma.generatedTestCode.create.mockResolvedValue({ id: 'gen-1' })

    const result = await service.generate({
      testCaseId: 'tc-1',
      framework: 'PLAYWRIGHT',
      provider: { provider: 'ANTHROPIC', apiKey: 'test-key', model: 'claude-haiku-4-5-20251001' } as any,
      createdById: 'user-1',
    })

    expect(result).toContain('generated playwright code')
    expect(mockPrisma.generatedTestCode.create).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Implement CodeGeneratorService**

Create `backend/src/services/CodeGeneratorService.ts`:

```typescript
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
      include: { steps: true },
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
```

- [ ] **Step 3: Run tests**

```bash
cd backend && npx vitest run tests/services/CodeGeneratorService.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/CodeGeneratorService.ts backend/tests/services/CodeGeneratorService.test.ts
git commit -m "feat(service): add CodeGeneratorService supporting Anthropic, OpenAI, and Ollama providers"
```

---

## Task 5: AI Code Gen Routes

**Files:**
- Create: `backend/src/interfaces/http/routes/aiCodegen.ts`

- [ ] **Step 1: Create routes**

Create `backend/src/interfaces/http/routes/aiCodegen.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { AIProviderService } from '../../../services/AIProviderService'
import { CodeGeneratorService } from '../../../services/CodeGeneratorService'
import { requirePermission } from '../../../infrastructure/auth/authMiddleware'

export async function aiCodegenRoutes(app: FastifyInstance) {
  const providerService = new AIProviderService(app.prisma)
  const codegenService = new CodeGeneratorService(app.prisma)
  const auth = [app.authenticate, requirePermission('AI_CODEGEN', 'read')]
  const authCreate = [app.authenticate, requirePermission('AI_CODEGEN', 'create')]
  const authAdmin = [app.authenticate, requirePermission('ADMIN', 'create')]

  // Provider management (admin only)
  app.get('/providers', { onRequest: authAdmin }, async (req, reply) => {
    const { projectId } = req.query as { projectId?: string }
    return reply.send(await providerService.listProviders(projectId))
  })

  app.post('/providers', { onRequest: authAdmin }, async (req, reply) => {
    const provider = await providerService.createProvider(req.body as any)
    return reply.code(201).send({ ...provider, apiKey: '***' })
  })

  app.put('/providers/:id', { onRequest: authAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    return reply.send(await providerService.updateProvider(id, req.body as any))
  })

  app.delete('/providers/:id', { onRequest: authAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    await providerService.deleteProvider(id)
    return reply.code(204).send()
  })

  // Code generation
  app.post('/generate', { onRequest: authCreate }, async (req, reply) => {
    const { testCaseId, framework, providerId } = req.body as {
      testCaseId: string
      framework: any
      providerId?: string
    }

    let provider
    if (providerId) {
      provider = await providerService.getDecryptedProvider(providerId)
    } else {
      provider = await providerService.getDefaultProvider()
    }

    const code = await codegenService.generate({
      testCaseId,
      framework,
      provider,
      createdById: (req.user as any).id,
    })

    return reply.send({ code, framework, testCaseId })
  })

  // Get previously generated codes for a test case
  app.get('/test-cases/:testCaseId/codes', { onRequest: auth }, async (req, reply) => {
    const { testCaseId } = req.params as { testCaseId: string }
    return reply.send(await codegenService.getGeneratedCodes(testCaseId))
  })
}
```

- [ ] **Step 2: Register routes**

In `backend/src/interfaces/http/routes/index.ts`:
```typescript
import { aiCodegenRoutes } from './aiCodegen'
app.register(aiCodegenRoutes, { prefix: '/ai' })
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/interfaces/http/routes/aiCodegen.ts
git commit -m "feat(routes): add /ai endpoints for provider management and code generation"
```

---

## Task 6: Frontend — AI Code Generator Page

- [ ] **Step 1: Create GeneratedCodeViewer component**

Create `frontend/src/components/ai/GeneratedCodeViewer.tsx`:

```typescript
'use client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Props {
  code: string
  framework: string
  testCaseTitle: string
}

export function GeneratedCodeViewer({ code, framework, testCaseTitle }: Props) {
  const copy = () => {
    navigator.clipboard.writeText(code)
    toast.success('Code copied to clipboard')
  }

  const download = () => {
    const ext = framework === 'PLAYWRIGHT' || framework === 'JEST' ? 'spec.ts' : 'cy.ts'
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${testCaseTitle.toLowerCase().replace(/\s+/g, '-')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{framework} — Generated Code</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>Copy</Button>
          <Button size="sm" variant="outline" onClick={download}>Download</Button>
        </div>
      </div>
      <pre className="bg-muted rounded p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}
```

- [ ] **Step 2: Create AI Code Generator page**

Create `frontend/src/app/[locale]/(app)/ai/generator/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useNavigationStore } from '@/stores/navigationStore'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GeneratedCodeViewer } from '@/components/ai/GeneratedCodeViewer'
import api from '@/lib/api'
import { toast } from 'sonner'

const FRAMEWORKS = ['PLAYWRIGHT', 'CYPRESS', 'JEST', 'SELENIUM']

export default function AIGeneratorPage() {
  const { activeProject } = useNavigationStore()
  const [testCases, setTestCases] = useState<any[]>([])
  const [selectedCase, setSelectedCase] = useState<string>('')
  const [framework, setFramework] = useState<string>('PLAYWRIGHT')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeProject) {
      api.get(`/test-cases?projectId=${activeProject}`).then(r => setTestCases(r.data ?? []))
    }
  }, [activeProject])

  const generate = async () => {
    if (!selectedCase) return toast.error('Select a test case first')
    setLoading(true)
    setGeneratedCode(null)
    try {
      const res = await api.post('/ai/generate', { testCaseId: selectedCase, framework })
      setGeneratedCode(res.data.code)
      toast.success('Code generated successfully')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Generation failed — check AI provider configuration')
    } finally {
      setLoading(false)
    }
  }

  const selectedTestCase = testCases.find(tc => tc.id === selectedCase)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">AI Code Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a test case and generate automation code using the Page Object Model pattern.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Case</label>
          <Select value={selectedCase} onValueChange={setSelectedCase}>
            <SelectTrigger>
              <SelectValue placeholder="Select a test case..." />
            </SelectTrigger>
            <SelectContent>
              {testCases.map(tc => (
                <SelectItem key={tc.id} value={tc.id}>{tc.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Framework</label>
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={generate} disabled={loading || !selectedCase}>
        {loading ? 'Generating...' : 'Generate Code'}
      </Button>

      {generatedCode && selectedTestCase && (
        <GeneratedCodeViewer
          code={generatedCode}
          framework={framework}
          testCaseTitle={selectedTestCase.title}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create AI Providers admin page**

Create `frontend/src/app/[locale]/(app)/ai/providers/page.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', provider: 'ANTHROPIC', apiKey: '', model: 'claude-sonnet-4-6', baseUrl: '', isDefault: false,
  })

  useEffect(() => {
    api.get('/ai/providers').then(r => setProviders(r.data))
  }, [])

  const save = async () => {
    await api.post('/ai/providers', form)
    api.get('/ai/providers').then(r => setProviders(r.data))
    setShowForm(false)
    toast.success('Provider added')
  }

  const remove = async (id: string) => {
    await api.delete(`/ai/providers/${id}`)
    setProviders(prev => prev.filter(p => p.id !== id))
    toast.success('Provider removed')
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Providers</h1>
        <Button onClick={() => setShowForm(s => !s)}>Add Provider</Button>
      </div>

      {showForm && (
        <div className="border rounded p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={v => setForm(f => ({ ...f, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ANTHROPIC', 'OPENAI', 'OLLAMA', 'CUSTOM'].map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="claude-sonnet-4-6 / gpt-4o / llama3" />
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} />
            </div>
            {(form.provider === 'OLLAMA' || form.provider === 'CUSTOM') && (
              <div className="col-span-2">
                <Label>Base URL</Label>
                <Input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                  placeholder="http://localhost:11434" />
              </div>
            )}
          </div>
          <Button onClick={save}>Save Provider</Button>
        </div>
      )}

      <div className="space-y-2">
        {providers.map(p => (
          <div key={p.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                {p.isDefault && <Badge variant="default">Default</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{p.provider} / {p.model}</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>Remove</Button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/[locale]/(app)/ai/ frontend/src/components/ai/
git commit -m "feat(ui): add AI Code Generator page and AI Providers admin page"
```

---

## Final: Integration Verification

- [ ] **Step 1: Configure a provider**

Open `http://localhost:3000/ai/providers`, add an Anthropic provider with your API key, set as default.

- [ ] **Step 2: Generate code for a test case**

Open `http://localhost:3000/ai/generator`, select a test case with multiple steps, choose Playwright, click Generate.

Expected: Generated TypeScript Playwright code with Page Object class appears below.

- [ ] **Step 3: Copy and verify code**

Click "Copy" — paste into a `.spec.ts` file. Verify it compiles with `tsc --noEmit`.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(plan-6): complete AI Code Generation with configurable providers and POM output"
```
