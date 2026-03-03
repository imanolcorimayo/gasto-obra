# Gasto Obra — Full Code Audit Report

**Date:** 2026-03-03
**Scope:** Complete monorepo (`/web` + `/server`)
**Purpose:** Pre-branding audit to guide the upcoming visual overhaul

---

## Table of Contents

1. [Architecture & Folder Structure](#1-architecture--folder-structure)
2. [Component Inventory](#2-component-inventory)
3. [Styling & Visual Debt](#3-styling--visual-debt)
4. [Data Model (Firestore)](#4-data-model-firestore)
5. [Backend (Express API)](#5-backend-express-api)
6. [State Management (Pinia)](#6-state-management-pinia)
7. [Dependencies](#7-dependencies)
8. [Summary & Recommendations](#8-summary--recommendations)

---

## 1. Architecture & Folder Structure

### Monorepo Layout

```
gasto-obra/
├── .gitignore
├── CLAUDE.md                          # Project-wide context
├── docs/
│   ├── GastoObra_ManualDiseño_v1.html # Design system (HTML doc)
│   ├── GastoObra_SistemaLogo_v1.html  # Logo system (HTML doc)
│   └── audit-report.md               # This file
├── tasks/
│   ├── gap-analysis.md                # Feature gap analysis
│   ├── lessons.md                     # (placeholder)
│   └── todo.md                        # Implementation checklist
├── server/                            # Node.js backend
│   ├── CLAUDE.md
│   ├── package.json
│   ├── handlers/
│   │   └── GeminiHandler.js           # Gemini AI wrapper (171 lines)
│   ├── scripts/
│   │   └── send-daily-summary.js      # Cron script (235 lines)
│   └── webhooks/
│       └── wp_webhook.js              # WhatsApp webhook (1,587 lines)
└── web/                               # Nuxt 3 frontend
    ├── CLAUDE.md
    ├── package.json
    ├── nuxt.config.ts
    ├── tailwind.config.js
    ├── firebase.json
    ├── app.vue
    ├── assets/css/main.css            # Global styles (91 lines)
    ├── components/                    # 15 Vue components
    ├── composables/                   # 1 composable (useToast)
    ├── interfaces/                    # TypeScript interfaces
    ├── layouts/                       # 2 layouts
    ├── middleware/                     # 1 middleware (auth)
    ├── pages/                         # 11 pages
    ├── stores/                        # 5 Pinia stores
    └── utils/
        ├── index.ts                   # Helpers, constants, formatters
        ├── firebase.ts                # Firebase singleton setup
        └── odm/                       # Custom Object-Document Mapper
            ├── types.ts
            ├── validator.ts
            └── schema.ts
```

### Comparison to Standard Patterns

| Aspect | Current | Standard Nuxt 3 | Assessment |
|--------|---------|-----------------|------------|
| Monorepo tool | None (independent packages) | Turborepo / Nx / PNPM workspaces | **Acceptable** — only 2 packages, no shared code needs |
| Root package.json | Missing | Present with workspace config | **Minor gap** — no unified `dev`/`build` commands |
| SSR strategy | Disabled per-route, SPA-first | SSR by default | **Intentional** — SPA is appropriate for this auth-heavy app |
| TypeScript | Web: TS, Server: JS | Full TS | **Acceptable** — server is small enough that JS is fine |
| Shared code | Duplicated constants (categories, formatters) | Shared package/directory | **Notable gap** — `DEFAULT_EXPENSE_CATEGORIES` and `formatPrice` are duplicated between web and server |
| Environment config | `.env` per package, no `.env.example` | `.env.example` committed | **Gap** — new developers have no env template |

### Naming Conventions

- **Components:** PascalCase, prefixed with domain (`Expense*`, `Project*`, `Client*`, `App*`, `Category*`, `Recipient*`). Clean and consistent.
- **Pages:** Follow Nuxt conventions (`[id].vue`, `index.vue`). Well organized into route groups.
- **Stores:** Lowercase domain names (`project.ts`, `expense.ts`). Consistent.
- **Schemas (ODM):** camelCase with `Schema` suffix (`projectSchema.ts`). Consistent.

---

## 2. Component Inventory

### Components (15 files)

| Component | Lines | Purpose | Complexity | Notes |
|-----------|-------|---------|------------|-------|
| `AppHeader.vue` | 31 | Top bar: logo text + user display + "Salir" button | Low | No logo image — just orange text "Gasto Obra" |
| `AppLoader.vue` | 13 | Spinning loader with optional text | Low | Minimal, reusable |
| `AppModal.vue` | 45 | Teleported modal wrapper with transitions | Low | Uses `modal-*` utility classes from main.css |
| `CategoryManager.vue` | 119 | CRUD for expense categories with inline color picker | Medium | Standalone form with add/remove/restore-defaults |
| `ClientBalanceTable.vue` | 98 | Chronological table: expense/payment rows with running balance | Medium | Client-facing; uses `<table>` HTML |
| `ClientExpenseCard.vue` | 97 | Read-only expense card for client view | Low | Similar to ExpenseCard but without edit actions |
| `ExpenseCard.vue` | 149 | Editable expense card with mark-paid/pending actions | Medium | Color-coded borders by type; category pill badges |
| `ExpenseCreateModal.vue` | 358 | Full form modal: create expense, payment, or provider expense | **High** | 3 form modes, linked-payment toggle, recipient dropdown, items list. **Candidate for splitting** |
| `ExpenseEditModal.vue` | 355 | Full form modal: edit expense + move between projects | **High** | Nearly identical to Create modal. **Candidate for merging/extracting shared form** |
| `ExpenseList.vue` | 142 | Filterable list with type/status/category chip filters | Medium | Uses ExpenseCard as list item |
| `ExpenseSummary.vue` | 145 | Financial summary panel: totals, budget bar, category breakdown | Medium | Category colors rendered via inline `:style` |
| `ProjectCard.vue` | 58 | Grid card linking to project detail | Low | Status pill, total amount, expense count |
| `ProjectEditModal.vue` | 174 | Edit project + manage project categories | Medium | Embeds CategoryManager |
| `ProjectForm.vue` | 171 | Reusable form (9 fields: name, tag, budget, dates, client...) | Medium | Used by both New and Edit flows |
| `RecipientManager.vue` | 109 | CRUD for payment recipients (name, bank, platform, CUIT) | Medium | Inline add/remove pattern |

**Split recommendations:**
- `ExpenseCreateModal` + `ExpenseEditModal` share ~70% logic. Extract a shared `ExpenseForm.vue` (~250 lines) to avoid the duplication.
- `ExpenseCreateModal` handles 3 distinct form modes — consider splitting the form fields into a composition.

### Pages (11 files)

| Page | Route | Auth | Lines | Purpose |
|------|-------|------|-------|---------|
| `index.vue` | `/` | No | 121 | Landing: Google login, feature cards, auto-redirect |
| `projects/index.vue` | `/projects` | Yes | 86 | Grid of ProjectCards |
| `projects/new.vue` | `/projects/new` | Yes | 60 | Create project (wraps ProjectForm) |
| `projects/[id].vue` | `/projects/[id]` | Yes | 462 | **Main workhorse page.** Project detail + expense history + summary + 3 modals |
| `settings/whatsapp.vue` | `/settings/whatsapp` | Yes | 259 | WhatsApp linking flow (generate code, status, unlink) |
| `settings/categories.vue` | `/settings/categories` | Yes | 108 | Global categories (wraps CategoryManager) |
| `settings/recipients.vue` | `/settings/recipients` | Yes | 111 | Payment recipients (wraps RecipientManager) |
| `client/index.vue` | `/client` | Yes | 59 | List projects joined as client |
| `client/join.vue` | `/client/join` | No* | 146 | Join project via shareToken query param |
| `client/project/[id].vue` | `/client/project/[id]` | Yes | 308 | Client view: read-only summary + balance table + expense list |
| `view/[token].vue` | `/view/[token]` | No | 202 | Public view via share link (no auth required) |

**Notes:**
- `projects/[id].vue` at 462 lines is the largest page and manages 3 modals inline. Consider extracting modal state management.
- The `/view/[token]` public page duplicates some layout from client pages — potential for shared layout extraction.

### Layouts (2 files)

| Layout | Lines | Usage |
|--------|-------|-------|
| `default.vue` | 70 | Authenticated pages: AppHeader → tab navigation (Proyectos, Mis Obras, Configuracion) → slot → footer |
| `landing.vue` | ~5 | Public pages: bare slot, no chrome |

---

## 3. Styling & Visual Debt

### Design System: Current State

The app uses a **dark-only theme** with a well-defined Tailwind config.

#### Color Palette (from `tailwind.config.js`)

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#E67E22` | Orange — brand color, buttons, active tabs, expense amounts |
| `secondary` | `#2C3E50` | Dark blue-gray — secondary buttons (rarely used in templates) |
| `danger` | `#E74C3C` | Red — delete actions, error states |
| `base` | `#1A1D23` | Near-black — page background, body |
| `warning` | `#F1C40F` | Yellow — budget warnings, paused status |
| `accent` | `#3498DB` | Blue — links, informational elements |
| `success` | `#27AE60` | Green — payment amounts, success states |
| `surface` | `#2A2D35` | Dark gray — card backgrounds |
| `surface-hover` | `#33363F` | Slightly lighter gray — card hover states |
| `border-surface` | `#3B3F48` | Border color token |

#### Colors Hardcoded OUTSIDE Tailwind Config

These colors are defined in JavaScript/TypeScript files and rendered via inline `:style` bindings, **bypassing Tailwind tokens**:

**Default category colors** (in `utils/index.ts`):
| Category | Hex | Conflicts with token? |
|----------|-----|----------------------|
| Materiales | `#3498DB` | Same as `accent` |
| Herramientas | `#E67E22` | Same as `primary` |
| Transporte | `#F1C40F` | Same as `warning` |
| Mano de obra | `#9B59B6` | **Not in Tailwind config** (purple) |
| Comida | `#27AE60` | Same as `success` |
| Otros | `#95A5A6` | **Not in Tailwind config** (gray) |

**Payment method colors** (in `utils/index.ts`):
| Method | Hex |
|--------|-----|
| Transferencia | `#3498DB` |
| Efectivo | `#27AE60` |
| Tarjeta | `#9B59B6` |
| Mercado Pago | `#00B1EA` — **Not in config** |

**Payment status colors** (in `utils/index.ts`):
| Status | Hex |
|--------|-----|
| Pagado | `#27AE60` |
| Pendiente | `#E74C3C` |

**Scrollbar colors** (in `main.css`):
- `#4b5563` (scrollbar thumb) — Tailwind `gray-600`
- `#6b7280` (scrollbar thumb hover) — Tailwind `gray-500`

**Skeleton shimmer** (in `main.css`):
- `rgba(255,255,255,0.05)` — hardcoded

**Status badge colors** (in various components via Tailwind classes):
- Active: `bg-green-500/20 text-green-400`
- Paused: `bg-yellow-500/20 text-yellow-400`
- Completed: `bg-gray-500/20 text-gray-400`
- Pending: `bg-red-500/20 text-red-400`
- Payment: `bg-green-500/20 text-green-400`

#### Typography

- **Font family:** System default (no custom font defined in Tailwind config or CSS)
- **Heading sizes used:** `text-4xl` (landing h1), `text-2xl` (page titles), `text-xl` (section titles), `text-lg` (card titles, amounts)
- **Body text:** `text-sm` (most content), `text-xs` (metadata, badges, subtitles)
- **Font weights:** `font-bold` (headings), `font-semibold` (section titles, amounts), `font-medium` (buttons, labels)
- **Text colors:** `text-gray-100` (body default), `text-gray-300` (secondary), `text-gray-400` (tertiary), `text-gray-500` (muted), `text-gray-600` (very muted), `text-white` (emphasis)

#### Border Radii

- `rounded-xl` — cards (ProjectCard, ExpenseSummary, modals)
- `rounded-lg` — buttons, inputs, info boxes, smaller cards
- `rounded-full` — pills/badges, progress bar, category dots
- `rounded-t-xl sm:rounded-xl` — modal container (bottom sheet on mobile, centered on desktop)

#### Spacing Patterns

- Content max-width: `max-w-5xl` (layout)
- Page padding: `px-3 sm:px-6`
- Card padding: `p-4` to `p-5`
- Gap between sections: `gap-6`, `gap-12` (layout)
- Inter-element gaps: `gap-2`, `gap-3`

#### Custom CSS Classes (in `main.css`)

| Class | Purpose |
|-------|---------|
| `modal-backdrop` | Fixed overlay with centered flex |
| `modal-container` | Responsive modal (bottom sheet mobile, centered desktop) |
| `modal-header` | Flex header with border-bottom |
| `modal-close` | Gray close button |
| `modal-body` | Scrollable content |
| `modal-footer` | Bottom action bar |
| `btn-primary` | Orange button |
| `btn-secondary` | Gray button |
| `btn-danger` | Red button |
| `skeleton-shimmer` | Loading animation |
| `no-scrollbar` | Hide scrollbar |
| `dark-scrollbar` | Custom thin scrollbar |
| `nav-tab` / `nav-tab-active` | Navigation tab styling (scoped in default layout) |

### Visual Debt Rating: 2.5 / 5

**What's good (tokens exist, patterns are consistent):**
- Tailwind config defines a clear, purposeful color palette
- `main.css` has reusable utility classes for modals and buttons
- Card styling is consistent (`bg-surface rounded-xl border border-gray-700`)
- Responsive patterns are consistent (`grid-cols-1 sm:grid-cols-2`, `px-3 sm:px-6`)
- Dark theme is cohesive

**What needs work:**
- ~8 colors hardcoded in JS that bypass the Tailwind config (category colors, payment method colors, Mercado Pago blue)
- No custom font — relies on system defaults (fine for MVP, insufficient for brand)
- No logo image — just the text "Gasto Obra" in orange
- No animation/motion beyond the skeleton shimmer and modal transitions
- No empty states with illustrations (just plain text)
- Status badges use raw Tailwind color classes (`bg-green-500/20`) rather than semantic tokens
- Some Tailwind gray shades (`gray-600`, `gray-700`, `gray-800`) used interchangeably without clear meaning
- `btn-danger` uses `bg-red-600` instead of the `danger` token (`#E74C3C`)
- No dark/light theme toggle (dark only)
- Input styling is inconsistent — some use `bg-gray-800 border border-gray-600`, others use different grays

---

## 4. Data Model (Firestore)

### Collections Overview

```
Firestore
├── projects          # Renovation projects (provider-scoped)
├── expenses          # All financial records (project-scoped)
├── categories        # Custom expense categories (user + project scoped)
├── recipients        # Payment recipients (user-scoped)
└── whatsappLinks     # WhatsApp account linking (phone-scoped)
```

### Document Schemas

#### `projects`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | string | Yes | — | Project display name |
| `tag` | string | Yes | — | Unique hashtag (e.g., `flores3b`), lowercase, no spaces |
| `description` | string | No | — | Free text |
| `address` | string | No | — | Physical location |
| `clientName` | string | No | — | Apartment owner name |
| `clientPhone` | string | No | — | WhatsApp number for daily summaries |
| `providerId` | string | Yes | currentUser.uid | Firebase Auth UID |
| `status` | string | No | `"active"` | `active` \| `paused` \| `completed` |
| `shareToken` | string | No | UUID v4 | Generated on creation, used for public links |
| `budget` | number | No | — | Estimated total budget (ARS) |
| `startDate` | date | No | — | Project start date |
| `estimatedEndDate` | date | No | — | Target completion |
| `clientUserId` | string | No | — | Firebase UID if client joins via share link |
| `createdAt` | timestamp | Auto | serverTimestamp | — |
| `updatedAt` | timestamp | Auto | serverTimestamp | — |

#### `expenses`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `projectId` | string | Yes | — | Reference to project |
| `providerId` | string | Yes | currentUser.uid | — |
| `title` | string | No | — | Expense title |
| `description` | string | No | — | Additional details |
| `amount` | number | Yes | — | Amount in ARS (min: 0) |
| `category` | string | No | `"otros"` | Category value |
| `type` | string | No | `"expense"` | `expense` \| `payment` \| `provider_expense` |
| `items` | array | No | — | Line items `[{name, amount}]` |
| `imageUrl` | string | No | — | Receipt/proof image URL |
| `audioTranscription` | string | No | — | Transcribed audio text |
| `originalMessage` | string | No | — | Raw WhatsApp message |
| `paymentStatus` | string | No | `"paid"` | `paid` \| `pending` |
| `paymentMethod` | string | No | — | `transferencia` \| `efectivo` \| `tarjeta` \| `mercadopago` |
| `recipientName` | string | No | — | Payment recipient name |
| `recipientBankInfo` | string | No | — | Bank details (CBU/alias) |
| `recipientPlatform` | string | No | — | Payment platform |
| `recipientCuit` | string | No | — | CUIT/CUIL number |
| `linkedExpenseId` | string | No | — | Cross-reference to related expense |
| `linkedPaymentId` | string | No | — | Cross-reference to related payment |
| `source` | string | No | `"web"` | `web` \| `whatsapp` |
| `date` | date | No | — | Transaction date |
| `createdAt` | timestamp | Auto | serverTimestamp | — |

#### `categories`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | Yes | Provider's Firebase UID |
| `projectId` | string | No | `null` = global category, otherwise project-specific override |
| `value` | string | No | Machine-readable key (e.g., `materiales`) |
| `label` | string | No | Display name (e.g., `Materiales`) |
| `color` | string | No | Hex color (e.g., `#3498DB`) |

#### `recipients`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | string | Yes | Provider's Firebase UID |
| `name` | string | No | Recipient name |
| `bankInfo` | string | No | CBU/alias |
| `platform` | string | No | Payment platform |
| `cuit` | string | No | CUIT/CUIL |

#### `whatsappLinks`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | string | Yes | `pending` \| `linked` |
| `userId` | string | Yes | Firebase Auth UID |
| `phoneNumber` | string | No | Normalized phone (e.g., `5411...`) |
| `contactName` | string | No | WhatsApp profile name |
| `createdAt` | timestamp | Auto | For pending: used to calculate 10-min expiry |
| `linkedAt` | timestamp | No | When account was linked |

**Document ID:** The phone number itself (e.g., `"541134567890"`) is used as the document ID for whatsappLinks.

### Structural Concerns

1. **No Firestore security rules in repo.** The `firestore.rules` file is not present. All security relies on client-side ODM user-scoping and server-side Firebase Admin. This means any authenticated user could read/write any document directly via the Firestore SDK if they bypassed the app.

2. **No composite indexes defined.** For queries combining `userId`/`providerId` with `orderBy` or additional `where` clauses, Firestore auto-indexes may fail. No `firestore.indexes.json` file exists.

3. **Duplicated constants.** `DEFAULT_EXPENSE_CATEGORIES` is defined in both `web/utils/index.ts` (as objects with value/label/color) and `server/webhooks/wp_webhook.js` (as a flat string array). These can drift.

4. **Recipient data denormalized onto expenses.** Each expense stores `recipientName`, `recipientBankInfo`, `recipientPlatform`, `recipientCuit` as flat fields rather than a `recipientId` reference. This means updating a recipient's info doesn't update historical expenses (which may be intentional for audit trail purposes).

5. **No soft delete.** Documents are hard-deleted. No `deletedAt` field or archive mechanism.

6. **Type field overloading.** The `expenses` collection stores three different entity types (`expense`, `payment`, `provider_expense`) in one collection. This is standard for Firestore but means queries must always filter by `type`.

---

## 5. Backend (Express API)

### Architecture

The server is a single Express application with one webhook endpoint and one cron script:

```
POST /webhook    # Receives WhatsApp messages
GET  /webhook    # WhatsApp verification handshake
```

Plus one standalone script:
```
node scripts/send-daily-summary.js   # Daily 8 PM ART cron
```

### Route Flow

```
WhatsApp → Meta Cloud API → POST /webhook → processMessage()
                                           ├── Text commands (VINCULAR, DESVINCULAR, AYUDA, PROYECTOS, RESUMEN, PAGO, PROPIO)
                                           ├── Text expense ($500 Titulo #tag)
                                           ├── Image message → downloadWhatsAppMedia() → GeminiHandler.parseReceiptImage()
                                           └── Audio message → downloadWhatsAppMedia() → GeminiHandler.transcribeAudio()
```

### Webhook Processing Details

**Message types handled:**
- **Text:** Commands (uppercase keywords) and expense messages (`$amount title #tag d:desc c:category`)
- **Image:** Receipt photos processed by Gemini Vision. Extracts items, amounts, store name, transaction type.
- **Audio:** Voice messages transcribed by Gemini. Extracts structured data including fuzzy project matching.

**Pending expense system:**
- In-memory Map with 10-minute TTL
- Used when project selection is needed (multiple active projects)
- Used when confirmation is needed (for AI-parsed image/audio expenses)
- User responds with project `#tag` or `si`/`no`

**Client notifications:**
- When an expense or payment is registered, `notifyClient()` sends a WhatsApp message to `project.clientPhone` if configured.
- Provider expenses (`provider_expense` type) are NOT sent to clients.

### Gemini AI Integration

**Model:** `gemini-2.5-flash-lite`

| Capability | Method | Temperature | Notes |
|------------|--------|-------------|-------|
| Receipt OCR | `parseReceiptImage()` | default | Extracts structured JSON from receipt photos |
| Audio transcription | `transcribeAudio()` | default | Argentine Spanish transcription + structured extraction |
| Expense categorization | `categorizeExpense()` | 0.2 | Low temp for consistency |

### File Size Concern

`wp_webhook.js` is **1,587 lines** in a single file. This is the primary structural concern on the server side. It contains:
- Express setup and Firebase initialization
- WhatsApp API integration (send/receive/download)
- All command handlers
- Expense parsing logic
- Pending expense state management
- Client notification logic
- Category resolution
- Phone number normalization
- Transaction type helpers

**Recommendation:** Split into modules: `routes/`, `handlers/`, `services/`, `utils/`.

### Security Audit

| Issue | Severity | Details |
|-------|----------|---------|
| **No request validation middleware** | High | No body size limit, no JSON validation, no schema validation on incoming webhooks |
| **No rate limiting** | High | The webhook endpoint accepts unlimited requests |
| **No helmet or CORS** | Medium | Express runs without security headers |
| **Secrets in .env (committed?)** | Critical | The `.env` file contains API keys, service account, and access tokens. `.gitignore` excludes `.env` but no `.env.example` exists as a template |
| **No webhook signature verification** | High | WhatsApp Cloud API provides `X-Hub-Signature-256` headers. The server only checks the `verify_token` on GET (initial handshake) but does **not** verify HMAC signatures on incoming POST messages |
| **In-memory state** | Medium | `pendingExpenses` Map is lost on restart. Not critical (10-min TTL) but could cause confusion |
| **No error monitoring** | Low | Errors are `console.error` only, no Sentry/logging service |
| **No input sanitization** | Medium | User messages from WhatsApp are stored directly in Firestore (`originalMessage`, `title`) without sanitization |
| **Gemini API key exposed** | Medium | If `.env` were leaked, the Gemini API key grants access to AI services |

### Daily Summary Script

`send-daily-summary.js` (235 lines):
- Runs as standalone Node process (intended for cron)
- Queries all active projects with `clientPhone`
- Filters today's expenses (ART timezone aware)
- Sends formatted WhatsApp summary with totals and view link
- Includes accumulated project totals (all-time)
- Properly handles timezone conversion (ART → UTC for Firestore queries)

---

## 6. State Management (Pinia)

### Store Inventory

| Store | File | Lines | State Fields | Getters | Actions | Scope Assessment |
|-------|------|-------|-------------|---------|---------|-----------------|
| `project` | `stores/project.ts` | 238 | `projects[]`, `clientProjects[]`, `currentProject` | `activeProjects`, `completedProjects`, `pausedProjects` | fetch, create, update, delete, fetchByShareToken, joinAsClient, clearState | **Well-scoped** — clear provider/client separation |
| `expense` | `stores/expense.ts` | 194 | `expenses[]`, `isLoading`, `error` | `totalAmount`, `expensesByCategory`, `clientExpenses`, `payments`, `providerExpenses`, various totals, `clientBalance` | fetchByProjectId, fetchByProjectIdPublic, create, update, delete, clearState | **Well-scoped** — clean separation of expense types |
| `category` | `stores/category.ts` | 174 | `globalCategories[]`, `projectCategoriesMap{}`, `isLoading`, `error` | `getResolved()` | fetchGlobal, fetchForProject, fetchForProviderPublic, saveGlobal, saveForProject, removeProjectOverride, clearState | **Well-scoped** — handles the global→project override hierarchy cleanly |
| `recipient` | `stores/recipient.ts` | 85 | `recipients[]`, `isLoading`, `error` | (none) | fetchAll, saveAll, clearState | **Simple and clean** |
| `whatsapp` | `stores/whatsapp.ts` | 201 | `linkedAccount`, `pendingCode`, `codeExpiresAt`, `isLoading`, `isGenerating`, `error` | `isLinked`, `hasValidCode` | fetchLinkedAccount, fetchPendingCode, generateCode, unlinkAccount, clearPendingCode, subscribeToChanges, unsubscribe, clearState | **Well-scoped** — manages full linking lifecycle |

### Patterns

- All stores use `clearState()` for cleanup (important for auth logout).
- All stores use the ODM Schema classes for Firestore queries — no direct Firestore SDK calls.
- Lazy singleton pattern for schema instances (created on first use).
- Error handling is consistent: try/catch with toast notifications at the page level.
- No cross-store dependencies (stores don't import other stores).

### Concerns

1. **No SSR handling.** Stores assume client-side only. This is fine since SSR is disabled for auth pages, but `onMounted` is used defensively.
2. **No cache invalidation strategy.** Data is fetched on mount and never refreshed unless navigating away and back.
3. **No optimistic updates.** All mutations wait for Firestore round-trip before updating UI.
4. **`expense` store has many getters** that could be computed at the component level — the store does filtering that's only used by specific views.

---

## 7. Dependencies

### Web (`/web/package.json`)

#### Dev Dependencies

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `nuxt` | `^3.10.0` | Current series | Latest is 3.16.x (March 2026). Minor version upgrade recommended |
| `vue` | `^3.4.15` | OK | Peer of Nuxt |
| `vue-router` | `^4.2.5` | OK | Peer of Nuxt |
| `tailwindcss` | `^3.4.1` | OK | Tailwind v4 is available but not required |
| `autoprefixer` | `^10.4.17` | OK | PostCSS plugin |
| `postcss` | `^8.4.33` | OK | — |
| `dayjs-nuxt` | `^2.1.9` | OK | Nuxt module for DayJS |
| `@vueuse/nuxt` | `^10.7.2` | OK | VueUse utilities |
| `unplugin-icons` | `^0.19.0` | OK | Icon loading |
| `@iconify/json` | `^2.2.208` | OK | Icon data |

#### Runtime Dependencies

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `firebase` | `^10.8.0` | OK | Firebase client SDK |
| `@firebase/app-types` | `^0.9.0` | **Potentially unnecessary** — types are included in `firebase` package |
| `pinia` | `^2.1.7` | OK | State management |
| `@pinia/nuxt` | `^0.5.1` | OK | Nuxt integration |
| `@vueuse/core` | `^10.7.2` | OK | Used for `useClipboard` and similar |
| `vue3-toastify` | `^0.2.1` | OK | Toast notifications |

**Missing from dependencies:**
- No linter (`eslint`) — only Prettier is configured (`.prettierrc.json`)
- No test framework (`vitest`, `@vue/test-utils`)
- No type-checking build step

### Server (`/server/package.json`)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `express` | `^4.21.0` | OK | Express 5 is available but stable on 4 |
| `firebase-admin` | `^12.0.0` | OK | Firebase Admin SDK |
| `dotenv` | `^16.4.5` | OK | Environment loading |

**Missing from dependencies (security):**
- `helmet` — security headers
- `cors` — CORS configuration
- `express-rate-limit` — rate limiting

**Missing from dependencies (operational):**
- No process manager (`pm2`)
- No logging library (`winston`, `pino`)
- No monitoring/error tracking

**Not in package.json but used:**
- The Gemini API is called via `fetch()` directly in `GeminiHandler.js` — no `@google/generative-ai` SDK. This is intentional (avoids a dependency) but means no SDK-level retries or error handling.

---

## 8. Summary & Recommendations

### Top 5 Strengths

1. **Clean ODM abstraction.** The `utils/odm/` layer (Schema base class + Validator + typed results) provides a well-structured data access pattern with validation, user-scoping, and public query support. This is genuinely well-architected for a Firebase project.

2. **Thoughtful Tailwind configuration.** The custom theme tokens (`primary`, `surface`, `base`, etc.) show design intent. The `main.css` utility classes (`btn-primary`, `modal-*`) reduce repetition. The foundation is there for a brand overhaul.

3. **Complete WhatsApp integration.** Text, image (Gemini Vision), and audio (Gemini transcription) are all supported. The pending-expense confirmation flow is a good UX pattern. Client notifications work. The daily summary script is timezone-aware.

4. **Clear domain separation.** Provider vs. Client roles are cleanly separated across pages, stores, and API logic. Share tokens enable no-auth public access without compromising security.

5. **Consistent patterns.** Component naming, store structure, error handling (try/catch + toast), and Firestore querying all follow predictable patterns. A new developer can read one component/store and understand them all.

### Top 5 Issues

1. **No Firestore security rules.** This is the most critical gap. Any authenticated user can read/write any document by bypassing the app. Firestore rules should enforce user-scoping and field-level validation server-side.

2. **Server is a 1,587-line monolith.** `wp_webhook.js` handles routing, business logic, external API calls, state management, and notifications in one file. This makes it hard to test, debug, or extend.

3. **No tests, no CI/CD.** Zero test coverage across the entire codebase. No GitHub Actions, no pre-commit hooks. Changes go straight to production via `firebase deploy`.

4. **No webhook signature verification.** The WhatsApp POST endpoint doesn't verify `X-Hub-Signature-256`, making it possible to send fake messages to the server.

5. **Duplicated form modals.** `ExpenseCreateModal` (358 lines) and `ExpenseEditModal` (355 lines) share ~70% of their code. This leads to divergence risk and doubles the work for any form change.

### Visual Overhaul Assessment

**Effort level: Medium.** The Tailwind foundation is solid. The main work will be:

1. **Branding layer** (~2 days): Custom font, logo image, updated color palette, favicon
2. **Token consolidation** (~1 day): Move hardcoded JS colors into Tailwind config or CSS variables, create semantic status/category token system
3. **Component polish** (~3 days): Consistent input styling, empty state illustrations, button hierarchy refinement, subtle animations/transitions, loading skeletons for cards
4. **Layout refinements** (~1 day): Sidebar navigation (optional), footer content, responsive polish
5. **Landing page redesign** (~1 day): Hero section, better feature presentation, social proof

The existing design docs in `/docs/` (ManualDiseño and SistemaLogo) appear to contain a prepared brand system that hasn't been applied yet.

### Text Description of Current Dashboard Appearance

**Landing page (`/`):** A centered, vertically-stacked layout on a near-black background (`#1A1D23`). At top, the text "Gasto Obra" in bold orange (`#E67E22`) with a gray subtitle. Below that, three feature cards in dark gray (`#2A2D35`) with green/orange/blue icons (WhatsApp, Camera, Link). At the bottom, a full-width white Google login button. No images, no logo, no illustrations. Minimal and functional.

**Main dashboard (`/projects`):** The header is a thin horizontal bar at the top with "Gasto Obra" in orange text on the left and the user's name + "Salir" link on the right, separated from content by a gray border line. Below that, a tab navigation bar (Proyectos | Mis Obras | Configuracion) with the active tab underlined in orange. The content area shows project cards in a responsive grid (1-2 columns). Each card is a dark gray rounded rectangle with the project name in white, tag in gray, a colored status pill (green for Activo, yellow for Pausado), optional client name and address in gray, and a total amount in orange at the bottom. Max content width is capped at `max-w-5xl` (~1024px) with a centered layout.

**Project detail (`/projects/[id]`):** A back-link arrow at top, then the project title in large bold white text with its tag and status pill. Two action buttons (gray "Editar" and a status dropdown). Below, project metadata in small info boxes (Cliente, Direccion, Presupuesto, Cronograma). Then a "Link para el cliente" box with a copy button. Three action buttons for adding expenses: orange "Gasto" (primary), green-outlined "Cobro", gray "Gasto propio". The main content area splits into a 1/3 + 2/3 grid: left side has the financial summary panel (totals in orange/green/red, a budget progress bar, and category breakdown with colored dots), right side has the expense history list. Each expense card shows title, amount (colored by type), category pill badge, date, and action buttons.

**Overall feel:** Dark, utilitarian, data-dense. The visual hierarchy works through color and font weight rather than spacing or decoration. No gradients, shadows are minimal, no custom illustrations. It reads as a functional prototype — all the information is accessible but there's no emotional design, brand personality, or visual delight.
