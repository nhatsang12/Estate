# EstateManager UML Lucidchart Blueprint

This file is a drag-and-drop blueprint for Lucidchart.  
Create 4 pages in one document:
- `01_UseCase`
- `02_Class`
- `03_Sequence`
- `04_Database_ERD`

Use shape libraries:
- `UML Use Case`
- `UML Class`
- `UML Sequence`

---

## 1) Use Case Diagram (System-level)

### 1.1 System Boundary
- Name: `EstateManager Platform`

### 1.2 Actors (place outside boundary)
- `A1 User/Buyer`
- `A2 Provider/Owner`
- `A3 Administrator`
- `A4 VNPay/PayPal Gateway` (external system)
- `A5 KYC Python Service` (external system)
- `A6 Subscription Bot` (system admin account)

### 1.3 Use Cases inside boundary

#### User/Buyer
- `UC-U1 Register Account`
- `UC-U2 Login`
- `UC-U3 Search Properties`
- `UC-U4 View Property Details`
- `UC-U5 Add Property to Favorites`
- `UC-U6 Chat with Provider`
- `UC-U7 Interact with AI Chatbot`
- `UC-U8 Submit KYC`
- `UC-U9 Change Language`

#### Provider
- `UC-P1 Register as Provider`
- `UC-P2 Login`
- `UC-P3 Manage Properties`
- `UC-P4 Submit KYC`
- `UC-P5 Manage Subscription`
- `UC-P6 View Subscription Status`
- `UC-P7 View Sales Stats`
- `UC-P8 Chat with User`

#### Admin
- `UC-A1 Login (Admin)`
- `UC-A2 Manage Users/Providers`
- `UC-A3 Moderate Listings`
- `UC-A4 Manage KYC`
- `UC-A5 Manage Subscriptions & Revenue`
- `UC-A6 View Analytics Reports`

#### Shared/Internal Subcases
- `UC-S1 Create Checkout`
- `UC-S2 Select Payment Method`
- `UC-S3 Verify VNPay/PayPal Callback`
- `UC-S4 Duplicate CCCD Check`
- `UC-S5 OCR + Face Compare`
- `UC-S6 Send Expiry Reminder`

### 1.4 Actor -> Use Case connections

- `A1 -> UC-U1, UC-U2, UC-U3, UC-U4, UC-U5, UC-U6, UC-U7, UC-U8, UC-U9`
- `A2 -> UC-P1, UC-P2, UC-P3, UC-P4, UC-P5, UC-P6, UC-P7, UC-P8`
- `A3 -> UC-A1, UC-A2, UC-A3, UC-A4, UC-A5, UC-A6`
- `A4 -> UC-S2, UC-S3`
- `A5 -> UC-S5`
- `A6 -> UC-S6`

### 1.5 Include / Extend relations

Use `<<include>>`:
- `UC-P5 Manage Subscription <<include>> UC-S1 Create Checkout`
- `UC-S1 Create Checkout <<include>> UC-S2 Select Payment Method`
- `UC-P4 Submit KYC <<include>> UC-S4 Duplicate CCCD Check`
- `UC-P4 Submit KYC <<include>> UC-S5 OCR + Face Compare`
- `UC-U8 Submit KYC <<include>> UC-S4 Duplicate CCCD Check`
- `UC-U8 Submit KYC <<include>> UC-S5 OCR + Face Compare`
- `UC-S1 Create Checkout <<include>> UC-S3 Verify VNPay/PayPal Callback`

Use `<<extend>>`:
- `UC-A3 Moderate Listings <<extend>> Approve Listing`
- `UC-A3 Moderate Listings <<extend>> Reject Listing`
- `UC-P3 Manage Properties <<extend>> Mark Sold`
- `UC-P3 Manage Properties <<extend>> Hide Listing`
- `UC-P3 Manage Properties <<extend>> Resubmit Rejected Listing`

### 1.6 Layout hint
- Left: all actors.
- Center: User + Provider use cases.
- Right: Admin use cases.
- Bottom: shared/internal subcases.

---

## 2) Class Diagram (Domain + Service-facing methods)

Draw each class with 3 compartments:
- Class name
- Attributes
- Operations

### 2.1 Enums

`UserRole`
- user
- provider
- admin

