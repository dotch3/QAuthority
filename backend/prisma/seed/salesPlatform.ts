/**
 * Seed: Online Sales Platform
 *
 * A complete demo project with:
 *  - 4 test suites: UI (acceptance + smoke + negative), API (acceptance + negative + security/attack)
 *  - 30+ richly described test cases with steps, versions, assignees
 *  - Execution history (passed, failed, blocked) per case
 *  - Test case versioning records
 *  - 6 bugs linked to failed executions
 *  - 4 ET Charters (in English) with missions, heuristics, bugs, opportunities
 *  - Test runs with progress
 */

import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'

const prisma = new PrismaClient()

export async function seedSalesPlatform() {
  // ── Resolve seed references ──────────────────────────────────────────────────
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@qauthority.com' } })
  const lead  = await prisma.user.findFirst({ where: { email: 'lead@qauthority.com' } }) ?? admin
  const tester = await prisma.user.findFirst({ where: { email: 'tester@qauthority.com' } }) ?? admin

  const statusActive    = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_plan_status-active' } })
  const statusCompleted = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_plan_status-completed' } })

  const prioCritical = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-critical' } })
  const prioHigh     = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-high' } })
  const prioMedium   = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-medium' } })
  const prioLow      = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_priority-low' } })

  const typeManual      = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_type-manual' } })
  const typeAutomated   = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_type-automated' } })
  const typeExploratory = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_type-exploratory' } })
  const typeRegression  = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-test_type-regression' } })

  const execPass    = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-pass' } })
  const execFail    = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-fail' } })
  const execBlocked = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-execution_status-blocked' } })

  const bugStatusOpen       = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_status-open' } })
  const bugStatusInProgress = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_status-in_progress' } })
  const bugStatusResolved   = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_status-resolved' } })

  const bugPrioCritical = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_priority-critical' } })
  const bugPrioHigh     = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_priority-high' } })
  const bugPrioMedium   = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_priority-medium' } })

  const bugSevBlocker  = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_severity-blocker' } })
  const bugSevCritical = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_severity-critical' } })
  const bugSevMajor    = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_severity-major' } })
  const bugSevMinor    = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_severity-minor' } })

  const bugSourceInternal = await prisma.enumValue.findUniqueOrThrow({ where: { id: 'seed-bug_source-internal' } })

  // ── Clean up previous seed data for this project ─────────────────────────────
  const existing = await prisma.project.findUnique({ where: { id: 'proj-sales' } })
  if (existing) {
    // Remove in reverse dependency order
    await prisma.testRunCase.deleteMany({ where: { testRun: { projectId: 'proj-sales' } } })
    await prisma.testRun.deleteMany({ where: { projectId: 'proj-sales' } })
    await prisma.testExecution.deleteMany({ where: { testCase: { suite: { testPlan: { projectId: 'proj-sales' } } } } })
    await prisma.testCaseAssignee.deleteMany({ where: { testCase: { suite: { testPlan: { projectId: 'proj-sales' } } } } })
    await prisma.testCaseVersion.deleteMany({ where: { testCase: { suite: { testPlan: { projectId: 'proj-sales' } } } } })
    await prisma.testCase.deleteMany({ where: { suite: { testPlan: { projectId: 'proj-sales' } } } })
    await prisma.testSuite.deleteMany({ where: { testPlan: { projectId: 'proj-sales' } } })
    await prisma.testPlan.deleteMany({ where: { projectId: 'proj-sales' } })
    await prisma.eTCharter.deleteMany({ where: { id: { startsWith: 'etc-sales-' } } })
    await prisma.defect.deleteMany({ where: { id: { startsWith: 'bug-sales-' } } })
    await prisma.workflowEdge.deleteMany({ where: { workflow: { projectId: 'proj-sales' } } })
    await prisma.workflowBlock.deleteMany({ where: { workflow: { projectId: 'proj-sales' } } })
    await prisma.qAWorkflow.deleteMany({ where: { projectId: 'proj-sales' } })
    await prisma.project.delete({ where: { id: 'proj-sales' } })
  }

  // ── Project ───────────────────────────────────────────────────────────────────
  const project = await prisma.project.create({
    data: {
      id: 'proj-sales',
      name: 'Online Sales Platform',
      slug: 'online-sales',
      description: 'E-commerce platform covering product catalog, cart, checkout, payment, order management, and customer portal.',
      createdById: admin.id,
    },
  })

  // Add members
  for (const user of [admin, lead, tester]) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      create: { projectId: project.id, userId: user.id, roleId: user.roleId },
      update: {},
    })
  }

  // ── Test Plans ────────────────────────────────────────────────────────────────
  const planUI = await prisma.testPlan.create({
    data: {
      id: 'plan-sales-ui',
      name: 'UI & E2E Test Plan — v1.0',
      description: 'End-to-end and acceptance tests for the buyer-facing web interface. Covers product search, cart, checkout, and account management.',
      projectId: project.id,
      statusId: statusActive.id,
      createdById: admin.id,
    },
  })

  const planAPI = await prisma.testPlan.create({
    data: {
      id: 'plan-sales-api',
      name: 'API Test Plan — v1.0',
      description: 'Contract and functional tests for all REST API endpoints: catalog, cart, orders, payments, and authentication.',
      projectId: project.id,
      statusId: statusActive.id,
      createdById: admin.id,
    },
  })

  // ── Test Suites ───────────────────────────────────────────────────────────────
  const suiteUIAcceptance = await prisma.testSuite.create({
    data: {
      id: 'suite-sales-ui-acc',
      name: 'UI – Acceptance & Smoke',
      description: 'Critical user journeys that must pass before any release: product discovery, cart management, and full checkout flow.',
      testPlanId: planUI.id,
      orderIndex: 0,
      createdById: admin.id,
    },
  })

  const suiteUINegative = await prisma.testSuite.create({
    data: {
      id: 'suite-sales-ui-neg',
      name: 'UI – Negative & Boundary',
      description: 'Invalid inputs, boundary conditions, and error handling at the UI layer. Out-of-stock scenarios, expired sessions, invalid coupons.',
      testPlanId: planUI.id,
      orderIndex: 1,
      createdById: admin.id,
    },
  })

  const suiteAPIAcceptance = await prisma.testSuite.create({
    data: {
      id: 'suite-sales-api-acc',
      name: 'API – Acceptance & Contract',
      description: 'Endpoint contract tests: request/response schemas, HTTP status codes, pagination, filtering, and data integrity.',
      testPlanId: planAPI.id,
      orderIndex: 0,
      createdById: admin.id,
    },
  })

  const suiteAPISecurity = await prisma.testSuite.create({
    data: {
      id: 'suite-sales-api-sec',
      name: 'API – Security & Attack',
      description: 'OWASP Top 10 checks, injection attacks, auth bypass, privilege escalation, rate limiting, and data exposure tests.',
      testPlanId: planAPI.id,
      orderIndex: 1,
      createdById: admin.id,
    },
  })

  // Assign suites
  await prisma.testSuiteAssignee.createMany({
    data: [
      { suiteId: suiteUIAcceptance.id, userId: lead.id },
      { suiteId: suiteUINegative.id,   userId: tester.id },
      { suiteId: suiteAPIAcceptance.id, userId: lead.id },
      { suiteId: suiteAPISecurity.id,  userId: tester.id },
    ],
    skipDuplicates: true,
  })

  // ── Helper to create a case with version history ──────────────────────────────
  async function createCase(opts: {
    id: string
    suiteId: string
    title: string
    description?: string
    preconditions?: string
    steps: Array<{ order: number; action: string; expectedResult: string }>
    priorityId: string
    typeId: string
    externalId: string
    assigneeId?: string
    versions: number // how many version iterations to simulate (min 1 = v1.1)
  }) {
    const { versions, assigneeId, ...caseData } = opts

    // currentVersion reflects edits: created=1, each update increments
    const tc = await prisma.testCase.create({
      data: {
        id: caseData.id,
        suiteId: caseData.suiteId,
        title: caseData.title,
        description: caseData.description,
        preconditions: caseData.preconditions,
        steps: caseData.steps as any,
        priorityId: caseData.priorityId,
        typeId: caseData.typeId,
        externalId: caseData.externalId,
        createdById: admin.id,
        currentVersion: versions, // v1.1 = 1, v1.2 = 2, etc.
      },
    })

    // Seed version records (v1.1 … v1.N)
    for (let v = 1; v <= versions; v++) {
      await prisma.testCaseVersion.create({
        data: {
          testCaseId: tc.id,
          version: v,
          title: v === versions ? caseData.title : `${caseData.title} (v1.${v} draft)`,
          description: caseData.description ?? null,
          preconditions: caseData.preconditions ?? null,
          steps: caseData.steps as any,
          priorityId: caseData.priorityId,
          typeId: caseData.typeId,
          createdById: v === 1 ? admin.id : (v % 2 === 0 ? lead.id : tester.id),
          createdAt: new Date(Date.now() - (versions - v) * 2 * 24 * 60 * 60 * 1000),
        },
      })
    }

    if (assigneeId) {
      await prisma.testCaseAssignee.create({ data: { testCaseId: tc.id, userId: assigneeId } })
    }

    return tc
  }

  // ── UI Acceptance & Smoke test cases ─────────────────────────────────────────
  const tcProductSearch = await createCase({
    id: 'tc-sales-ui-001', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0001',
    title: 'User can search for a product by name and see relevant results',
    description: 'Verify the search bar returns accurate results matching the query string.',
    preconditions: 'At least 10 products seeded in the catalog. User is on the home page.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 3,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Navigate to homepage', expectedResult: 'Homepage loads within 2 seconds' },
      { order: 2, action: 'Type "running shoes" in the search bar', expectedResult: 'Autocomplete suggestions appear' },
      { order: 3, action: 'Press Enter or click Search', expectedResult: 'Results page shows products matching "running shoes"' },
      { order: 4, action: 'Verify result count badge in header', expectedResult: 'Badge shows a number > 0' },
      { order: 5, action: 'Click on the first product result', expectedResult: 'Product detail page opens' },
    ],
  })

  const tcAddToCart = await createCase({
    id: 'tc-sales-ui-002', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0002',
    title: 'User can add a product to cart and cart count updates',
    description: 'Smoke test: cart icon counter increments and item persists on page reload.',
    preconditions: 'User is logged in. Product is in stock.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Open any product detail page', expectedResult: 'Product page loads with Add to Cart button enabled' },
      { order: 2, action: 'Click "Add to Cart"', expectedResult: 'Cart icon counter increments from 0 to 1. Toast notification appears.' },
      { order: 3, action: 'Reload the page', expectedResult: 'Cart counter still shows 1' },
      { order: 4, action: 'Open cart drawer', expectedResult: 'Added product is listed with correct price and quantity' },
    ],
  })

  const tcCheckoutComplete = await createCase({
    id: 'tc-sales-ui-003', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0003',
    title: 'User completes checkout end-to-end and receives order confirmation',
    description: 'Critical acceptance test: full checkout journey from cart to order confirmation email.',
    preconditions: 'User logged in. Product in cart. Test credit card 4242-4242-4242-4242 available.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 4,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Open cart with 1 product', expectedResult: 'Cart shows correct subtotal' },
      { order: 2, action: 'Click "Proceed to Checkout"', expectedResult: 'Checkout page loads with shipping form' },
      { order: 3, action: 'Fill shipping address: Rua das Flores, 123, São Paulo, SP 01310-100', expectedResult: 'Form accepts address; estimated delivery date shown' },
      { order: 4, action: 'Select "Standard Shipping"', expectedResult: 'Shipping cost added to total. Order summary updated.' },
      { order: 5, action: 'Enter card 4242-4242-4242-4242 exp 12/26 CVV 123', expectedResult: 'Card validated; pay button enabled' },
      { order: 6, action: 'Click "Place Order"', expectedResult: 'Success page with order number. Confirmation email received within 2 minutes.' },
    ],
  })

  const tcHomepageLoads = await createCase({
    id: 'tc-sales-ui-004', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0004',
    title: 'Homepage loads with featured products within 3 seconds (smoke)',
    description: 'Smoke test ensuring the entry point is operational.',
    preconditions: 'Network connection available. No VPN.',
    priorityId: prioMedium.id, typeId: typeManual.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Navigate to https://shop.plataforma.com', expectedResult: 'Page loads within 3 seconds' },
      { order: 2, action: 'Verify featured products section is visible', expectedResult: 'At least 4 product cards shown' },
      { order: 3, action: 'Verify header has logo, search bar, and cart icon', expectedResult: 'All three elements visible' },
    ],
  })

  const tcUserLogin = await createCase({
    id: 'tc-sales-ui-005', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0005',
    title: 'Registered user can log in and access account dashboard',
    description: 'Acceptance test for authentication entry point.',
    preconditions: 'User registered with email user@demo.com password Demo@1234.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Click "Sign In" in the header', expectedResult: 'Login modal or page appears' },
      { order: 2, action: 'Enter email user@demo.com and password Demo@1234', expectedResult: 'Fields accept input' },
      { order: 3, action: 'Click "Log In"', expectedResult: 'Redirect to account dashboard. Welcome message shows user\'s first name.' },
      { order: 4, action: 'Verify order history section visible', expectedResult: 'Order history section loads (may be empty)' },
    ],
  })

  const tcProductFilter = await createCase({
    id: 'tc-sales-ui-006', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0006',
    title: 'Product listing can be filtered by category and price range',
    description: 'Acceptance: filter controls narrow results correctly.',
    preconditions: 'User is on a category page with 20+ products.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 2,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Open "Footwear" category page', expectedResult: 'All footwear products listed' },
      { order: 2, action: 'Set price range filter R$100 – R$300', expectedResult: 'Product list updates to show only products in range' },
      { order: 3, action: 'Select "Running" sub-category', expectedResult: 'Products further filtered to Running footwear' },
      { order: 4, action: 'Sort by "Lowest Price"', expectedResult: 'Products sorted ascending by price' },
    ],
  })

  const tcApplyCoupon = await createCase({
    id: 'tc-sales-ui-007', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0007',
    title: 'Valid coupon code applies discount to cart total',
    description: 'Acceptance for promotional discount feature.',
    preconditions: 'Coupon DEMO20 active with 20% off for orders over R$100.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 3,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Add product over R$100 to cart', expectedResult: 'Cart total > R$100' },
      { order: 2, action: 'Open cart and enter coupon code DEMO20', expectedResult: 'Green confirmation: "20% discount applied"' },
      { order: 3, action: 'Verify new total is 80% of original', expectedResult: 'Total matches calculation. Discount line item shown.' },
      { order: 4, action: 'Proceed to checkout', expectedResult: 'Discounted total carries over to checkout summary' },
    ],
  })

  const tcGuestCheckout = await createCase({
    id: 'tc-sales-ui-008', suiteId: suiteUIAcceptance.id,
    externalId: 'TC-PVO-0008',
    title: 'Guest user can checkout without creating an account',
    description: 'Acceptance: guest checkout flow must not require registration.',
    preconditions: 'User is NOT logged in. Product in cart.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 2,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Add product to cart as guest', expectedResult: 'Cart updates without login prompt' },
      { order: 2, action: 'Click "Proceed to Checkout"', expectedResult: 'Option to checkout as guest visible' },
      { order: 3, action: 'Click "Continue as Guest"', expectedResult: 'Email field shown for order confirmation' },
      { order: 4, action: 'Complete checkout with guest email', expectedResult: 'Order confirmation page; email sent to guest' },
    ],
  })

  // ── UI Negative & Boundary test cases ─────────────────────────────────────────
  const tcOutOfStock = await createCase({
    id: 'tc-sales-ui-101', suiteId: suiteUINegative.id,
    externalId: 'TC-PVO-0101',
    title: 'Out-of-stock product shows disabled Add to Cart button',
    description: 'Negative: user cannot add unavailable product.',
    preconditions: 'Product "PROD-OOS-001" has stock = 0.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Navigate to product PROD-OOS-001 detail page', expectedResult: 'Page loads' },
      { order: 2, action: 'Observe "Add to Cart" button state', expectedResult: 'Button is disabled and shows "Out of Stock"' },
      { order: 3, action: 'Try to click the disabled button', expectedResult: 'Nothing happens; no network request made' },
    ],
  })

  const tcExpiredCoupon = await createCase({
    id: 'tc-sales-ui-102', suiteId: suiteUINegative.id,
    externalId: 'TC-PVO-0102',
    title: 'Expired coupon code shows error message and does not apply discount',
    description: 'Negative: expired or invalid coupons rejected gracefully.',
    preconditions: 'Coupon EXPIRED10 expired 30 days ago.',
    priorityId: prioMedium.id, typeId: typeManual.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Add any product to cart', expectedResult: 'Cart has item' },
      { order: 2, action: 'Enter coupon code EXPIRED10', expectedResult: 'Red error: "This coupon has expired"' },
      { order: 3, action: 'Verify cart total unchanged', expectedResult: 'No discount applied' },
    ],
  })

  const tcQuantityBoundary = await createCase({
    id: 'tc-sales-ui-103', suiteId: suiteUINegative.id,
    externalId: 'TC-PVO-0103',
    title: 'Cart rejects quantity exceeding available stock',
    description: 'Boundary test: cannot order more than stock allows.',
    preconditions: 'Product PROD-LTD-002 has stock = 5.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 2,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Add PROD-LTD-002 to cart', expectedResult: 'Added with quantity 1' },
      { order: 2, action: 'Increase quantity to 6 in cart', expectedResult: 'System shows "Maximum available: 5". Quantity capped at 5.' },
      { order: 3, action: 'Try to update quantity to 999 via input field', expectedResult: 'Field resets to 5 with warning message' },
    ],
  })

  const tcSessionExpiry = await createCase({
    id: 'tc-sales-ui-104', suiteId: suiteUINegative.id,
    externalId: 'TC-PVO-0104',
    title: 'Expired session during checkout redirects to login without losing cart',
    description: 'Edge case: session times out mid-checkout.',
    preconditions: 'Session expires in 30 minutes. Cart has 2 items.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Fill in shipping address on checkout page', expectedResult: 'Form filled' },
      { order: 2, action: 'Simulate session expiry (manipulate token or wait)', expectedResult: 'System detects expired session' },
      { order: 3, action: 'Attempt to click "Place Order"', expectedResult: 'Redirect to login page with message "Session expired. Please log in again."' },
      { order: 4, action: 'Log in again', expectedResult: 'Redirected back to checkout with cart intact' },
    ],
  })

  const tcInvalidCreditCard = await createCase({
    id: 'tc-sales-ui-105', suiteId: suiteUINegative.id,
    externalId: 'TC-PVO-0105',
    title: 'Invalid credit card number is rejected with helpful error message',
    description: 'Negative: Luhn algorithm check + gateway rejection.',
    preconditions: 'User on payment step of checkout.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Enter card number 1234-5678-9012-3456 (invalid Luhn)', expectedResult: 'Real-time validation shows "Invalid card number"' },
      { order: 2, action: 'Enter card 4000-0000-0000-0002 (declined by gateway)', expectedResult: 'After submit: "Your card was declined. Contact your bank."' },
      { order: 3, action: 'Verify order was NOT created', expectedResult: 'No order in account history' },
    ],
  })

  const tcXSSInSearchInput = await createCase({
    id: 'tc-sales-ui-106', suiteId: suiteUINegative.id,
    externalId: 'TC-PVO-0106',
    title: 'XSS payload in search input is sanitized and not rendered',
    description: 'Security-oriented UI test: reflected XSS attempt.',
    preconditions: 'None.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Enter <script>alert("xss")</script> in search bar', expectedResult: 'Input accepted but sanitized' },
      { order: 2, action: 'Submit search', expectedResult: 'Results page shows literal search term as text. No alert dialog appears.' },
      { order: 3, action: 'Inspect DOM for raw script tags', expectedResult: 'No unescaped <script> tag found in DOM' },
    ],
  })

  // ── API Acceptance & Contract test cases ──────────────────────────────────────
  const tcAPIGetProducts = await createCase({
    id: 'tc-sales-api-001', suiteId: suiteAPIAcceptance.id,
    externalId: 'TC-PVO-1001',
    title: 'GET /api/v1/products returns paginated catalog with correct schema',
    description: 'Contract test: response must include id, name, price, stock, imageUrl.',
    preconditions: 'API running. At least 10 products in DB.',
    priorityId: prioCritical.id, typeId: typeAutomated.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Call GET /api/v1/products?page=1&limit=10', expectedResult: 'HTTP 200 OK' },
      { order: 2, action: 'Validate response body schema', expectedResult: '{ data: Product[], total: number, page: number, limit: number }' },
      { order: 3, action: 'Verify each product has required fields', expectedResult: 'id (uuid), name (string), price (number), stock (integer), imageUrl (string)' },
      { order: 4, action: 'Verify data.length === 10', expectedResult: 'Exactly 10 items returned' },
    ],
  })

  const tcAPICreateOrder = await createCase({
    id: 'tc-sales-api-002', suiteId: suiteAPIAcceptance.id,
    externalId: 'TC-PVO-1002',
    title: 'POST /api/v1/orders creates order and returns 201 with order ID',
    description: 'Core order creation contract test.',
    preconditions: 'Authenticated user token. Product in stock.',
    priorityId: prioCritical.id, typeId: typeAutomated.id, versions: 3,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'POST /api/v1/orders with valid body: { items: [{productId, quantity}], shippingAddressId }', expectedResult: 'HTTP 201 Created' },
      { order: 2, action: 'Validate response body', expectedResult: '{ orderId: uuid, status: "pending", total: number, estimatedDelivery: date }' },
      { order: 3, action: 'GET /api/v1/orders/{orderId}', expectedResult: 'Order exists with status "pending"' },
      { order: 4, action: 'Verify stock decremented', expectedResult: 'Product stock reduced by ordered quantity' },
    ],
  })

  const tcAPIGetOrderHistory = await createCase({
    id: 'tc-sales-api-003', suiteId: suiteAPIAcceptance.id,
    externalId: 'TC-PVO-1003',
    title: 'GET /api/v1/orders returns only the authenticated user\'s orders',
    description: 'Data isolation test: users must not see other users\' orders.',
    preconditions: 'Two users with separate orders.',
    priorityId: prioCritical.id, typeId: typeAutomated.id, versions: 2,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'Authenticate as User A and GET /api/v1/orders', expectedResult: 'Returns only User A orders' },
      { order: 2, action: 'Authenticate as User B and GET /api/v1/orders', expectedResult: 'Returns only User B orders' },
      { order: 3, action: 'Verify no cross-contamination between results', expectedResult: 'No User A order IDs in User B response and vice versa' },
    ],
  })

  const tcAPICartOperations = await createCase({
    id: 'tc-sales-api-004', suiteId: suiteAPIAcceptance.id,
    externalId: 'TC-PVO-1004',
    title: 'Cart API supports add, update quantity, and remove item operations',
    description: 'Full CRUD contract for cart resource.',
    preconditions: 'Authenticated user. Products available.',
    priorityId: prioHigh.id, typeId: typeAutomated.id, versions: 2,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'POST /api/v1/cart/items { productId, quantity: 2 }', expectedResult: 'HTTP 201; cart item created' },
      { order: 2, action: 'PATCH /api/v1/cart/items/{itemId} { quantity: 5 }', expectedResult: 'HTTP 200; quantity updated' },
      { order: 3, action: 'DELETE /api/v1/cart/items/{itemId}', expectedResult: 'HTTP 204; item removed' },
      { order: 4, action: 'GET /api/v1/cart', expectedResult: 'Cart is empty (no items)' },
    ],
  })

  const tcAPIApplyCoupon = await createCase({
    id: 'tc-sales-api-005', suiteId: suiteAPIAcceptance.id,
    externalId: 'TC-PVO-1005',
    title: 'POST /api/v1/cart/coupon applies valid coupon and returns updated total',
    description: 'Contract test for discount application.',
    preconditions: 'Coupon DEMO20 active. Cart total > R$100.',
    priorityId: prioHigh.id, typeId: typeAutomated.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'POST /api/v1/cart/coupon { code: "DEMO20" }', expectedResult: 'HTTP 200; { discount: 20, newTotal: number, couponApplied: true }' },
      { order: 2, action: 'Verify newTotal === originalTotal * 0.80', expectedResult: 'Math check passes' },
      { order: 3, action: 'POST same coupon again', expectedResult: 'HTTP 409: "Coupon already applied"' },
    ],
  })

  const tcAPIPagination = await createCase({
    id: 'tc-sales-api-006', suiteId: suiteAPIAcceptance.id,
    externalId: 'TC-PVO-1006',
    title: 'Product listing pagination returns correct page windows',
    description: 'Edge case: last page may have fewer items.',
    preconditions: '25 products in catalog.',
    priorityId: prioMedium.id, typeId: typeAutomated.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'GET /api/v1/products?page=1&limit=10', expectedResult: '10 items returned; page=1' },
      { order: 2, action: 'GET /api/v1/products?page=3&limit=10', expectedResult: '5 items returned (25 - 20 = 5); page=3' },
      { order: 3, action: 'GET /api/v1/products?page=4&limit=10', expectedResult: '0 items or 404 Not Found' },
    ],
  })

  // ── API Security & Attack test cases ──────────────────────────────────────────
  const tcSQLInjection = await createCase({
    id: 'tc-sales-api-sec-001', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2001',
    title: 'SQL injection in product search query parameter is rejected',
    description: 'OWASP A03:2021 – Injection. Parameterized queries must prevent SQL injection.',
    preconditions: 'API running. No WAF.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 1,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: "GET /api/v1/products?q=' OR '1'='1", expectedResult: 'HTTP 400 or empty results — not all products returned' },
      { order: 2, action: "GET /api/v1/products?q='; DROP TABLE products; --", expectedResult: 'HTTP 400; products table still exists' },
      { order: 3, action: 'Verify error response does not leak DB schema or error stack', expectedResult: 'Generic error message only' },
    ],
  })

  const tcAuthBypass = await createCase({
    id: 'tc-sales-api-sec-002', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2002',
    title: 'Accessing protected endpoints without JWT returns 401',
    description: 'OWASP A01:2021 – Broken Access Control. All authenticated routes must reject unauthenticated requests.',
    preconditions: 'API running.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'GET /api/v1/orders without Authorization header', expectedResult: 'HTTP 401 Unauthorized' },
      { order: 2, action: 'GET /api/v1/users/profile with expired JWT', expectedResult: 'HTTP 401; body: { error: "Token expired" }' },
      { order: 3, action: 'GET /api/v1/orders with tampered JWT payload (change userId)', expectedResult: 'HTTP 401; signature verification fails' },
    ],
  })

  const tcPrivilegeEscalation = await createCase({
    id: 'tc-sales-api-sec-003', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2003',
    title: 'Regular user cannot access or modify another user\'s orders (IDOR)',
    description: 'OWASP A01 – Insecure Direct Object Reference. Users can only access their own resources.',
    preconditions: 'User A and User B each have one order.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'Authenticate as User A. Note User B\'s orderId.', expectedResult: 'User A token obtained' },
      { order: 2, action: 'GET /api/v1/orders/{userBOrderId} using User A token', expectedResult: 'HTTP 403 Forbidden' },
      { order: 3, action: 'PATCH /api/v1/orders/{userBOrderId}/cancel using User A token', expectedResult: 'HTTP 403 Forbidden; User B\'s order not cancelled' },
    ],
  })

  const tcRateLimiting = await createCase({
    id: 'tc-sales-api-sec-004', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2004',
    title: 'Login endpoint rate-limits after 10 failed attempts',
    description: 'Brute-force protection. Login must throttle after repeated failures.',
    preconditions: 'API running. No active rate-limit lock on test IP.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 1,
    assigneeId: tester.id,
    steps: [
      { order: 1, action: 'POST /api/v1/auth/login with wrong password 10 times rapidly', expectedResult: 'First 10 return 401. 11th returns 429 Too Many Requests.' },
      { order: 2, action: 'Verify Retry-After header present on 429', expectedResult: 'Header shows seconds until unlock' },
      { order: 3, action: 'Wait for lock period to expire, then login with correct credentials', expectedResult: 'HTTP 200 OK; access restored' },
    ],
  })

  const tcMassAssignment = await createCase({
    id: 'tc-sales-api-sec-005', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2005',
    title: 'Mass assignment attack cannot elevate user role via profile update',
    description: 'OWASP A08:2021 – Security Misconfiguration. Dangerous fields must be blacklisted in input.',
    preconditions: 'Authenticated as regular user.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 1,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'PATCH /api/v1/users/profile with body { name: "New Name", role: "admin", isAdmin: true }', expectedResult: 'HTTP 200; only name updated' },
      { order: 2, action: 'GET /api/v1/users/profile', expectedResult: 'role remains "customer"; isAdmin field absent or false' },
    ],
  })

  const tcSensitiveDataExposure = await createCase({
    id: 'tc-sales-api-sec-006', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2006',
    title: 'Payment history response masks full card number (shows only last 4 digits)',
    description: 'OWASP A02:2021 – Cryptographic Failures. PCI DSS compliance: no full PAN in API responses.',
    preconditions: 'User has completed orders with card payment.',
    priorityId: prioCritical.id, typeId: typeManual.id, versions: 2,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'GET /api/v1/orders/{orderId}/payment', expectedResult: 'HTTP 200' },
      { order: 2, action: 'Verify cardNumber field in response', expectedResult: 'Only last 4 digits shown: "****-****-****-4242"' },
      { order: 3, action: 'Verify CVV is absent from response entirely', expectedResult: 'No cvv, securityCode, or cvc field in response' },
    ],
  })

  const tcCSRF = await createCase({
    id: 'tc-sales-api-sec-007', suiteId: suiteAPISecurity.id,
    externalId: 'TC-PVO-2007',
    title: 'Cross-site request forgery attack cannot place order from malicious page',
    description: 'OWASP A01 – CSRF protection. Orders must include and validate CSRF token or use SameSite cookies.',
    preconditions: 'User logged in. Attacker controls a third-party page.',
    priorityId: prioHigh.id, typeId: typeManual.id, versions: 1,
    assigneeId: lead.id,
    steps: [
      { order: 1, action: 'From attacker page, send POST /api/v1/orders with session cookie but without CSRF token', expectedResult: 'HTTP 403 Forbidden; CSRF token missing or invalid' },
      { order: 2, action: 'Verify no order was created in victim\'s account', expectedResult: 'Order count unchanged' },
    ],
  })

  // Collect all test cases
  const allCases = [
    tcProductSearch, tcAddToCart, tcCheckoutComplete, tcHomepageLoads,
    tcUserLogin, tcProductFilter, tcApplyCoupon, tcGuestCheckout,
    tcOutOfStock, tcExpiredCoupon, tcQuantityBoundary, tcSessionExpiry,
    tcInvalidCreditCard, tcXSSInSearchInput,
    tcAPIGetProducts, tcAPICreateOrder, tcAPIGetOrderHistory, tcAPICartOperations,
    tcAPIApplyCoupon, tcAPIPagination,
    tcSQLInjection, tcAuthBypass, tcPrivilegeEscalation, tcRateLimiting,
    tcMassAssignment, tcSensitiveDataExposure, tcCSRF,
  ]

  // ── Execution history ──────────────────────────────────────────────────────────
  // Simulate 2 rounds of execution. Round 1 = 2 weeks ago, Round 2 = last week.

  const round1Date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const round2Date = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)

  type ExecPlan = {
    tc: typeof tcProductSearch
    planId: string
    r1: 'pass' | 'fail' | 'blocked' | null
    r2: 'pass' | 'fail' | 'blocked' | null
    r1Notes?: string
    r2Notes?: string
  }

  const execPlan: ExecPlan[] = [
    { tc: tcProductSearch,       planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcAddToCart,           planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcCheckoutComplete,    planId: planUI.id,  r1: 'fail',    r2: 'fail',   r1Notes: 'Order confirmation email not sent — SMTP misconfigured in staging.', r2Notes: 'Email still failing. Bug open.' },
    { tc: tcHomepageLoads,       planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcUserLogin,           planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcProductFilter,       planId: planUI.id,  r1: 'pass',    r2: 'fail',   r2Notes: 'Price filter does not apply when sub-category selected simultaneously.' },
    { tc: tcApplyCoupon,         planId: planUI.id,  r1: 'blocked', r2: 'pass',   r1Notes: 'Blocked: coupon service down in staging.', r2Notes: 'Coupon service restored. Test passed.' },
    { tc: tcGuestCheckout,       planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcOutOfStock,          planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcExpiredCoupon,       planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcQuantityBoundary,    planId: planUI.id,  r1: 'fail',    r2: 'pass',   r1Notes: 'Quantity input accepted 999 without capping. Fixed in FE build 1.2.3.' },
    { tc: tcSessionExpiry,       planId: planUI.id,  r1: 'blocked', r2: 'blocked', r1Notes: 'Cannot simulate session expiry in staging — token TTL too long.', r2Notes: 'Still blocked. DevOps needs to configure shorter token TTL for testing.' },
    { tc: tcInvalidCreditCard,   planId: planUI.id,  r1: 'pass',    r2: 'pass' },
    { tc: tcXSSInSearchInput,    planId: planUI.id,  r1: 'fail',    r2: 'pass',   r1Notes: 'XSS alert() was executed! search results reflect unsanitized input.', r2Notes: 'Fix applied: input sanitized server-side.' },
    { tc: tcAPIGetProducts,      planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcAPICreateOrder,      planId: planAPI.id, r1: 'pass',    r2: 'fail',   r2Notes: 'Stock decrement race condition under concurrent requests — bug filed.' },
    { tc: tcAPIGetOrderHistory,  planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcAPICartOperations,   planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcAPIApplyCoupon,      planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcAPIPagination,       planId: planAPI.id, r1: 'pass',    r2: 'fail',   r2Notes: 'Page 3 returns 0 items instead of 5. Off-by-one in pagination calculation.' },
    { tc: tcSQLInjection,        planId: planAPI.id, r1: 'fail',    r2: 'pass',   r1Notes: "SQL injection ' OR '1'='1 returned all products! Critical vulnerability.", r2Notes: 'Parameterized queries implemented. Attack no longer works.' },
    { tc: tcAuthBypass,          planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcPrivilegeEscalation, planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcRateLimiting,        planId: planAPI.id, r1: 'fail',    r2: 'pass',   r1Notes: 'Rate limiter did not activate after 10 attempts. Brute force succeeded.', r2Notes: 'Rate limiter configured. 11th attempt returns 429.' },
    { tc: tcMassAssignment,      planId: planAPI.id, r1: 'pass',    r2: 'pass' },
    { tc: tcSensitiveDataExposure, planId: planAPI.id, r1: 'fail',  r2: 'pass',   r1Notes: 'Full card number returned in payment response! PCI DSS violation.', r2Notes: 'Card number masked to last 4 digits.' },
    { tc: tcCSRF,                planId: planAPI.id, r1: 'pass',    r2: 'pass' },
  ]

  const statusMap = {
    pass: execPass,
    fail: execFail,
    blocked: execBlocked,
  }

  for (const ep of execPlan) {
    if (ep.r1) {
      await prisma.testExecution.create({
        data: {
          testCaseId: ep.tc.id,
          testPlanId: ep.planId,
          suiteId: ep.tc.suiteId,
          statusId: statusMap[ep.r1].id,
          executedById: tester.id,
          executedAt: round1Date,
          durationMs: Math.floor(Math.random() * 15000) + 2000,
          environment: 'staging',
          platform: ep.planId === planAPI.id ? 'Postman / Newman' : 'Chrome 122',
          notes: ep.r1Notes,
        },
      })
    }
    if (ep.r2) {
      await prisma.testExecution.create({
        data: {
          testCaseId: ep.tc.id,
          testPlanId: ep.planId,
          suiteId: ep.tc.suiteId,
          statusId: statusMap[ep.r2].id,
          executedById: ep.r2 === 'pass' ? lead.id : tester.id,
          executedAt: round2Date,
          durationMs: Math.floor(Math.random() * 12000) + 1500,
          environment: 'staging',
          platform: ep.planId === planAPI.id ? 'Postman / Newman' : 'Chrome 123',
          notes: ep.r2Notes,
        },
      })
    }
  }

  // ── Bugs ───────────────────────────────────────────────────────────────────────
  const bugs = [
    {
      id: 'bug-sales-001',
      title: 'Order confirmation email not sent after successful checkout',
      description: 'After a guest or registered user completes checkout in the staging environment, no confirmation email is delivered. SMTP configuration appears broken for the sales platform project.',
      actualResult: 'No email received within 5 minutes of order placement.',
      expectedResult: 'Transactional email delivered within 2 minutes containing order ID and summary.',
      statusId: bugStatusOpen.id, priorityId: bugPrioCritical.id, severityId: bugSevBlocker.id,
    },
    {
      id: 'bug-sales-002',
      title: 'Price range filter breaks when combined with sub-category selection',
      description: 'Applying a price filter (e.g., R$100–R$300) and then selecting a sub-category causes the price filter to reset, showing products outside the specified range.',
      actualResult: 'Products outside R$100–R$300 displayed after sub-category selected.',
      expectedResult: 'Both filters applied simultaneously; only products matching both criteria shown.',
      statusId: bugStatusOpen.id, priorityId: bugPrioHigh.id, severityId: bugSevMajor.id,
    },
    {
      id: 'bug-sales-003',
      title: 'Stock decrement race condition under concurrent order creation',
      description: 'When two users simultaneously order the last unit of the same product, both orders succeed and stock goes to -1. The optimistic lock is not implemented on the inventory update.',
      actualResult: 'Both orders created; product stock becomes -1.',
      expectedResult: 'Only first order succeeds; second receives 409 "Item no longer available".',
      statusId: bugStatusInProgress.id, priorityId: bugPrioCritical.id, severityId: bugSevCritical.id,
    },
    {
      id: 'bug-sales-004',
      title: 'Pagination off-by-one: page 3 of 25 products returns 0 items instead of 5',
      description: 'With 25 products and limit=10, page 3 should return 5 items (offset 20). Instead, the API skips offset 20 and starts at offset 25, returning no results.',
      actualResult: 'GET /api/v1/products?page=3&limit=10 returns { data: [], total: 25 }',
      expectedResult: 'Returns 5 products with correct offset.',
      statusId: bugStatusOpen.id, priorityId: bugPrioMedium.id, severityId: bugSevMajor.id,
    },
    {
      id: 'bug-sales-005',
      title: '[SECURITY] SQL injection in product search returns all products',
      description: "Passing ' OR '1'='1 as the q parameter bypasses search filtering and returns the entire product catalog. Root cause: raw string interpolation in the query builder.",
      actualResult: 'All 500 products returned regardless of WHERE clause.',
      expectedResult: 'Empty results or 400 Bad Request.',
      statusId: bugStatusResolved.id, priorityId: bugPrioCritical.id, severityId: bugSevBlocker.id,
    },
    {
      id: 'bug-sales-006',
      title: '[SECURITY] Full credit card PAN exposed in /orders/{id}/payment response',
      description: 'The payment detail endpoint returned the raw cardNumber field with the full 16-digit PAN. This violates PCI DSS requirement 3.4 which mandates truncation or masking.',
      actualResult: '"cardNumber": "4242424242424242" in API response.',
      expectedResult: '"cardNumber": "****-****-****-4242".',
      statusId: bugStatusResolved.id, priorityId: bugPrioCritical.id, severityId: bugSevBlocker.id,
    },
  ]

  for (const bug of bugs) {
    await prisma.defect.upsert({
      where: { id: bug.id },
      create: {
        id: bug.id,
        title: bug.title,
        description: bug.description,
        actualResult: bug.actualResult,
        expectedResult: bug.expectedResult,
        statusId: bug.statusId,
        priorityId: bug.priorityId,
        severityId: bug.severityId,
        sourceId: bugSourceInternal.id,
        projectId: project.id,
        reportedById: tester.id,
        assignedToId: lead.id,
      },
      update: { statusId: bug.statusId },
    })
  }

  // Link bugs to failed executions
  const failedExecCheckout = await prisma.testExecution.findFirst({
    where: { testCaseId: tcCheckoutComplete.id, status: { value: 'fail' } },
    orderBy: { executedAt: 'asc' },
  })
  if (failedExecCheckout) {
    await prisma.bugTestExecution.upsert({
      where: { bugId_executionId: { bugId: 'bug-sales-001', executionId: failedExecCheckout.id } },
      create: { bugId: 'bug-sales-001', executionId: failedExecCheckout.id },
      update: {},
    })
  }

  const failedExecXSS = await prisma.testExecution.findFirst({
    where: { testCaseId: tcXSSInSearchInput.id, status: { value: 'fail' } },
    orderBy: { executedAt: 'asc' },
  })
  if (failedExecXSS) {
    await prisma.bugTestExecution.upsert({
      where: { bugId_executionId: { bugId: 'bug-sales-005', executionId: failedExecXSS.id } },
      create: { bugId: 'bug-sales-005', executionId: failedExecXSS.id },
      update: {},
    })
  }

  const failedExecCard = await prisma.testExecution.findFirst({
    where: { testCaseId: tcSensitiveDataExposure.id, status: { value: 'fail' } },
    orderBy: { executedAt: 'asc' },
  })
  if (failedExecCard) {
    await prisma.bugTestExecution.upsert({
      where: { bugId_executionId: { bugId: 'bug-sales-006', executionId: failedExecCard.id } },
      create: { bugId: 'bug-sales-006', executionId: failedExecCard.id },
      update: {},
    })
  }

  // ── Test Runs (with TestRunCase history) ─────────────────────────────────────
  const run1 = await prisma.testRun.create({
    data: {
      id: 'run-sales-001',
      name: 'Sprint 12 — Full Regression',
      description: 'Complete regression run before Sprint 12 release.',
      projectId: project.id,
      testPlanId: planUI.id,
      status: 'completed',
      environment: 'staging',
      callbackToken: randomBytes(24).toString('hex'),
      createdById: lead.id,
      startedAt: round1Date,
      completedAt: new Date(round1Date.getTime() + 4 * 60 * 60 * 1000),
    },
  })

  const run2 = await prisma.testRun.create({
    data: {
      id: 'run-sales-002',
      name: 'Sprint 13 — Smoke + Security',
      description: 'Targeted run on smoke cases and all security tests after security fixes.',
      projectId: project.id,
      testPlanId: planAPI.id,
      status: 'completed',
      environment: 'staging',
      callbackToken: randomBytes(24).toString('hex'),
      createdById: lead.id,
      startedAt: round2Date,
      completedAt: new Date(round2Date.getTime() + 2 * 60 * 60 * 1000),
    },
  })

  const run3 = await prisma.testRun.create({
    data: {
      id: 'run-sales-003',
      name: 'Sprint 13 — UI Regression (in progress)',
      description: 'Current UI regression run — ongoing.',
      projectId: project.id,
      testPlanId: planUI.id,
      status: 'in_progress',
      environment: 'staging',
      callbackToken: randomBytes(24).toString('hex'),
      createdById: tester.id,
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  })

  // Add cases to runs
  const uiCases   = [tcProductSearch, tcAddToCart, tcCheckoutComplete, tcHomepageLoads, tcUserLogin, tcProductFilter, tcApplyCoupon, tcGuestCheckout]
  const apiCases  = [tcAPIGetProducts, tcAPICreateOrder, tcAPIGetOrderHistory, tcSQLInjection, tcAuthBypass, tcPrivilegeEscalation, tcRateLimiting, tcSensitiveDataExposure]

  const run1Statuses: Record<string, string> = {
    [tcProductSearch.id]: 'passed', [tcAddToCart.id]: 'passed',
    [tcCheckoutComplete.id]: 'failed', [tcHomepageLoads.id]: 'passed',
    [tcUserLogin.id]: 'passed', [tcProductFilter.id]: 'passed',
    [tcApplyCoupon.id]: 'blocked', [tcGuestCheckout.id]: 'passed',
  }

  const run2Statuses: Record<string, string> = {
    [tcAPIGetProducts.id]: 'passed', [tcAPICreateOrder.id]: 'failed',
    [tcAPIGetOrderHistory.id]: 'passed', [tcSQLInjection.id]: 'passed',
    [tcAuthBypass.id]: 'passed', [tcPrivilegeEscalation.id]: 'passed',
    [tcRateLimiting.id]: 'passed', [tcSensitiveDataExposure.id]: 'passed',
  }

  for (let i = 0; i < uiCases.length; i++) {
    const tc = uiCases[i]
    await prisma.testRunCase.create({
      data: {
        testRunId: run1.id, testCaseId: tc.id,
        orderIndex: i, status: run1Statuses[tc.id] || 'not_run',
        assigneeId: i % 2 === 0 ? lead.id : tester.id,
      },
    })
  }

  for (let i = 0; i < apiCases.length; i++) {
    const tc = apiCases[i]
    await prisma.testRunCase.create({
      data: {
        testRunId: run2.id, testCaseId: tc.id,
        orderIndex: i, status: run2Statuses[tc.id] || 'not_run',
        assigneeId: lead.id,
      },
    })
  }

  // Run 3: in-progress (mixed statuses)
  const run3Cases = [tcProductSearch, tcAddToCart, tcCheckoutComplete, tcHomepageLoads, tcUserLogin, tcProductFilter]
  const run3Statuses = ['passed', 'passed', 'failed', 'passed', 'in_progress', 'not_run']
  for (let i = 0; i < run3Cases.length; i++) {
    await prisma.testRunCase.create({
      data: {
        testRunId: run3.id, testCaseId: run3Cases[i].id,
        orderIndex: i, status: run3Statuses[i],
        assigneeId: tester.id,
      },
    })
  }

  // ── ET Charters ───────────────────────────────────────────────────────────────
  const charters = [
    {
      id: 'etc-sales-001',
      suiteId: suiteUIAcceptance.id,
      charter: 'Explore the checkout flow under unusual product combinations, coupon stacking, and network interruptions to uncover edge cases that break order totals or skip confirmation.',
      areas: ['checkout flow', 'coupon stacking', 'order total calculation', 'network interruption', 'confirmation email'],
      startDate: new Date('2026-03-15T10:00:00Z'),
      testerId: tester.id,
      duration: 'normal' as const,
      testDesignPercentage: 30,
      bugInvestigationPercentage: 40,
      sessionSetupPercentage: 10,
      charterVsOpportunity: 65,
      testNotes: [
        {
          action: 'Coupon Stacking (Goldilocks Heuristic)',
          bullets: [
            'Applying two valid coupons simultaneously: second coupon silently ignored — no error shown',
            'DEMO20 + FREESHIP applied in sequence: total calculated on original, not on already-discounted amount (potential double discount)',
            'Coupon applied to out-of-stock item still reduces total — order fails but refund not immediate',
          ],
        },
        {
          action: 'Network Interruption (Error Heuristic)',
          bullets: [
            'Throttling to 3G during payment submission: request times out but order IS created server-side — user sees error screen',
            'Retry button re-submits the payment form — duplicate order created',
            'No idempotency key on POST /orders — confirmed by checking DB directly',
          ],
        },
        {
          action: 'Order Total Accuracy (Consistency Heuristic)',
          bullets: [
            'Cart total with tax matches checkout summary — consistent across browsers',
            'Currency rounding: R$9.995 rounds to R$10.00 in cart but R$9.99 in email — inconsistency found',
          ],
        },
      ],
      opportunities: [
        {
          action: 'Idempotency & Retry Testing',
          bullets: [
            'Design tests for payment retry flows — ensure idempotency key prevents duplicate charges',
            'Add network condition test matrix to regression suite',
          ],
        },
        {
          action: 'Accessibility (Goldilocks)',
          bullets: [
            'Checkout flow not keyboard-navigable — Tab stops missing on card expiry input',
            'Screen reader announces cart update but not order confirmation',
          ],
        },
      ],
      bugs: [
        {
          name: 'Duplicate order on payment timeout + retry',
          steps: ['Throttle to 3G', 'Submit payment form', 'Wait for timeout error', 'Click Retry'],
          expected: 'Single order created; retry uses same order ID',
          actual: 'Two identical orders created; customer charged twice',
        },
      ],
      issues: [
        { description: 'Clarify intended behavior for coupon stacking — product team decision needed before adding to regression suite.' },
      ],
    },
    {
      id: 'etc-sales-002',
      suiteId: suiteAPISecurity.id,
      charter: 'Probe the product catalog and search API for injection vulnerabilities, authorization gaps, and data exposure using OWASP testing techniques.',
      areas: ['SQL injection', 'NoSQL injection', 'authorization', 'data exposure', 'error messages', 'OWASP Top 10'],
      startDate: new Date('2026-03-18T14:00:00Z'),
      testerId: lead.id,
      duration: 'long' as const,
      testDesignPercentage: 25,
      bugInvestigationPercentage: 50,
      sessionSetupPercentage: 10,
      charterVsOpportunity: 60,
      testNotes: [
        {
          action: "SQL Injection (OWASP A03 — Attack Heuristic)",
          bullets: [
            "' OR '1'='1 in ?q parameter returned ALL products — confirmed SQL injection (now fixed)",
            "'; DROP TABLE products; -- caused no error, products still exist — likely sanitized downstream",
            "UNION SELECT null,null,null,null,null -- returned 500 with stack trace leaking table names",
            "Blind injection via time delay: ?q='; WAITFOR DELAY '0:0:5'; -- caused 5s response time",
          ],
        },
        {
          action: 'Authorization & IDOR (Eigensatz Heuristic)',
          bullets: [
            'GET /api/v1/orders/{uuid} with another user token: properly returns 403',
            'GET /api/v1/admin/products without admin token: returns 404 instead of 403 — route existence leaked',
            'Numeric ID enumeration: orders use UUID (good); some internal endpoints still use sequential integers',
          ],
        },
        {
          action: 'Sensitive Data in Responses (Goldilocks Heuristic)',
          bullets: [
            'Payment endpoint returned full PAN — now fixed (masked to last 4)',
            'User profile endpoint returns passwordHash field! Must be removed.',
            'Error responses on 500 include database connection string in development mode — need to ensure production config',
          ],
        },
      ],
      opportunities: [
        {
          action: 'Automated Security Scanning',
          bullets: [
            'Integrate OWASP ZAP in CI pipeline for automated baseline scan on each PR',
            'Add rate limiting tests to automated regression suite with performance assertions',
          ],
        },
      ],
      bugs: [
        {
          name: 'User profile API returns passwordHash field',
          steps: ['GET /api/v1/users/profile with valid token', 'Inspect response body'],
          expected: 'No sensitive fields (passwordHash, salt, internalId) in response',
          actual: 'passwordHash: "$2b$12$..." visible in JSON response',
        },
        {
          name: 'UNION SELECT injection returns 500 with stack trace',
          steps: ["GET /api/v1/products?q=UNION SELECT null,null,null,null,null --", 'Observe response'],
          expected: '400 Bad Request with generic error message',
          actual: '500 Internal Server Error with full Prisma stack trace and table names',
        },
      ],
      issues: [
        { description: 'Check if production has different error verbosity — staging exposes stack traces.' },
        { description: 'Admin routes returning 404 vs 403: confirm whether this is intentional security-by-obscurity.' },
      ],
    },
    {
      id: 'etc-sales-003',
      suiteId: suiteUINegative.id,
      charter: 'Explore the shopping cart and product inventory state under concurrent user actions, browser tab duplication, and session state inconsistencies.',
      areas: ['cart state', 'concurrent sessions', 'tab duplication', 'stock consistency', 'optimistic UI updates'],
      startDate: new Date('2026-03-20T09:00:00Z'),
      testerId: tester.id,
      duration: 'normal' as const,
      testDesignPercentage: 40,
      bugInvestigationPercentage: 35,
      sessionSetupPercentage: 10,
      charterVsOpportunity: 70,
      testNotes: [
        {
          action: 'Cart State Consistency (Consistency Heuristic)',
          bullets: [
            'Adding same product in two browser tabs: cart shows 2 in Tab A but 1 in Tab B until refresh',
            'Cart quantity stored in localStorage — can be manually edited via DevTools to exceed stock',
            'Removing item in one tab does not reflect in other tab until hard reload',
          ],
        },
        {
          action: 'Stock Race Condition (Timing Heuristic)',
          bullets: [
            'Two accounts buying last item simultaneously: both see "Add to Cart" succeed, both get to payment — first loses with 409 at order creation',
            'No reservation mechanism: item remains available to other users during checkout (up to 15 min window)',
            'Out-of-stock badge updates on page refresh but not in real-time',
          ],
        },
        {
          action: 'Browser History & Navigation (Goldilocks)',
          bullets: [
            'After completing checkout, browser Back navigates to payment page with card form still filled',
            'Re-submitting payment form from history causes duplicate order attempt',
          ],
        },
      ],
      opportunities: [
        {
          action: 'Real-time Stock Updates',
          bullets: [
            'Consider WebSocket or SSE for live stock updates in product listing',
            'Add soft reservation (15-min hold) when item added to cart to prevent overselling',
          ],
        },
      ],
      bugs: [
        {
          name: 'Browser back button re-exposes filled payment form',
          steps: ['Complete checkout successfully', 'Press browser Back button', 'Observe payment page'],
          expected: 'Back navigates to cart or is disabled after order completion',
          actual: 'Payment page shown with card details still in fields; form is re-submittable',
        },
      ],
      issues: [
        { description: 'Product team: should cart be synced in real-time across tabs? Requires WebSocket implementation.' },
      ],
    },
    {
      id: 'etc-sales-004',
      suiteId: suiteAPIAcceptance.id,
      charter: 'Verify the order management API handles high-volume concurrent requests, idempotency, and state transitions correctly under stress conditions.',
      areas: ['concurrency', 'idempotency', 'order state machine', 'API performance', 'error recovery'],
      startDate: new Date('2026-03-22T11:00:00Z'),
      testerId: lead.id,
      duration: 'long' as const,
      testDesignPercentage: 35,
      bugInvestigationPercentage: 30,
      sessionSetupPercentage: 15,
      charterVsOpportunity: 65,
      testNotes: [
        {
          action: 'Order State Machine (Consistency Heuristic)',
          bullets: [
            'Valid state transitions: pending → confirmed → shipped → delivered → closed',
            'PATCH /orders/{id}/cancel on a "shipped" order: returns 200 but state does not change — silent failure',
            'PATCH /orders/{id}/cancel on a "delivered" order: correctly returns 409 with clear message',
            'No audit log on state transitions — difficult to reconstruct order history for disputes',
          ],
        },
        {
          action: 'Idempotency (Error Heuristic)',
          bullets: [
            'POST /orders without Idempotency-Key header: duplicate orders possible on retry',
            'POST /orders with same Idempotency-Key twice: second call returns 200 with original order — correct',
            'Idempotency-Key not documented in API docs — client developers unaware of feature',
          ],
        },
        {
          action: 'Concurrent Load (Timing Heuristic)',
          bullets: [
            '50 concurrent POST /orders for same product (stock=10): DB constraint fires, 40 get 409 — correct',
            'Response time under 50 concurrent requests: p95 = 2.8s (above 2s SLA)',
            'Connection pool exhausted under 100 concurrent requests — API returns 503',
          ],
        },
      ],
      opportunities: [
        {
          action: 'Performance Benchmarks',
          bullets: [
            'Add p95/p99 latency assertions to Playwright API tests',
            'Configure connection pool size for production traffic estimates',
          ],
        },
        {
          action: 'Audit Logging',
          bullets: [
            'Add order state transition audit trail for compliance and dispute resolution',
            'Consider event sourcing for order domain',
          ],
        },
      ],
      bugs: [
        {
          name: 'PATCH /orders/{id}/cancel on shipped order silently fails',
          steps: ['Create order', 'Transition to "shipped" status', 'PATCH /orders/{id}/cancel'],
          expected: '409 Conflict: "Cannot cancel a shipped order"',
          actual: '200 OK with order body, but status remains "shipped" — misleading response',
        },
      ],
      issues: [
        { description: 'Idempotency-Key support not documented — coordinate with API docs team.' },
        { description: 'Connection pool exhaustion at 100 concurrent requests needs load test to determine production limits.' },
      ],
    },
  ]

  for (const charter of charters) {
    const { bugs: charterBugs, issues, testNotes, opportunities, ...charterData } = charter
    await prisma.eTCharter.upsert({
      where: { id: charter.id },
      create: {
        ...charterData,
        createdById: admin.id,
        testNotes,
        opportunities,
        bugs: charterBugs,
        issues,
      },
      update: { charter: charterData.charter },
    })
  }

  // ── Metric snapshots ──────────────────────────────────────────────────────────
  const metricsData = [
    { metricType: 'DORA_DEPLOY_FREQUENCY' as const, value: 1.8, recordedAt: new Date('2026-01-31'), metadata: { deployments: 8 } },
    { metricType: 'DORA_LEAD_TIME_HOURS' as const,  value: 28.5, recordedAt: new Date('2026-01-31') },
    { metricType: 'DORA_CHANGE_FAIL_RATE' as const, value: 12.5, recordedAt: new Date('2026-01-31'), metadata: { failedDeployments: 3, totalDeployments: 24 } },
    { metricType: 'DORA_MTTR_HOURS' as const,       value: 4.2,  recordedAt: new Date('2026-01-31') },
    { metricType: 'QUALITY_DEFECT_DENSITY' as const, value: 0.22, recordedAt: new Date('2026-01-31') },
    { metricType: 'QUALITY_ESCAPED_DEFECTS' as const, value: 4,  recordedAt: new Date('2026-01-31') },
    { metricType: 'EXECUTION_PASS_RATE' as const,   value: 71.4, recordedAt: new Date('2026-01-31') },

    { metricType: 'DORA_DEPLOY_FREQUENCY' as const, value: 2.1, recordedAt: new Date('2026-02-28'), metadata: { deployments: 9 } },
    { metricType: 'DORA_LEAD_TIME_HOURS' as const,  value: 22.0, recordedAt: new Date('2026-02-28') },
    { metricType: 'DORA_CHANGE_FAIL_RATE' as const, value: 9.1, recordedAt: new Date('2026-02-28') },
    { metricType: 'DORA_MTTR_HOURS' as const,       value: 3.1, recordedAt: new Date('2026-02-28') },
    { metricType: 'QUALITY_DEFECT_DENSITY' as const, value: 0.15, recordedAt: new Date('2026-02-28') },
    { metricType: 'QUALITY_ESCAPED_DEFECTS' as const, value: 2, recordedAt: new Date('2026-02-28') },
    { metricType: 'EXECUTION_PASS_RATE' as const,   value: 85.2, recordedAt: new Date('2026-02-28') },

    { metricType: 'DORA_DEPLOY_FREQUENCY' as const, value: 2.5, recordedAt: new Date('2026-03-31'), metadata: { deployments: 11 } },
    { metricType: 'DORA_LEAD_TIME_HOURS' as const,  value: 18.5, recordedAt: new Date('2026-03-31') },
    { metricType: 'DORA_CHANGE_FAIL_RATE' as const, value: 7.3, recordedAt: new Date('2026-03-31') },
    { metricType: 'DORA_MTTR_HOURS' as const,       value: 2.0, recordedAt: new Date('2026-03-31') },
    { metricType: 'QUALITY_DEFECT_DENSITY' as const, value: 0.09, recordedAt: new Date('2026-03-31') },
    { metricType: 'QUALITY_ESCAPED_DEFECTS' as const, value: 1, recordedAt: new Date('2026-03-31') },
    { metricType: 'EXECUTION_PASS_RATE' as const,   value: 92.3, recordedAt: new Date('2026-03-31') },
  ]

  for (const m of metricsData) {
    await prisma.metricSnapshot.create({
      data: { projectId: project.id, ...m },
    })
  }

  // ── ISTQB QA Workflow ─────────────────────────────────────────────────────────
  // Full ISTQB-aligned test process: Planning → Analysis → Design →
  // Implementation → Environment → Execution → Monitoring → Sign-Off
  const workflow = await prisma.qAWorkflow.create({
    data: {
      name: 'ISTQB Test Process — Online Sales Platform',
      description: 'Full ISTQB-aligned QA workflow for the Online Sales Platform: from project kick-off and risk analysis through test design, execution, monitoring, and formal sign-off.',
      projectId: project.id,
      createdById: lead.id,
    },
  })

  // Create blocks and capture their DB IDs
  const blocks = await Promise.all([
    // ── Phase 1: Planning ──────────────────────────────────────────────────────
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: '1. Test Planning\n(objectives · scope · schedule · exit criteria)', posX: 80,  posY: 60,  config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'RACI_MATRIX',   label: 'RACI Matrix\n(QA Lead · Testers · Devs · PO · Stakeholders)',    posX: 420, posY: 60,  config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'NOTE',           label: 'Resource Allocation\n& Sprint Planning',                         posX: 760, posY: 60,  config: {} } }),

    // ── Phase 2: Risk-Based Analysis ──────────────────────────────────────────
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'BRAINSTORMING',  label: 'Brainstorming\n(risks · what could fail · quality attributes)',   posX: 80,  posY: 240, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'RISK_ANALYSIS',  label: 'Risk Analysis\n(Impact × Probability matrix · prioritize suites)', posX: 420, posY: 240, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: '2. Test Analysis\n(test conditions from requirements + risks)',    posX: 760, posY: 240, config: {} } }),

    // ── Phase 3: Design & Implementation ──────────────────────────────────────
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'ORACLE_DEFINITION', label: 'Test Oracle Definition\n(expected results · acceptance criteria)', posX: 80,  posY: 420, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: '3. Test Design\n(test cases · techniques · test data)',            posX: 420, posY: 420, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: '4. Test Implementation\n(suites · priorities · assignments)',       posX: 760, posY: 420, config: {} } }),

    // ── Phase 4: Environment & Execution Readiness ────────────────────────────
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'ENVIRONMENT_SETUP', label: 'Environment Setup\n(QA + Staging · test data · credentials)',   posX: 80,  posY: 600, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SANITY_SMOKE',   label: 'Sanity & Smoke Check\n(env health · API ping · login works)',      posX: 420, posY: 600, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'DECISION',       label: 'Environment\nReady?',                                              posX: 760, posY: 600, config: {} } }),

    // ── Phase 5: Execution & Monitoring ──────────────────────────────────────
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: '5. Test Execution\n(run test cases · log results · report bugs)',  posX: 420, posY: 780, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: 'Test Monitoring & Control\n(pass rate · burndown · defect density)', posX: 80, posY: 780, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'DECISION',       label: 'All Critical\nDefects Fixed?',                                     posX: 760, posY: 780, config: {} } }),

    // ── Phase 6: Regression & Sign-Off ───────────────────────────────────────
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SUBPROCESS',    label: 'Regression Testing\n(re-run failed · verify fixes)',               posX: 420, posY: 960, config: {} } }),
    prisma.workflowBlock.create({ data: { workflowId: workflow.id, type: 'SIGN_OFF',       label: '6. Test Completion & Sign-Off\n(summary report · metrics · release decision)', posX: 760, posY: 960, config: {} } }),
  ])

  // Assign named references to block DB IDs
  const [
    bPlanning, bRaci, bResources,
    bBrainstorm, bRisk, bAnalysis,
    bOracle, bDesign, bImplement,
    bEnvSetup, bSmoke, bEnvReady,
    bExecution, bMonitoring, bDefectsFixed,
    bRegression, bSignOff,
  ] = blocks.map(b => b.id)

  // Create all edges
  const edges: { sourceBlockId: string; targetBlockId: string; label?: string }[] = [
    // Phase 1 → 2
    { sourceBlockId: bPlanning,   targetBlockId: bRaci },
    { sourceBlockId: bPlanning,   targetBlockId: bBrainstorm },
    { sourceBlockId: bRaci,       targetBlockId: bResources },
    { sourceBlockId: bResources,  targetBlockId: bBrainstorm },
    // Phase 2 (Risk analysis)
    { sourceBlockId: bBrainstorm, targetBlockId: bRisk },
    { sourceBlockId: bRisk,       targetBlockId: bAnalysis },
    // Phase 2 → 3
    { sourceBlockId: bAnalysis,   targetBlockId: bOracle },
    { sourceBlockId: bAnalysis,   targetBlockId: bDesign },
    { sourceBlockId: bOracle,     targetBlockId: bDesign },
    { sourceBlockId: bDesign,     targetBlockId: bImplement },
    // Phase 3 → 4
    { sourceBlockId: bImplement,  targetBlockId: bEnvSetup },
    { sourceBlockId: bEnvSetup,   targetBlockId: bSmoke },
    { sourceBlockId: bSmoke,      targetBlockId: bEnvReady },
    { sourceBlockId: bEnvReady,   targetBlockId: bExecution,   label: 'Yes' },
    { sourceBlockId: bEnvReady,   targetBlockId: bEnvSetup,    label: 'No — fix env' },
    // Phase 5
    { sourceBlockId: bExecution,  targetBlockId: bMonitoring },
    { sourceBlockId: bExecution,  targetBlockId: bDefectsFixed },
    { sourceBlockId: bDefectsFixed, targetBlockId: bRegression, label: 'No — retest' },
    { sourceBlockId: bRegression, targetBlockId: bExecution },
    { sourceBlockId: bDefectsFixed, targetBlockId: bSignOff,   label: 'Yes' },
  ]

  for (const edge of edges) {
    await prisma.workflowEdge.create({ data: { workflowId: workflow.id, ...edge } })
  }

  console.log('✓ Seeded Online Sales Platform project')
  console.log(`  ↳ ${allCases.length} test cases across 4 suites`)
  console.log('  ↳ 2 test plans (UI + API)')
  console.log('  ↳ 4 ET charters (in English)')
  console.log('  ↳ 6 bugs linked to executions')
  console.log('  ↳ 3 test runs (2 completed, 1 in progress)')
  console.log('  ↳ 3 months of DORA + quality metrics')
  console.log('  ↳ 1 ISTQB workflow diagram (17 blocks, 20 edges)')
}
