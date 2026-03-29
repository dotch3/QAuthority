// backend/prisma/seed.ts
// Seeds the database with required system data:
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { seedGroups } from './seed/groups'

const prisma = new PrismaClient()

async function main() {
  // ── Enum types + values ───────────────────────────────────────────────────
  const enumSeed = [
    {
      name: 'test_plan_status', isSystem: true,
      values: [
        { systemKey: 'draft', value: 'draft', label: 'Draft', color: '#94a3b8', isDefault: true },
        { systemKey: 'active', value: 'active', label: 'Active', color: '#22c55e' },
        { systemKey: 'completed', value: 'completed', label: 'Completed', color: '#3b82f6' },
        { systemKey: 'archived', value: 'archived', label: 'Archived', color: '#6b7280' },
      ],
    },
    {
      name: 'execution_status', isSystem: true,
      values: [
        { systemKey: 'not_run', value: 'not_run', label: 'Not Run', color: '#94a3b8', isDefault: true },
        { systemKey: 'pass', value: 'pass', label: 'Pass', color: '#22c55e' },
        { systemKey: 'fail', value: 'fail', label: 'Fail', color: '#ef4444' },
        { systemKey: 'blocked', value: 'blocked', label: 'Blocked', color: '#f97316' },
        { systemKey: 'skipped', value: 'skipped', label: 'Skipped', color: '#a855f7' },
      ],
    },
    {
      name: 'bug_status', isSystem: true,
      values: [
        { systemKey: 'open', value: 'open', label: 'Open', color: '#ef4444', isDefault: true },
        { systemKey: 'in_progress', value: 'in_progress', label: 'In Progress', color: '#f97316' },
        { systemKey: 'resolved', value: 'resolved', label: 'Resolved', color: '#22c55e' },
        { systemKey: 'closed', value: 'closed', label: 'Closed', color: '#6b7280' },
        { systemKey: 'reopened', value: 'reopened', label: 'Reopened', color: '#a855f7' },
      ],
    },
    {
      name: 'bug_priority', isSystem: true,
      values: [
        { systemKey: 'low', value: 'low', label: 'Low', color: '#22c55e', isDefault: true },
        { systemKey: 'medium', value: 'medium', label: 'Medium', color: '#f59e0b' },
        { systemKey: 'high', value: 'high', label: 'High', color: '#f97316' },
        { systemKey: 'critical', value: 'critical', label: 'Critical', color: '#ef4444' },
      ],
    },
    {
      name: 'bug_severity', isSystem: true,
      values: [
        { systemKey: 'trivial', value: 'trivial', label: 'Trivial', color: '#94a3b8', isDefault: true },
        { systemKey: 'minor', value: 'minor', label: 'Minor', color: '#22c55e' },
        { systemKey: 'major', value: 'major', label: 'Major', color: '#f97316' },
        { systemKey: 'critical', value: 'critical', label: 'Critical', color: '#ef4444' },
        { systemKey: 'blocker', value: 'blocker', label: 'Blocker', color: '#7c3aed' },
      ],
    },
    {
      name: 'test_priority', isSystem: true,
      values: [
        { systemKey: 'low', value: 'low', label: 'Low', color: '#22c55e', isDefault: true },
        { systemKey: 'medium', value: 'medium', label: 'Medium', color: '#f59e0b' },
        { systemKey: 'high', value: 'high', label: 'High', color: '#f97316' },
        { systemKey: 'critical', value: 'critical', label: 'Critical', color: '#ef4444' },
      ],
    },
    {
      name: 'test_type', isSystem: true,
      values: [
        { systemKey: 'manual', value: 'manual', label: 'Manual', color: '#3b82f6', isDefault: true },
        { systemKey: 'automated', value: 'automated', label: 'Automated', color: '#22c55e' },
        { systemKey: 'exploratory', value: 'exploratory', label: 'Exploratory', color: '#a855f7' },
        { systemKey: 'regression', value: 'regression', label: 'Regression', color: '#f97316' },
      ],
    },
    {
      name: 'bug_source', isSystem: true,
      values: [
        { systemKey: 'internal', value: 'internal', label: 'Internal', color: '#6b7280', isDefault: true },
        { systemKey: 'jira', value: 'jira', label: 'Jira', color: '#0052cc' },
        { systemKey: 'github', value: 'github', label: 'GitHub', color: '#24292e' },
        { systemKey: 'gitlab', value: 'gitlab', label: 'GitLab', color: '#fc6d26' },
        { systemKey: 'linear', value: 'linear', label: 'Linear', color: '#5e6ad2' },
      ],
    },
    {
      name: 'field_type', isSystem: true,
      values: [
        { systemKey: 'text', value: 'text', label: 'Text', color: '#6b7280', isDefault: true },
        { systemKey: 'number', value: 'number', label: 'Number', color: '#3b82f6' },
        { systemKey: 'date', value: 'date', label: 'Date', color: '#22c55e' },
        { systemKey: 'select', value: 'select', label: 'Select', color: '#a855f7' },
        { systemKey: 'multi_select', value: 'multi_select', label: 'Multi Select', color: '#f97316' },
        { systemKey: 'user', value: 'user', label: 'User', color: '#ec4899' },
        { systemKey: 'boolean', value: 'boolean', label: 'Boolean', color: '#f59e0b' },
        { systemKey: 'url', value: 'url', label: 'URL', color: '#06b6d4' },
      ],
    },
    {
      name: 'integration_type', isSystem: true,
      values: [
        { systemKey: 'jira', value: 'jira', label: 'Jira', color: '#0052cc' },
        { systemKey: 'github', value: 'github', label: 'GitHub', color: '#24292e' },
        { systemKey: 'gitlab', value: 'gitlab', label: 'GitLab', color: '#fc6d26' },
        { systemKey: 'jenkins', value: 'jenkins', label: 'Jenkins', color: '#d33833' },
        { systemKey: 'github_actions', value: 'github_actions', label: 'GitHub Actions', color: '#2088ff' },
      ],
    },
  ]

  for (const et of enumSeed) {
    const enumType = await prisma.enumType.upsert({
      where: { name: et.name },
      create: { name: et.name, isSystem: et.isSystem },
      update: {},
    })
    for (let i = 0; i < et.values.length; i++) {
      const v = et.values[i]
      await prisma.enumValue.upsert({
        where: { id: `seed-${et.name}-${v.systemKey}` },
        create: {
          id: `seed-${et.name}-${v.systemKey}`,
          enumTypeId: enumType.id,
          systemKey: v.systemKey,
          value: v.value,
          label: v.label,
          color: v.color,
          orderIndex: i,
          isDefault: (v as any).isDefault ?? false,
          isSystem: true,
        },
        update: { label: v.label, color: v.color, orderIndex: i },
      })
    }
  }

  // ── Roles ─────────────────────────────────────────────────────────────────
  const roles = [
    { id: 'role-admin', name: 'admin', label: 'Admin', color: '#ef4444', isSystem: true },
    { id: 'role-lead', name: 'lead', label: 'Lead', color: '#f97316', isSystem: true },
    { id: 'role-tester', name: 'tester', label: 'Tester', color: '#3b82f6', isSystem: true },
    { id: 'role-viewer', name: 'viewer', label: 'Viewer', color: '#6b7280', isSystem: true },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { label: role.label, color: role.color },
    })
  }

  // ── Permissions ───────────────────────────────────────────────────────────
  const resources = ['project', 'test_plan', 'test_suite', 'test_case', 'execution',
    'bug', 'user', 'report', 'integration', 'custom_field', 'enum',
    'role', 'attachment']
  const actions = ['create', 'read', 'update', 'delete', 'execute', 'export', 'import',
    'manage_members', 'manage_settings']

  const permMatrix: Array<{ resource: string; action: string; label: string }> = []
  for (const resource of resources) {
    for (const action of actions) {
      permMatrix.push({
        resource,
        action,
        label: `${action.replace('_', ' ')} ${resource.replace('_', ' ')}`,
      })
    }
  }

  for (const perm of permMatrix) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      create: perm,
      update: { label: perm.label },
    })
  }

  // Grant admin all permissions
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } })
  const leadRole = await prisma.role.findUniqueOrThrow({ where: { name: 'lead' } })
  const testerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'tester' } })
  const allPerms = await prisma.permission.findMany()

  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    })
  }

  // Lead gets most permissions except role management
  const leadPerms = allPerms.filter(p => !p.label.includes('role'))
  for (const perm of leadPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: leadRole.id, permissionId: perm.id } },
      create: { roleId: leadRole.id, permissionId: perm.id },
      update: {},
    })
  }

  // Tester gets read, create, execute
  const testerPerms = allPerms.filter(p =>
    ['read', 'create', 'execute', 'export'].includes(p.action) &&
    !['role', 'user', 'integration', 'custom_field', 'enum'].includes(p.resource)
  )
  for (const perm of testerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: testerRole.id, permissionId: perm.id } },
      create: { roleId: testerRole.id, permissionId: perm.id },
      update: {},
    })
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@qauthority.com'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Changeme123!'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'Admin User',
      roleId: adminRole.id,
      passwordHash,
      emailVerified: true,
      forcePasswordChange: true,
    },
    update: {},
  })

  // Create additional test users
  const testUsers = [
    { email: 'lead@qauthority.com', name: 'Test Lead', roleId: leadRole.id },
    { email: 'tester@qauthority.com', name: 'QA Tester', roleId: testerRole.id },
    { email: 'viewer@qauthority.com', name: 'Viewer User', roleId: testerRole.id },
  ]

  const createdUsers: typeof admin[] = [admin]
  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      create: {
        ...userData,
        passwordHash,
        emailVerified: true,
        forcePasswordChange: false,
      },
      update: {},
    })
    createdUsers.push(user)
  }

  // ── Global Tags ─────────────────────────────────────────────────────────────
  const globalTags = [
    { name: 'automated', color: '#22c55e' },
    { name: 'smoke', color: '#ef4444' },
    { name: 'regression', color: '#f97316' },
    { name: 'e2e', color: '#3b82f6' },
    { name: 'api', color: '#8b5cf6' },
    { name: 'flaky', color: '#eab308' },
    { name: 'blocked', color: '#6b7280' },
  ]

  for (const tag of globalTags) {
    const existing = await prisma.tag.findFirst({
      where: { name: tag.name, projectId: undefined },
    })
    if (!existing) {
      await prisma.tag.create({
        data: { name: tag.name, color: tag.color },
      })
    } else if (existing.color !== tag.color) {
      await prisma.tag.update({
        where: { id: existing.id },
        data: { color: tag.color },
      })
    }
  }

  // ── Environment Tags ────────────────────────────────────────────────────────
  const envTags = [
    { name: 'chrome', color: '#4285f4' },
    { name: 'firefox', color: '#ff7139' },
    { name: 'safari', color: '#000000' },
    { name: 'mobile', color: '#a855f7' },
    { name: 'ci', color: '#06b6d4' },
    { name: 'local', color: '#22c55e' },
  ]

  for (const tag of envTags) {
    const existing = await prisma.tag.findFirst({
      where: { name: tag.name, projectId: undefined },
    })
    if (!existing) {
      await prisma.tag.create({
        data: { name: tag.name, color: tag.color },
      })
    } else if (existing.color !== tag.color) {
      await prisma.tag.update({
        where: { id: existing.id },
        data: { color: tag.color },
      })
    }
  }

  // ── Projects ───────────────────────────────────────────────────────────────
  const projects = [
    {
      id: 'proj-webapp',
      name: 'Web Application',
      slug: 'web-app',
      description: 'Main web application for the platform',
    },
    {
      id: 'proj-mobile',
      name: 'Mobile App',
      slug: 'mobile-app',
      description: 'iOS and Android mobile applications',
    },
    {
      id: 'proj-api',
      name: 'API Services',
      slug: 'api-services',
      description: 'Backend REST API and microservices',
    },
  ]

  for (const proj of projects) {
    await prisma.project.upsert({
      where: { id: proj.id },
      create: {
        id: proj.id,
        name: proj.name,
        slug: proj.slug,
        description: proj.description,
        createdById: admin.id,
      },
      update: { name: proj.name, description: proj.description },
    })

    // Add all users as members of each project
    for (const user of createdUsers) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: proj.id, userId: user.id },
        },
        create: {
          projectId: proj.id,
          userId: user.id,
          roleId: user.roleId,
        },
        update: { roleId: user.roleId },
      })
    }

    // Create project-specific tags
    const projectTags = [
      { name: `${proj.slug}-critical`, color: '#ef4444' },
      { name: `${proj.slug}-feature`, color: '#3b82f6' },
    ]
    for (const tag of projectTags) {
      await prisma.tag.upsert({
        where: { name_projectId: { name: tag.name, projectId: proj.id } },
        create: { name: tag.name, color: tag.color, projectId: proj.id },
        update: { color: tag.color },
      })
    }
  }

  // ── Test Plans ──────────────────────────────────────────────────────────────
  const statusActive = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_plan_status-active' } })
  const statusDraft = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_plan_status-draft' } })
  const statusCompleted = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_plan_status-completed' } })

  const testPlans = [
    // Web App Plans
    { id: 'plan-webauth', name: 'Authentication Tests', description: 'Login, logout, registration and password recovery flows', projectId: 'proj-webapp', statusId: statusActive.id },
    { id: 'plan-webui', name: 'UI Regression Suite', description: 'Critical UI flows smoke test', projectId: 'proj-webapp', statusId: statusActive.id },
    { id: 'plan-webpay', name: 'Payment Flow Tests', description: 'Payment processing and checkout scenarios', projectId: 'proj-webapp', statusId: statusDraft.id },

    // Mobile Plans
    { id: 'plan-mobileios', name: 'iOS Tests', description: 'iOS-specific functionality tests', projectId: 'proj-mobile', statusId: statusActive.id },
    { id: 'plan-mobileandroid', name: 'Android Tests', description: 'Android-specific functionality tests', projectId: 'proj-mobile', statusId: statusActive.id },

    // API Plans
    { id: 'plan-apiv1', name: 'API v1 Regression', description: 'Regression tests for API v1 endpoints', projectId: 'proj-api', statusId: statusActive.id },
    { id: 'plan-apiv2', name: 'API v2 Beta', description: 'New endpoints and breaking changes in v2', projectId: 'proj-api', statusId: statusDraft.id },
  ]

  for (const plan of testPlans) {
    await prisma.testPlan.upsert({
      where: { id: plan.id },
      create: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        projectId: plan.projectId,
        statusId: plan.statusId,
        createdById: admin.id,
      },
      update: { name: plan.name, description: plan.description, statusId: plan.statusId },
    })
  }

  // ── Test Suites ────────────────────────────────────────────────────────────
  const testSuites = [
    // Authentication Suites
    { id: 'suite-webauth-login', name: 'Login Tests', description: 'Login form validation and authentication', testPlanId: 'plan-webauth' },
    { id: 'suite-webauth-pass', name: 'Password Management', description: 'Password reset and change flows', testPlanId: 'plan-webauth' },
    { id: 'suite-webauth-sess', name: 'Session Management', description: 'Session timeout and concurrent login handling', testPlanId: 'plan-webauth' },

    // UI Regression Suites
    { id: 'suite-webui-nav', name: 'Navigation', description: 'Main navigation and routing tests', testPlanId: 'plan-webui' },
    { id: 'suite-webui-forms', name: 'Forms', description: 'Form validation and submission tests', testPlanId: 'plan-webui' },
    { id: 'suite-webui-dash', name: 'Dashboard', description: 'Dashboard widgets and data display', testPlanId: 'plan-webui' },

    // Payment Suites
    { id: 'suite-webpay-checkout', name: 'Checkout Flow', description: 'Complete checkout process tests', testPlanId: 'plan-webpay' },
    { id: 'suite-webpay-cards', name: 'Card Payments', description: 'Credit card validation and processing', testPlanId: 'plan-webpay' },

    // Mobile Suites
    { id: 'suite-mobileios-nav', name: 'iOS Navigation', description: 'iOS-specific navigation patterns', testPlanId: 'plan-mobileios' },
    { id: 'suite-mobileios-perf', name: 'Performance', description: 'iOS app performance benchmarks', testPlanId: 'plan-mobileios' },

    // API Suites
    { id: 'suite-apiv1-users', name: 'Users Endpoint', description: 'User CRUD operations', testPlanId: 'plan-apiv1' },
    { id: 'suite-apiv1-proj', name: 'Projects Endpoint', description: 'Project management API', testPlanId: 'plan-apiv1' },
    { id: 'suite-apiv1-auth', name: 'Auth Endpoint', description: 'Authentication and authorization', testPlanId: 'plan-apiv1' },
  ]

  for (const suite of testSuites) {
    await prisma.testSuite.upsert({
      where: { id: suite.id },
      create: {
        id: suite.id,
        name: suite.name,
        description: suite.description,
        testPlanId: suite.testPlanId,
        createdById: admin.id,
        orderIndex: testSuites.filter(s => s.testPlanId === suite.testPlanId).indexOf(suite),
      },
      update: { name: suite.name, description: suite.description },
    })

    // Add tester as suite assignee
    const testerUser = createdUsers.find(u => u.email === 'tester@qauthority.com')
    if (testerUser) {
      await prisma.testSuiteAssignee.upsert({
        where: { suiteId_userId: { suiteId: suite.id, userId: testerUser.id } },
        create: { suiteId: suite.id, userId: testerUser.id },
        update: {},
      })
    }
  }

  // ── Test Cases ──────────────────────────────────────────────────────────────
  const priorityHigh = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-high' } })
  const priorityMedium = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-medium' } })
  const priorityLow = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-low' } })
  const priorityCritical = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-critical' } })

  const typeManual = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_type-manual' } })
  const typeAutomated = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_type-automated' } })

  const testCases = [
    // Login Tests
    { id: 'tc-login-001', title: 'Verify login with valid credentials', suiteId: 'suite-webauth-login', priorityId: priorityCritical.id, typeId: typeManual.id },
    { id: 'tc-login-002', title: 'Verify login fails with wrong password', suiteId: 'suite-webauth-login', priorityId: priorityHigh.id, typeId: typeManual.id },
    { id: 'tc-login-003', title: 'Verify login fails with non-existent user', suiteId: 'suite-webauth-login', priorityId: priorityHigh.id, typeId: typeManual.id },
    { id: 'tc-login-004', title: 'Verify "Remember me" checkbox persists session', suiteId: 'suite-webauth-login', priorityId: priorityMedium.id, typeId: typeManual.id },
    { id: 'tc-login-005', title: 'Verify login with SSO provider (Google)', suiteId: 'suite-webauth-login', priorityId: priorityHigh.id, typeId: typeManual.id },

    // Password Management
    { id: 'tc-pass-001', title: 'Verify password reset flow with valid email', suiteId: 'suite-webauth-pass', priorityId: priorityHigh.id, typeId: typeManual.id },
    { id: 'tc-pass-002', title: 'Verify password reset with non-registered email', suiteId: 'suite-webauth-pass', priorityId: priorityMedium.id, typeId: typeManual.id },
    { id: 'tc-pass-003', title: 'Verify password change requires current password', suiteId: 'suite-webauth-pass', priorityId: priorityHigh.id, typeId: typeManual.id },
    { id: 'tc-pass-004', title: 'Verify new password meets complexity requirements', suiteId: 'suite-webauth-pass', priorityId: priorityMedium.id, typeId: typeManual.id },

    // Navigation
    { id: 'tc-nav-001', title: 'Verify sidebar navigation collapses on mobile', suiteId: 'suite-webui-nav', priorityId: priorityMedium.id, typeId: typeManual.id },
    { id: 'tc-nav-002', title: 'Verify breadcrumb navigation is accurate', suiteId: 'suite-webui-nav', priorityId: priorityLow.id, typeId: typeManual.id },
    { id: 'tc-nav-003', title: 'Verify browser back button works correctly', suiteId: 'suite-webui-nav', priorityId: priorityMedium.id, typeId: typeManual.id },

    // API Tests
    { id: 'tc-api-users-001', title: 'GET /users returns paginated list', suiteId: 'suite-apiv1-users', priorityId: priorityHigh.id, typeId: typeAutomated.id },
    { id: 'tc-api-users-002', title: 'POST /users creates new user', suiteId: 'suite-apiv1-users', priorityId: priorityHigh.id, typeId: typeAutomated.id },
    { id: 'tc-api-users-003', title: 'PUT /users/:id updates user data', suiteId: 'suite-apiv1-users', priorityId: priorityHigh.id, typeId: typeAutomated.id },
    { id: 'tc-api-users-004', title: 'DELETE /users/:id soft deletes user', suiteId: 'suite-apiv1-users', priorityId: priorityHigh.id, typeId: typeAutomated.id },
    { id: 'tc-api-auth-001', title: 'POST /auth/login returns JWT token', suiteId: 'suite-apiv1-auth', priorityId: priorityCritical.id, typeId: typeAutomated.id },
    { id: 'tc-api-auth-002', title: 'POST /auth/refresh extends token expiry', suiteId: 'suite-apiv1-auth', priorityId: priorityHigh.id, typeId: typeAutomated.id },
  ]

  for (const tc of testCases) {
    const existing = await prisma.testCase.findUnique({ where: { id: tc.id } })
    if (!existing) {
      await prisma.testCase.create({
        data: {
          id: tc.id,
          title: tc.title,
          suiteId: tc.suiteId,
          priorityId: tc.priorityId,
          typeId: tc.typeId,
          createdById: admin.id,
          preconditions: 'User must be registered in the system',
          steps: JSON.stringify([
            { order: 1, action: 'Navigate to login page', expectedResult: 'Login form is displayed' },
            { order: 2, action: 'Enter valid credentials', expectedResult: 'Credentials are accepted' },
            { order: 3, action: 'Click login button', expectedResult: 'User is redirected to dashboard' },
          ]),
        },
      })
    }

    // Add some test cases as assigned to tester
    const testerUser = createdUsers.find(u => u.email === 'tester@qauthority.com')
    if (testerUser && Math.random() > 0.5) {
      await prisma.testCaseAssignee.upsert({
        where: { testCaseId_userId: { testCaseId: tc.id, userId: testerUser.id } },
        create: { testCaseId: tc.id, userId: testerUser.id },
        update: {},
      })
    }
  }

  // ── Test Executions ────────────────────────────────────────────────────────
  const testerUser = createdUsers.find(u => u.email === 'tester@qauthority.com')
  const leadUser = createdUsers.find(u => u.email === 'lead@qauthority.com')

  const statusPass = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-pass' } })
  const statusFail = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-fail' } })
  const statusBlocked = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-blocked' } })
  const statusNotRun = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-not_run' } })

  const executions = [
    { id: 'exec-001', testCaseId: 'tc-login-001', testPlanId: 'plan-webauth', statusId: statusPass.id, executedById: admin.id, durationMs: 12500, environment: 'staging', platform: 'Chrome' },
    { id: 'exec-002', testCaseId: 'tc-login-002', testPlanId: 'plan-webauth', statusId: statusPass.id, executedById: admin.id, durationMs: 8200, environment: 'staging', platform: 'Firefox' },
    { id: 'exec-003', testCaseId: 'tc-login-003', testPlanId: 'plan-webauth', statusId: statusPass.id, executedById: testerUser?.id || admin.id, durationMs: 6500, environment: 'staging', platform: 'Safari' },
    { id: 'exec-004', testCaseId: 'tc-pass-001', testPlanId: 'plan-webauth', statusId: statusFail.id, executedById: admin.id, durationMs: 15000, environment: 'staging', platform: 'Chrome', notes: 'Email not received - check SMTP configuration' },
    { id: 'exec-005', testCaseId: 'tc-pass-002', testPlanId: 'plan-webauth', statusId: statusPass.id, executedById: admin.id, durationMs: 9800, environment: 'staging', platform: 'Chrome' },
    { id: 'exec-006', testCaseId: 'tc-api-users-001', testPlanId: 'plan-apiv1', statusId: statusPass.id, executedById: admin.id, durationMs: 2500, environment: 'staging', platform: 'Postman' },
    { id: 'exec-007', testCaseId: 'tc-api-users-002', testPlanId: 'plan-apiv1', statusId: statusPass.id, executedById: admin.id, durationMs: 3200, environment: 'staging', platform: 'Postman' },
    { id: 'exec-008', testCaseId: 'tc-api-users-003', testPlanId: 'plan-apiv1', statusId: statusBlocked.id, executedById: admin.id, durationMs: 0, environment: 'staging', platform: 'Postman', notes: 'Blocked by dependency on user creation flow' },
    { id: 'exec-009', testCaseId: 'tc-api-auth-001', testPlanId: 'plan-apiv1', statusId: statusPass.id, executedById: admin.id, durationMs: 1800, environment: 'staging', platform: 'Postman' },
    { id: 'exec-010', testCaseId: 'tc-api-auth-002', testPlanId: 'plan-apiv1', statusId: statusPass.id, executedById: admin.id, durationMs: 1500, environment: 'staging', platform: 'Postman' },
    { id: 'exec-011', testCaseId: 'tc-nav-001', testPlanId: 'plan-webui', statusId: statusPass.id, executedById: testerUser?.id || admin.id, durationMs: 8500, environment: 'staging', platform: 'Chrome' },
    { id: 'exec-012', testCaseId: 'tc-nav-002', testPlanId: 'plan-webui', statusId: statusNotRun.id, executedById: admin.id, durationMs: 0, environment: 'staging', platform: 'Chrome' },
  ]

  for (const exec of executions) {
    const executorId = exec.executedById || admin.id
    await prisma.testExecution.upsert({
      where: { id: exec.id },
      create: {
        id: exec.id,
        testCaseId: exec.testCaseId,
        testPlanId: exec.testPlanId,
        statusId: exec.statusId,
        executedById: executorId,
        durationMs: exec.durationMs,
        notes: exec.notes,
        environment: exec.environment,
        platform: exec.platform,
      },
      update: { statusId: exec.statusId },
    })
  }

  // ── Bugs ───────────────────────────────────────────────────────────────────
  const bugStatusOpen = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_status-open' } })
  const bugStatusInProgress = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_status-in_progress' } })
  const bugStatusResolved = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_status-resolved' } })
  const bugPriorityHigh = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_priority-high' } })
  const bugPriorityMedium = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_priority-medium' } })
  const bugSeverityMajor = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_severity-major' } })
  const bugSeverityMinor = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_severity-minor' } })
  const bugSourceInternal = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_source-internal' } })

  const bugs = [
    {
      id: 'bug-001',
      title: 'Password reset email not sent',
      description: 'Users requesting password reset do not receive the email',
      statusId: bugStatusOpen.id,
      priorityId: bugPriorityHigh.id,
      severityId: bugSeverityMajor.id,
      sourceId: bugSourceInternal.id,
      projectId: 'proj-webapp',
      reportedById: admin.id,
      assignedToId: leadUser?.id,
    },
    {
      id: 'bug-002',
      title: 'Login form shows validation error on valid input',
      description: 'The login form incorrectly shows an error when entering valid email format',
      statusId: bugStatusInProgress.id,
      priorityId: bugPriorityHigh.id,
      severityId: bugSeverityMajor.id,
      sourceId: bugSourceInternal.id,
      projectId: 'proj-webapp',
      reportedById: testerUser?.id || admin.id,
      assignedToId: leadUser?.id,
    },
    {
      id: 'bug-003',
      title: 'API returns 500 on concurrent user updates',
      description: 'Race condition when multiple users update the same resource',
      statusId: bugStatusResolved.id,
      priorityId: bugPriorityMedium.id,
      severityId: bugSeverityMinor.id,
      sourceId: bugSourceInternal.id,
      projectId: 'proj-api',
      reportedById: admin.id,
      assignedToId: null,
    },
  ]

  for (const bug of bugs) {
    await prisma.defect.upsert({
      where: { id: bug.id },
      create: {
        id: bug.id,
        title: bug.title,
        description: bug.description,
        statusId: bug.statusId,
        priorityId: bug.priorityId,
        severityId: bug.severityId,
        sourceId: bug.sourceId,
        projectId: bug.projectId,
        reportedById: bug.reportedById,
        assignedToId: bug.assignedToId,
      },
      update: { statusId: bug.statusId },
    })

    // Link some bugs to executions
    if (bug.id === 'bug-001') {
      await prisma.bugTestExecution.upsert({
        where: { bugId_executionId: { bugId: bug.id, executionId: 'exec-004' } },
        create: { bugId: bug.id, executionId: 'exec-004' },
        update: {},
      })
    }
  }

  await seedGroups(prisma)

  console.log('Seed completed successfully!')
  console.log(`Created ${projects.length} projects`)
  console.log(`Created ${testPlans.length} test plans`)
  console.log(`Created ${testSuites.length} test suites`)
  console.log(`Created ${testCases.length} test cases`)
  console.log(`Created ${executions.length} test executions`)
  console.log(`Created ${bugs.length} bugs`)
  console.log(`Created ${createdUsers.length} users`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