`PropertyStatus`
- pending
- approved
- rejected
- hidden
- sold

`SubscriptionPlan`
- free
- pro
- proplus

`PaymentMethod`
- VNPay
- PayPal

`TransactionStatus`
- pending
- success
- failed
- cancelled

### 2.2 Classes

#### `User`
Attributes:
- id: ObjectId
- fullName: string
- email: string
- passwordHash: string
- role: UserRole
- kycStatus: string
- kycExtractedData: object

Methods:
- register(fullName, email, password): User
- login(email, password): AuthToken
- submitKyc(input): void
- requestProviderRole(note): RoleRequest
- canCreateProperty(activePlan, listingCount): boolean

#### `RoleRequest`
Attributes:
- id: ObjectId
- userId: ObjectId
- status: string
- note: string
- reviewedBy: ObjectId

Methods:
- submit(userId, note): RoleRequest
- approve(adminId): void
- reject(adminId, reason): void
- isPending(): boolean

#### `Property`
Attributes:
- id: ObjectId
- providerId: ObjectId
- title: string
- description: string
- price: number
- type: string
- bedrooms: number
- bathrooms: number
- area: number
- address: string
- status: PropertyStatus
- images: string[]

Methods:
- create(providerId, input): Property
- update(input): void
- submitForModeration(): void
- approve(adminId): void
- reject(adminId, reason): void
- markSold(providerId): void
- toggleHidden(hidden): void

#### `Favorite`
Attributes:
- id: ObjectId
- userId: ObjectId
- propertyId: ObjectId
- createdAt: Date

Methods:
- add(userId, propertyId): Favorite
- remove(userId, propertyId): void
- exists(userId, propertyId): boolean

#### `Message`
Attributes:
- id: ObjectId
- conversationId: string
- senderId: ObjectId
- receiverId: ObjectId
- content: string
- imageUrl: string
- isRead: boolean
- createdAt: Date

Methods:
- send(senderId, receiverId, content): Message
- markAsRead(readerId): void
- sendSystemMessage(receiverId, content): Message
- isOneWaySystemConversation(): boolean

#### `Subscription`
Attributes:
- id: ObjectId
- userId: ObjectId
- plan: SubscriptionPlan
- status: string
- startDate: Date
- endDate: Date

Methods:
- activate(userId, plan, startDate): Subscription
- renew(months): void
- cancel(): void
- isExpired(at): boolean
- daysToExpire(at): number
- getListingLimit(): number

#### `Transaction`
Attributes:
- id: ObjectId
- userId: ObjectId
- subscriptionId: ObjectId
- amount: number
- paymentMethod: PaymentMethod
- status: TransactionStatus
- transactionRef: string
- checkoutUrl: string

Methods:
- createCheckout(userId, plan, method): Transaction
- markPending(): void
- markSuccess(gatewayRef): void
- markFailed(reason): void
- markCancelled(): void
- validateVnPaySignature(payload, secret): boolean

#### `ProviderSalesStats`
Attributes:
- providerId: ObjectId
- totalSoldProperties: number
- totalSoldValue: number
- lastSoldAt: Date
- recentSoldProperties: object[]

Methods:
- recordSale(propertyId, soldPrice, soldAt): void
- incrementSoldCount(): void
- addSoldValue(amount): void
- recalculateAverageSoldPrice(): number
- getSummary(): object

#### `ChatbotMemory`
Attributes:
- userId: ObjectId
- recentTurns: object[]
- preferenceProfile: object
- summary: string
- updatedAt: Date

Methods:
- appendTurn(role, content): void
- updatePreference(patch): void
- buildContext(maxTurns): object
- summarizeIfNeeded(turnThreshold): void
- clear(): void

### 2.3 Relationships with multiplicity

- `User 1 ---- 0..* Property` (provider owns listings)
- `User 1 ---- 0..* RoleRequest`
- `User 1 ---- 0..* Subscription`
- `Subscription 1 ---- 0..* Transaction`
- `User 1 ---- 0..* Favorite`
- `Property 1 ---- 0..* Favorite`
- `User 1 ---- 0..* Message` (as sender)
- `User 1 ---- 0..* Message` (as receiver)
- `User 1 ---- 0..1 ProviderSalesStats`
- `User 1 ---- 0..1 ChatbotMemory`

