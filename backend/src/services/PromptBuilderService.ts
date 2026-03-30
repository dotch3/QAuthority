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
   - Uses page.goto() for navigation`,

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
${testCase.description ? `Description: ${testCase.description}\n` : ''}## Test Steps
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
