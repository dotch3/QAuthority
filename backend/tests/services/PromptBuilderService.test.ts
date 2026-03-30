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