Optional dependency arrows (dashed):
- `Transaction ..> PaymentMethod`
- `Property ..> PropertyStatus`
- `User ..> UserRole`
- `Subscription ..> SubscriptionPlan`

---

## 3) Sequence Diagram (VNPay Checkout end-to-end)

### 3.1 Lifelines (left to right)
- `L1 Provider`
- `L2 Frontend Dashboard`
- `L3 paymentService/apiClient`
- `L4 Backend PaymentsController`
- `L5 MongoDB`
- `L6 VNPay Gateway`
- `L7 Frontend Payment Status Page`

### 3.2 Message order

1. `L1 -> L2`: Click `Thanh toan` plan
2. `L2 -> L3`: createCheckout(payload, redirect=true)
3. `L3 -> L4`: POST /payments/create-checkout?redirect=true
4. `L4 -> L5`: Insert pending Transaction
5. `L4 -> L3`: return checkoutUrl
6. `L3 -> L2`: response.data.checkoutUrl
7. `L2 -> L6`: browser redirect to checkoutUrl
8. `L6 -> L4`: callback /payments/vnpay_return (query params + secure hash)
9. `L4 -> L4`: validate signature + payment result
10. `L4 -> L5`: update Transaction + Subscription
11. `L4 -> L7`: redirect /payment/success?transactionId=...&paymentMethod=VNPay
12. `L7 -> L3`: fetch latest subscription status
13. `L3 -> L4`: GET subscription status
14. `L4 -> L5`: read subscription
15. `L4 -> L3`: status payload
16. `L3 -> L7`: render success info + auto back to dashboard

### 3.3 `alt` fragments

`alt Payment Success`
- Step 10 updates: `Transaction=success`, `Subscription=active`, extend endDate +1 month
- Step 11 redirects to `/payment/success`

`else Payment Failed/Cancelled`
- Step 10 updates: `Transaction=failed|cancelled`
- Step 11 redirects to `/payment/failed` or `/payment/cancelled`

---

## 4) Optional Sequence Diagram (KYC Auto Decision)

If your teacher asks for one more sequence, add this on a second sequence canvas.

Lifelines:
- `User/Provider` -> `Frontend KYC Page` -> `Backend UserController` -> `KYC Python Service` -> `MongoDB` -> `Admin Dashboard`

Main flow:
1. User submits CCCD front/back + selfie + declaredId
2. Backend validates required fields + duplicate declaredId check
3. Backend sends files to KYC Python service
4. KYC service returns OCR + face score + decision signals
5. Backend computes final decision and saves KYC status/reason
6. Admin only approves when auto-KYC is not auto-rejected

---

## 5) Fast Build Checklist (Lucidchart)

1. Create 4 pages and enable UML shape libraries.
2. Build Use Case first with IDs above.
3. Build Class diagram with classes + methods from section 2.
4. Add multiplicities exactly from section 2.3.
5. Build Sequence with message numbering from section 3.2.
6. Build Database ERD from section 6.
7. Add `alt` blocks for success/fail branches.
8. Export PDF/PNG per page.

---

## 6) Database Design (Collections + ERD)

Use Lucidchart shape library:
- `Entity Relationship`

### 6.1 Collections (MongoDB)

#### `users`
Purpose:
- Store account, role, profile, KYC state.

Key fields:
- `_id`
- `fullName`
- `email` (unique)
- `password`
- `role` (`user|provider|admin`)
- `kycStatus` (`unverified|pending|reviewing|verified|rejected`)
- `kycExtractedData.parsed.idNumber`
- `subscriptionPlan` (snapshot)

Recommended indexes:
- `{ email: 1 }` unique
- `{ role: 1 }`
- `{ kycStatus: 1 }`
- `{ "kycExtractedData.parsed.idNumber": 1 }` sparse/partial

#### `role_requests`
Purpose:
- User request to become provider; admin review workflow.

Key fields:
- `_id`
- `userId` -> `users._id`
- `status`
- `note`
- `reviewedBy` -> `users._id`

Indexes:
- `{ userId: 1, status: 1 }`

#### `properties`
Purpose:
- Core property listings for sale.

