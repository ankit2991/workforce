import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  agencies: defineTable({
    name: v.string(),
    code: v.string(),
    country: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_code", ["code"]),

  branches: defineTable({
    agencyId: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_agency", ["agencyId"])
    .index("by_status", ["status"]),

  sites: defineTable({
    branchId: v.id("branches"),
    agencyId: v.id("agencies"),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_branch", ["branchId"])
    .index("by_agency", ["agencyId"])
    .index("by_status", ["status"]),

  workers: defineTable({
    // Identity
    employeeId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    nationality: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    // Employment
    agencyId: v.id("agencies"),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    employmentType: v.union(
      v.literal("full_time"),
      v.literal("part_time"),
      v.literal("contract"),
      v.literal("piece_work"),
    ),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended"),
      v.literal("terminated"),
    ),
    // Salary & withdrawal preferences
    expectedMonthlySalary: v.optional(v.number()),
    salaryCurrency: v.optional(v.string()),
    withdrawalFrequency: v.optional(v.union(v.literal("weekly"), v.literal("monthly"))),
    // Bank info for withdrawals
    bankName: v.optional(v.string()),
    bankAccountNumber: v.optional(v.string()),
    bankAccountName: v.optional(v.string()),
    // Documents stored as Convex file storage IDs
    documents: v.optional(
      v.array(
        v.object({
          type: v.string(),
          name: v.string(),
          storageId: v.string(),
          uploadedAt: v.string(),
        }),
      ),
    ),
    createdBy: v.id("users"),
  })
    .index("by_agency", ["agencyId"])
    .index("by_branch", ["branchId"])
    .index("by_site", ["siteId"])
    .index("by_status", ["status"])
    .index("by_employee_id", ["employeeId"]),

  attendance: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
    // ISO date string YYYY-MM-DD
    date: v.string(),
    // Type of work record
    recordType: v.union(
      v.literal("days"),
      v.literal("hours"),
      v.literal("piece_work"),
    ),
    // For days: 1 = full day, 0.5 = half day
    daysWorked: v.optional(v.number()),
    // For hours
    hoursWorked: v.optional(v.number()),
    overtimeHours: v.optional(v.number()),
    // For piece work
    pieceCount: v.optional(v.number()),
    pieceRate: v.optional(v.number()),
    // Status
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("half_day"),
      v.literal("rest_day"),
      v.literal("public_holiday"),
      v.literal("leave"),
    ),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    // QR clock-in/out fields
    clockInTime: v.optional(v.string()),   // ISO 8601 UTC
    clockOutTime: v.optional(v.string()),  // ISO 8601 UTC
    clockInSiteId: v.optional(v.id("sites")),
    clockOutSiteId: v.optional(v.id("sites")),
    // Verification
    verified: v.optional(v.boolean()),
    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.string()),    // ISO 8601 UTC
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_worker_date", ["workerId", "date"])
    .index("by_agency_date", ["agencyId", "date"])
    .index("by_date", ["date"]),

  wageConfigs: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    // Base rate type
    rateType: v.union(v.literal("daily"), v.literal("hourly"), v.literal("piece"), v.literal("monthly")),
    baseRate: v.number(),         // per day / per hour / per piece / per month
    overtimeMultiplier: v.number(), // e.g. 1.5
    currency: v.string(),          // e.g. "MYR"
    // Standing allowances (added every pay period automatically)
    allowances: v.array(v.object({ name: v.string(), amount: v.number() })),
    // Standing deductions
    deductions: v.array(v.object({ name: v.string(), amount: v.number() })),
    effectiveFrom: v.string(),     // ISO date
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"]),

  wageRecords: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    periodStart: v.string(),   // YYYY-MM-DD
    periodEnd: v.string(),
    // Computed fields
    daysWorked: v.number(),
    hoursWorked: v.number(),
    overtimeHours: v.number(),
    pieceCount: v.number(),
    basePay: v.number(),
    overtimePay: v.number(),
    // Extra (one-off) per period
    extraAllowances: v.array(v.object({ name: v.string(), amount: v.number() })),
    extraDeductions: v.array(v.object({ name: v.string(), amount: v.number() })),
    totalAllowances: v.number(),
    totalDeductions: v.number(),
    grossPay: v.number(),
    netPay: v.number(),
    currency: v.string(),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("paid")),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_worker_period", ["workerId", "periodStart"])
    .index("by_status", ["status"]),

  // Wallet balance summary per worker (denormalized for fast reads)
  wallets: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    // All amounts in the worker's currency
    currency: v.string(),
    earned: v.number(),      // total credited from approved wages
    pending: v.number(),     // wages drafted but not yet approved
    advances: v.number(),    // total advance credits given (outstanding principal)
    spent: v.number(),       // total marketplace purchases
    withdrawn: v.number(),   // total bank withdrawals processed
    // available = earned + advances - spent - withdrawn
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"]),

  // Individual ledger entries - every credit/debit event
  ledgerEntries: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    // Type of entry
    entryType: v.union(
      v.literal("wage_credit"),       // pay slip approved → credit
      v.literal("advance_credit"),    // salary advance disbursed
      v.literal("advance_repayment"), // deducted from wage to repay advance
      v.literal("withdrawal"),        // bank transfer out
      v.literal("marketplace_debit"), // purchase from marketplace
      v.literal("adjustment"),        // manual admin adjustment
      v.literal("remittance"),        // overseas transfer out
      v.literal("wallet_fund"),       // admin funds wallet (wage payment)
    ),
    amount: v.number(),         // positive = credit, negative = debit
    balanceAfter: v.number(),   // running available balance after this entry
    currency: v.string(),
    description: v.string(),
    referenceId: v.optional(v.string()), // wageRecord._id, advance._id, etc.
    date: v.string(),           // ISO date YYYY-MM-DD
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_worker_date", ["workerId", "date"])
    .index("by_type", ["entryType"]),

  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("superadmin"),
      v.literal("agency_admin"),
      v.literal("branch_admin"),
      v.literal("site_admin"),
      v.literal("worker"),
    ),
    agencyId: v.optional(v.id("agencies")),
    branchId: v.optional(v.id("branches")),
    siteId: v.optional(v.id("sites")),
    workerId: v.optional(v.id("workers")),  // links a "worker" role user to their worker record
  })
    .index("by_user", ["userId"])
    .index("by_agency", ["agencyId"])
    .index("by_worker", ["workerId"]),

  withdrawals: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    // Bank details snapshotted at request time
    bankName: v.string(),
    bankAccountNumber: v.string(),
    bankAccountName: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("processed"),
    ),
    requestedDate: v.string(),       // ISO date YYYY-MM-DD
    approvedDate: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
    processedDate: v.optional(v.string()),
    processedBy: v.optional(v.id("users")),
    transactionRef: v.optional(v.string()), // bank ref / receipt number
    rejectionReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_status", ["status"])
    .index("by_agency_status", ["agencyId", "status"]),

  marketplaceProducts: defineTable({
    agencyId: v.id("agencies"),
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),      // undefined = unlimited
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdBy: v.id("users"),
  })
    .index("by_agency", ["agencyId"])
    .index("by_agency_status", ["agencyId", "status"])
    .index("by_category", ["category"]),

  marketplaceOrders: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    productId: v.id("marketplaceProducts"),
    // Snapshot at purchase time
    productName: v.string(),
    unitPrice: v.number(),
    currency: v.string(),
    quantity: v.number(),
    totalAmount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("fulfilled"),
      v.literal("cancelled"),
    ),
    orderedDate: v.string(),
    confirmedDate: v.optional(v.string()),
    fulfilledDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_product", ["productId"])
    .index("by_agency_status", ["agencyId", "status"]),

  remittances: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    // Send amount in source currency
    sendAmount: v.number(),
    sendCurrency: v.string(),
    // Receive amount in destination currency
    receiveAmount: v.number(),
    receiveCurrency: v.string(),
    exchangeRate: v.number(),            // receiveAmount = sendAmount * exchangeRate
    // Fees
    transferFee: v.number(),
    totalDebit: v.number(),              // sendAmount + transferFee
    // Recipient details
    recipientName: v.string(),
    recipientCountry: v.string(),
    recipientPhone: v.optional(v.string()),
    recipientAddress: v.optional(v.string()),
    // Bank or mobile wallet
    transferMethod: v.union(
      v.literal("bank_transfer"),
      v.literal("mobile_wallet"),
      v.literal("cash_pickup"),
    ),
    recipientBankName: v.optional(v.string()),
    recipientAccountNumber: v.optional(v.string()),
    recipientAccountName: v.optional(v.string()),
    mobileWalletProvider: v.optional(v.string()),
    mobileWalletNumber: v.optional(v.string()),
    cashPickupLocation: v.optional(v.string()),
    // Purpose of remittance
    purpose: v.optional(v.string()),
    // Status workflow
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("processing"),   // sent to remittance partner
      v.literal("completed"),
      v.literal("failed"),
    ),
    requestedDate: v.string(),
    approvedDate: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
    processedDate: v.optional(v.string()),
    processedBy: v.optional(v.id("users")),
    completedDate: v.optional(v.string()),
    partnerReference: v.optional(v.string()),  // remittance partner txn ref
    rejectionReason: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_status", ["status"])
    .index("by_agency_status", ["agencyId", "status"]),

  advances: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    amount: v.number(),
    currency: v.string(),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("disbursed"),
      v.literal("repaid"),
    ),
    requestedDate: v.string(),         // ISO date YYYY-MM-DD
    approvedDate: v.optional(v.string()),
    approvedBy: v.optional(v.id("users")),
    disbursedDate: v.optional(v.string()),
    repaidAmount: v.number(),          // running repayment total
    processingFee: v.optional(v.number()), // 10% processing fee
    repaymentSchedule: v.optional(v.string()), // free-text description
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_status", ["status"])
    .index("by_agency_status", ["agencyId", "status"]),

  // ── iGaming ────────────────────────────────────────────────────────────────

  igamingConfigs: defineTable({
    agencyId: v.id("agencies"),
    enabled: v.boolean(),
    providerName: v.optional(v.string()),   // e.g. "Pragmatic Play"
    providerUrl: v.optional(v.string()),    // iframe/lobby URL
    minDeposit: v.number(),
    maxDeposit: v.number(),
    dailyDepositLimit: v.optional(v.number()),
    monthlyDepositLimit: v.optional(v.number()),
    currency: v.string(),
    allowedCategories: v.array(v.string()), // ["slots","live_casino","sports",…]
    bonusEnabled: v.boolean(),
    welcomeBonus: v.optional(v.number()),   // % bonus on first deposit
    createdBy: v.id("users"),
    updatedAt: v.string(),
  }).index("by_agency", ["agencyId"]),

  igamingAccounts: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    username: v.string(),
    balance: v.number(),           // current iGaming wallet balance
    currency: v.string(),
    totalDeposited: v.number(),
    totalWithdrawn: v.number(),
    totalWon: v.number(),
    totalWagered: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("self_excluded"),
    ),
    createdAt: v.string(),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"]),

  igamingTransactions: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    type: v.union(
      v.literal("deposit"),     // main wallet → iGaming balance
      v.literal("withdrawal"),  // iGaming balance → main wallet
      v.literal("bet"),         // wager placed
      v.literal("win"),         // win credited
      v.literal("bonus"),       // bonus credited
    ),
    amount: v.number(),          // positive for credit, negative for debit
    currency: v.string(),
    balanceAfter: v.number(),
    gameId: v.optional(v.string()),
    gameName: v.optional(v.string()),
    description: v.string(),
    referenceId: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"])
    .index("by_worker_type", ["workerId", "type"]),

  notifications: defineTable({
    agencyId: v.id("agencies"),
    type: v.string(),           // advance_approved, withdrawal_processed, etc.
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),       // deep-link path e.g. "/advances"
    severity: v.union(
      v.literal("info"),
      v.literal("success"),
      v.literal("warning"),
      v.literal("error"),
    ),
    entityId: v.optional(v.string()),   // _id of the related entity
    entityType: v.optional(v.string()), // "advance"|"withdrawal"|"remittance"|"wage"|"order"
    read: v.boolean(),
    readBy: v.array(v.id("users")),
    createdAt: v.string(),              // ISO-8601 UTC timestamp
  })
    .index("by_agency", ["agencyId"])
    .index("by_agency_read", ["agencyId", "read"]),

  // ── iGaming provider integration ──────────────────────────────────────────

  igamingGameSessions: defineTable({
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    token: v.string(),          // short-lived opaque token sent to provider in iFrame URL
    gameId: v.string(),         // provider game identifier
    gameName: v.string(),
    currency: v.string(),
    expiresAt: v.string(),      // ISO-8601: token invalid after this time
    launchedAt: v.string(),     // ISO-8601
    endedAt: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("ended"),
      v.literal("expired"),
    ),
  })
    .index("by_token", ["token"])
    .index("by_worker", ["workerId"])
    .index("by_agency", ["agencyId"]),

  igamingProviderConfig: defineTable({
    agencyId: v.id("agencies"),
    providerName: v.string(),       // e.g. "Pragmatic", "SBO", "Custom"
    operatorId: v.string(),         // your operator ID with the provider
    apiKey: v.string(),             // HMAC signing key for callback validation
    launchUrlTemplate: v.string(),  // e.g. "https://provider.com/launch?token={TOKEN}&game={GAME_ID}&currency={CURRENCY}"
    callbackSecret: v.string(),     // shared secret for verifying provider webhook signatures
    enabled: v.boolean(),
    sandboxMode: v.boolean(),       // true = use sandbox/staging URLs
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_agency", ["agencyId"]),

  igamingProviderTransactions: defineTable({
    // Raw record of every callback the provider made to us
    sessionToken: v.string(),
    workerId: v.id("workers"),
    agencyId: v.id("agencies"),
    type: v.union(
      v.literal("balance"),   // provider checked balance
      v.literal("debit"),     // provider debited (bet placed)
      v.literal("credit"),    // provider credited (win / refund)
      v.literal("rollback"),  // provider rolled back a debit
    ),
    roundId: v.optional(v.string()),      // provider's round/bet ID
    transactionId: v.string(),            // provider's transaction ID (must be idempotent)
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    balanceBefore: v.optional(v.number()),
    balanceAfter: v.optional(v.number()),
    rawPayload: v.string(),               // JSON-stringified raw body for debugging
    processedAt: v.string(),
    status: v.union(v.literal("ok"), v.literal("error"), v.literal("duplicate")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_session", ["sessionToken"])
    .index("by_transaction_id", ["transactionId"])
    .index("by_worker", ["workerId"]),
});