Key fields:
- `_id`
- `providerId` -> `users._id`
- `title`, `description`
- `price`, `type`, `bedrooms`, `bathrooms`, `area`
- `address`, `coordinates`
- `status` (`pending|approved|rejected|hidden|sold`)
- `images[]`
- `embedding[]` (vector)

Indexes:
- `{ providerId: 1, status: 1 }`
- `{ status: 1, createdAt: -1 }`
- text/atlas search indexes for search fields
- vector index on `embedding`

#### `favorites`
Purpose:
- User saved properties.

Key fields:
- `_id`
- `userId` -> `users._id`
- `propertyId` -> `properties._id`
- `createdAt`

Indexes:
- `{ userId: 1, propertyId: 1 }` unique
- `{ propertyId: 1 }`

#### `messages`
Purpose:
- Direct chat, system notifications, AI conversation logs.

Key fields:
- `_id`
- `conversationId`
- `senderId` -> `users._id`
- `receiverId` -> `users._id`
- `content`, `imageUrl`
- `isRead`
- `createdAt`

Indexes:
- `{ conversationId: 1, createdAt: 1 }`
- `{ receiverId: 1, isRead: 1, createdAt: -1 }`

#### `subscriptions`
Purpose:
- Active plan state per provider/user.

Key fields:
- `_id`
- `userId` -> `users._id`
- `plan` (`free|pro|proplus`)
- `status` (`active|expired|cancelled`)
- `startDate`, `endDate`

Indexes:
- `{ userId: 1, status: 1 }`
- `{ endDate: 1, status: 1 }`

#### `transactions`
Purpose:
- Payment transactions (VNPay/PayPal).

Key fields:
- `_id`
- `userId` -> `users._id`
- `subscriptionId` -> `subscriptions._id`
- `amount`
- `paymentMethod`
- `status`
- `transactionRef` (unique)

Indexes:
- `{ transactionRef: 1 }` unique
- `{ userId: 1, createdAt: -1 }`
- `{ subscriptionId: 1 }`

#### `provider_sales_stats`
Purpose:
- Keep sold KPIs even if property visibility changes.

Key fields:
- `_id`
- `providerId` -> `users._id`
- `totalSoldProperties`
- `totalSoldValue`
- `lastSoldAt`
- `recentSoldProperties[]`

Indexes:
- `{ providerId: 1 }` unique

#### `chatbot_memories`
Purpose:
- Persistent AI memory by user.

Key fields:
- `_id`
- `userId` -> `users._id`
- `recentTurns[]`
- `preferenceProfile`
- `summary`
- `updatedAt`

Indexes:
- `{ userId: 1 }` unique
- `{ updatedAt: -1 }`

### 6.2 Relationship Description (for ERD connectors)

- `users (1) ---- (N) properties` via `properties.providerId`
- `users (1) ---- (N) role_requests` via `role_requests.userId`
- `users (1) ---- (N) subscriptions` via `subscriptions.userId`
- `subscriptions (1) ---- (N) transactions` via `transactions.subscriptionId`
- `users (1) ---- (N) transactions` via `transactions.userId`
- `users (1) ---- (N) favorites` via `favorites.userId`
- `properties (1) ---- (N) favorites` via `favorites.propertyId`
- `users (1) ---- (N) messages` as sender via `messages.senderId`
- `users (1) ---- (N) messages` as receiver via `messages.receiverId`
- `users (1) ---- (1) provider_sales_stats` via `provider_sales_stats.providerId`
- `users (1) ---- (1) chatbot_memories` via `chatbot_memories.userId`

### 6.3 ERD Layout Suggestion (Lucidchart)

- Center: `users`
- Left cluster: `role_requests`, `subscriptions`, `transactions`
- Right cluster: `properties`, `favorites`, `provider_sales_stats`
- Bottom cluster: `messages`, `chatbot_memories`

Connector labels:
- Use label format `FK: <fieldName>`
  - Example: connector from `properties` to `users` label `FK: providerId`

### 6.4 Quick ERD Build Steps

1. Create one entity box per collection in section 6.1.
2. Add PK `_id` at top of each entity.
3. Add FK fields with `(FK)` suffix in child tables.
4. Draw crow's-foot relationships using section 6.2 cardinalities.
5. Mark unique constraints in notes (`email`, `transactionRef`, `userId` in one-to-one stats/memory).
