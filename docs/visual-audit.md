# Visual Audit — Gasto Obra

*2026-03-03 — Compared against ManualMarca v2*

---

## Token Mapping

### Color Tokens: Tailwind Config vs Brand Manual

| Current Token (tailwind.config.js) | go- CSS Variable | Status |
|---|---|---|
| `go-bg` | `--go-bg: #171A14` | Same |
| `go-bg-elevated` | `--go-bg-elevated: #1D201A` | Same |
| `go-surface` | `--go-surface: #24271F` | Same |
| `go-surface-hover` | `--go-surface-hover: #2E312A` | Same |
| `go-surface-alt` | `--go-surface-alt: #353830` | Same |
| `go-border` | `--go-border: #3D4036` | Same |
| `go-border-subtle` | `--go-border-subtle: #2E312A` | Same |
| `go-primary` | `--go-primary: #FFAB40` | Same |
| `go-primary-hover` | `--go-primary-hover: #FFBC62` | Same |
| `go-primary-active` | `--go-primary-active: #E99A35` | Same |
| `go-primary-muted` | `--go-primary-muted: rgba(255,171,64,0.12)` | Same |
| `go-primary-on` | `--go-primary-on: #1A1200` | Same |
| `go-secondary` | `--go-secondary: #6B8F71` | Same |
| `go-secondary-hover` | `--go-secondary-hover: #7DA383` | Same |
| `go-secondary-muted` | `--go-secondary-muted: rgba(107,143,113,0.12)` | Same |
| `go-success` | `--go-success: #5CB870` | Same |
| `go-success-muted` | `--go-success-muted: rgba(92,184,112,0.12)` | Same |
| `go-danger` | `--go-danger: #D4544A` | Same |
| `go-danger-muted` | `--go-danger-muted: rgba(212,84,74,0.12)` | Same |
| `go-warning` | `--go-warning: #E8B83A` | Same |
| `go-warning-muted` | `--go-warning-muted: rgba(232,184,58,0.12)` | Same |
| `go-info` | `--go-info: #5A9BBF` | Same |
| `go-info-muted` | `--go-info-muted: rgba(90,155,191,0.12)` | Same |
| `go-text` | `--go-text: #F0EBE1` | Same |
| `go-text-secondary` | `--go-text-secondary: #B5B0A4` | Same |
| `go-text-tertiary` | `--go-text-tertiary: #8A8579` | Same |
| `go-text-muted` | `--go-text-muted: #5E594F` | Same |
| `go-text-inverse` | `--go-text-inverse: #171A14` | Same |
| `go-cat-materiales` | `--go-cat-materiales: #5A8FB8` | Same |
| `go-cat-herramientas` | `--go-cat-herramientas: #D4793D` | Same |
| `go-cat-transporte` | `--go-cat-transporte: #BFA63D` | Same |
| `go-cat-mano-de-obra` | `--go-cat-mano-de-obra: #A86B5E` | Same |
| `go-cat-comida` | `--go-cat-comida: #6B9B6B` | Same |
| `go-cat-otros` | `--go-cat-otros: #8B847A` | Same |
| `go-pay-transferencia` | `--go-pay-transferencia: #5A8FB8` | Same |
| `go-pay-efectivo` | `--go-pay-efectivo: #6B9B6B` | Same |
| `go-pay-tarjeta` | `--go-pay-tarjeta: #8B6BA3` | Same |
| `go-pay-mercadopago` | `--go-pay-mercadopago: #00B1EA` | Same |

**Summary:** All CSS custom properties in `main.css` match the brand manual exactly. The `tailwind.config.js` correctly maps all of them to Tailwind utility classes. Font families and border-radius tokens are also correctly defined in both files.

**Missing from Tailwind config:** `go-radius-full` (9999px) — only `go-sm`, `go-md`, `go-lg`, `go-xl` are defined. Components use `rounded-full` directly which achieves the same result, so this is cosmetic.

---

## Hardcoded Color Inventory

These are all hardcoded hex colors in JS/TS that should use go- CSS variable equivalents instead.

### web/utils/index.ts — Category Colors (lines 27–32)

| Hardcoded Hex | Used For | Should Be (go- token) |
|---|---|---|
| `#3498DB` | materiales | `--go-cat-materiales` (#5A8FB8) |
| `#E67E22` | herramientas | `--go-cat-herramientas` (#D4793D) |
| `#F1C40F` | transporte | `--go-cat-transporte` (#BFA63D) |
| `#9B59B6` | mano de obra | `--go-cat-mano-de-obra` (#A86B5E) |
| `#27AE60` | comida | `--go-cat-comida` (#6B9B6B) |
| `#95A5A6` | otros | `--go-cat-otros` (#8B847A) |

### web/utils/index.ts — Transaction Type Colors (lines 92–94)

| Hardcoded Hex | Used For | Should Be |
|---|---|---|
| `#3498DB` | expense | `--go-primary` or `--go-cat-materiales` |
| `#27AE60` | payment (cobro) | `--go-success` (#5CB870) |
| `#95A5A6` | provider_expense | `--go-text-tertiary` (#8A8579) |

### web/utils/index.ts — Payment Status Colors (lines 98–99)

| Hardcoded Hex | Used For | Should Be |
|---|---|---|
| `#27AE60` | paid | `--go-success` (#5CB870) |
| `#E74C3C` | pending | `--go-danger` (#D4544A) |

### web/utils/index.ts — Payment Method Colors (lines 103–106)

| Hardcoded Hex | Used For | Should Be |
|---|---|---|
| `#3498DB` | transferencia | `--go-pay-transferencia` (#5A8FB8) |
| `#27AE60` | efectivo | `--go-pay-efectivo` (#6B9B6B) |
| `#9B59B6` | tarjeta | `--go-pay-tarjeta` (#8B6BA3) |
| `#00B1EA` | mercadopago | `--go-pay-mercadopago` (#00B1EA) — only this one matches |

### web/utils/index.ts — Fallback Color (lines 74, 116)

| Hardcoded Hex | Used For | Should Be |
|---|---|---|
| `#95A5A6` | fallback for unknown category/status | `--go-cat-otros` (#8B847A) |

### web/components/CategoryManager.vue — Color Palette (line 75)

| Hardcoded Hex | Context |
|---|---|
| `#E74C3C`, `#3498DB`, `#2ECC71`, `#F39C12`, `#9B59B6`, `#1ABC9C`, `#E67E22`, `#34495E` | Color picker palette for custom categories |

These are all old "Flat UI" palette colors, none from the brand system. Should be replaced with the go- category palette colors: `#5A8FB8`, `#D4793D`, `#BFA63D`, `#A86B5E`, `#6B9B6B`, `#8B847A`, plus `#8B6BA3` and `#5A9BBF`.

---

## Raw Gray Classes

All `bg-gray-*`, `text-gray-*`, `border-gray-*`, `placeholder-gray-*`, `hover:bg-gray-*`, `hover:text-gray-*` usages that need semantic go- token replacements.

### Form Input Pattern (most common — ~50 occurrences)

The pattern `bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary` appears across 8 component files:

**Files:** ProjectForm.vue (×10), ExpenseCreateModal.vue (×8), ExpenseEditModal.vue (×8), CategoryManager.vue (×2), RecipientManager.vue (×4), ExpenseList.vue (×3), projects/[id].vue (×1), client/project/[id].vue (×1), view/[token].vue (×1)

**Should become:** `bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary`

### Grouped by Component

#### AppLoader.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 4 | `text-go-text-tertiary` |

#### CategoryManager.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-600` | 12, 18, 25 | `border-go-border` |
| `bg-gray-800` | 18, 25 | `bg-go-surface` |
| `placeholder-gray-500` | 18, 25 | `placeholder-go-text-muted` |
| `text-gray-500` | 31 | `text-go-text-muted` |
| `text-gray-400` | 50 | `text-go-text-tertiary` |

#### ClientBalanceTable.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-500` | 5, 19, 40 | `text-go-text-muted` |
| `border-gray-700` | 5, 17 | `border-go-border` |
| `border-gray-800` | 17 | `border-go-border-subtle` |
| `text-gray-300` | 20 | `text-go-text` |
| `text-gray-600` | 22 | `text-go-text-muted` |

#### ClientExpenseCard.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 4, 28 | `border-go-border` |
| `text-gray-400` | 17, 34, 48, 56 | `text-go-text-tertiary` |
| `text-gray-300` | 35 | `text-go-text` |
| `text-gray-500` | 48, 52, 56 | `text-go-text-muted` |

#### ExpenseCard.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 4, 131 | `border-go-border` |
| `border-gray-600` | 92, 130 | `border-go-border` |
| `bg-gray-500/20` | 18 | `bg-go-surface-alt` |
| `text-gray-400` | 18, 29, 64, 68, 92, 136, 137 | `text-go-text-tertiary` |
| `text-gray-500` | 30, 44, 60, 76 | `text-go-text-muted` |
| `text-gray-300` | 62 | `text-go-text` |

#### ExpenseCreateModal.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 3 | `border-go-border` |
| `bg-gray-800` | 18, 31, 40, 55, 118, 133, 174, 182 | `bg-go-surface` |
| `border-gray-600` | 18, 31, 40, 55, 69, 79, 118, 133, 174, 182 | `border-go-border` |
| `text-gray-300` | 12, 23, 37, 50, 61, 115, 129 | `text-go-text` |
| `text-gray-500` | 6, 12, 18, 31, 54, 96, 140, 147, 158, 184 | `text-go-text-muted` |
| `text-gray-400` | 69, 79, 158 | `text-go-text-tertiary` |
| `placeholder-gray-500` | 18, 31, 55, 174, 182 | `placeholder-go-text-muted` |
| `bg-gray-800/50` | 91 | `bg-go-surface` |
| `border-gray-600/50` | 91 | `border-go-border-subtle` |
| `bg-gray-600` | 102 | `bg-go-surface-alt` |

#### ExpenseEditModal.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 3 | `border-go-border` |
| `bg-gray-800` | 33, 46, 55, 70, 100, 115, 156, 164, 195 | `bg-go-surface` |
| `border-gray-600` | 33, 46, 55, 70, 100, 115, 156, 164, 195 | `border-go-border` |
| `text-gray-300` | 9, 28, 52, 65, 76, 97, 111 | `text-go-text` |
| `text-gray-500` | 70, 122, 129, 166 | `text-go-text-muted` |
| `text-gray-400` | 19, 88, 140, 186 | `text-go-text-tertiary` |
| `placeholder-gray-500` | 33, 46, 70, 156, 164 | `placeholder-go-text-muted` |

#### ExpenseList.vue
| Class | Line | Replacement |
|---|---|---|
| `bg-gray-800` | 9, 21, 33 | `bg-go-surface` |
| `border-gray-600` | 9, 21, 33 | `border-go-border` |
| `text-gray-500` | 6, 18, 30, 44, 51 | `text-go-text-muted` |

#### ExpenseSummary.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 6, 23, 35, 69 | `border-go-border` |
| `text-gray-400` | 8, 12, 16, 20, 37, 62, 63 | `text-go-text-tertiary` |
| `text-gray-300` | 24, 62, 65 | `text-go-text` |
| `text-gray-500` | 47, 63, 65, 69 | `text-go-text-muted` |
| `text-gray-600` | 40, 63, 65 | `text-go-text-muted` |
| `bg-gray-700` | 40 | `bg-go-surface-alt` |

#### ProjectCard.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 2, 24 | `border-go-border` |
| `text-gray-400` | 6, 16, 20, 26, 53, 54 | `text-go-text-tertiary` |
| `text-gray-500` | 20, 26 | `text-go-text-muted` |
| `bg-gray-500/20` | 53, 54 | `bg-go-surface-alt` |

#### ProjectEditModal.vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 3, 15 | `border-go-border` |
| `text-gray-500` | 21, 36 | `text-go-text-muted` |
| `text-gray-400` | 36 | `text-go-text-tertiary` |
| `bg-gray-600` | 27 | `bg-go-surface-alt` |

#### ProjectForm.vue
| Class | Line | Replacement |
|---|---|---|
| `bg-gray-800` | 10, 23, 46, 57, 67, 81, 92, 101 | `bg-go-surface` |
| `border-gray-600` | 10, 23, 46, 57, 67, 81, 92, 101 | `border-go-border` |
| `text-gray-300` | 4, 15, 31, 41, 52, 62, 74, 88, 97 | `text-go-text` |
| `text-gray-500` | 17, 27, 69, 83 | `text-go-text-muted` |
| `placeholder-gray-500` | 10, 23, 46, 57, 67, 81, 92, 101 | `placeholder-go-text-muted` |

#### RecipientManager.vue
| Class | Line | Replacement |
|---|---|---|
| `bg-gray-800` | 7 | `bg-go-surface` |
| `bg-gray-700` | 14, 28, 35, 41 | `bg-go-surface` |
| `border-gray-600` | 7, 14, 28, 35, 41 | `border-go-border` |
| `text-gray-500` | 19, 51 | `text-go-text-muted` |
| `placeholder-gray-500` | 14, 28, 35, 41 | `placeholder-go-text-muted` |

### Grouped by Page

#### pages/index.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 7, 21 | `text-go-text-tertiary` |
| `text-gray-500` | 22 | `text-go-text-muted` |
| `bg-white` | 45 | *Keep* (Google brand button) |
| `text-gray-800` | 45 | *Keep* (Google brand button) |
| `hover:bg-gray-100` | 45 | *Keep* (Google brand button) |
| `border-gray-600` | 50 | `border-go-border` |

#### pages/projects/index.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 7, 21 | `text-go-text-tertiary` |
| `text-gray-600` | 20 | `text-go-text-muted` |
| `text-gray-500` | 22 | `text-go-text-muted` |

#### pages/projects/new.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 4, 9 | `text-go-text-tertiary` |
| `border-gray-700` | 13 | `border-go-border` |

#### pages/projects/[id].vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 8, 16, 25, 59, 63, 67, 75, 89, 238 | `text-go-text-tertiary` |
| `text-gray-500` | 59, 63, 67, 71, 75, 89 | `text-go-text-muted` |
| `border-gray-700` | 13, 46, 58, 62, 66, 70, 74, 85 | `border-go-border` |
| `bg-gray-800` | 46 | `bg-go-surface` |
| `border-gray-600` | 46 | `border-go-border` |
| `bg-gray-500/20` | 238 | `bg-go-surface-alt` |

#### pages/settings/whatsapp.vue
| Class | Line | Replacement |
|---|---|---|
| `bg-gray-700` | 6, 25, 64 | `bg-go-surface-alt` |
| `bg-gray-700/50` | 9, 12, 42 | `bg-go-surface-hover` |
| `text-gray-400` | 9, 12, 20, 36, 44, 65, 69, 76, 126 | `text-go-text-tertiary` |
| `text-gray-300` | 76, 92 | `text-go-text` |
| `text-gray-500` | 59, 92 | `text-go-text-muted` |
| `bg-gray-800` | 46, 47, 48, 80 | `bg-go-surface` |
| `text-gray-600` | 85 | `text-go-text-muted` |
| `hover:bg-gray-600` | 85 | `hover:bg-go-surface-hover` |
| `border-gray-700` | 5, 29, 62, 121 | `border-go-border` |
| `bg-gray-600` | 64 | `bg-go-surface-alt` |

#### pages/settings/categories.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 6, 12, 20, 48 | `text-go-text-tertiary` |
| `bg-gray-700` | 9, 25 | `bg-go-surface-alt` |
| `hover:bg-gray-700/50` | 6, 12 | `hover:bg-go-surface-hover` |
| `border-gray-700` | 5, 29, 43 | `border-go-border` |
| `bg-gray-800` | 52 | `bg-go-surface` |

#### pages/settings/recipients.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 6, 9, 20, 48 | `text-go-text-tertiary` |
| `bg-gray-700` | 12, 25 | `bg-go-surface-alt` |
| `hover:bg-gray-700/50` | 6, 9 | `hover:bg-go-surface-hover` |
| `border-gray-700` | 5, 29, 43 | `border-go-border` |

#### pages/view/[token].vue
| Class | Line | Replacement |
|---|---|---|
| `border-gray-700` | 4, 38, 42, 71, 85, 96, 113 | `border-go-border` |
| `text-gray-400` | 16, 25, 29, 39, 54, 75, 83, 91, 114 | `text-go-text-tertiary` |
| `text-gray-500` | 17, 39, 43, 53, 60, 91, 127 | `text-go-text-muted` |
| `text-gray-300` | 114 | `text-go-text` |
| `bg-gray-800` | 63 | `bg-go-surface` |
| `border-gray-600` | 63, 71 | `border-go-border` |
| `bg-gray-600` | 75, 83 | `bg-go-surface-alt` |

#### pages/client/index.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 8, 23, 28 | `text-go-text-tertiary` |
| `text-gray-500` | 9 | `text-go-text-muted` |
| `border-gray-700` | 17 | `border-go-border` |
| `border-gray-600` | 17 | `border-go-border` |
| `bg-gray-500/20` | 23 | `bg-go-surface-alt` |

#### pages/client/join.vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 9, 12, 21, 25, 33, 59 | `text-go-text-tertiary` |
| `text-gray-500` | 9, 59 | `text-go-text-muted` |
| `border-gray-700` | 10, 19 | `border-go-border` |
| `text-gray-300` | 33, 42 | `text-go-text` |

#### pages/client/project/[id].vue
| Class | Line | Replacement |
|---|---|---|
| `text-gray-400` | 15, 21, 25, 54, 59, 64, 82, 115, 127, 142, 150 | `text-go-text-tertiary` |
| `text-gray-500` | 35, 39, 44, 60, 82, 92, 99, 127, 158 | `text-go-text-muted` |
| `border-gray-700` | 34, 38, 42, 49, 62, 68, 80, 96, 113, 121 | `border-go-border` |
| `text-gray-300` | 69, 83, 114, 117 | `text-go-text` |
| `text-gray-600` | 115 | `text-go-text-muted` |
| `bg-gray-700` | 85 | `bg-go-surface-alt` |
| `bg-gray-800` | 130 | `bg-go-surface` |
| `border-gray-600` | 71, 130, 138 | `border-go-border` |
| `bg-gray-600` | 142, 150 | `bg-go-surface-alt` |

### Raw Green/Red/Yellow Classes (non-semantic)

These use Tailwind's built-in color palette instead of go- semantic tokens:

| Pattern | Occurrences | Should Be |
|---|---|---|
| `text-green-400` | ~20 | `text-go-success` |
| `text-green-500` | 3 | `text-go-success` |
| `bg-green-500/20` | 6 | `bg-go-success-muted` |
| `border-green-600` | 3 | `border-go-success` (new) |
| `border-green-700/50` | 2 | `border-go-success/50` |
| `bg-green-500` | 2 (toggle switch) | `bg-go-success` |
| `text-red-400` | 8 | `text-go-danger` |
| `bg-red-500/20` | 2 | `bg-go-danger-muted` |
| `border-red-500` | 2 | `border-go-danger` (new) |
| `bg-red-500` | 1 (progress bar) | `bg-go-danger` |
| `bg-yellow-500` | 2 (progress bar) | `bg-go-warning` |
| `hover:text-red-400` | 4 (delete buttons) | `hover:text-go-danger` |
| `hover:bg-green-500/10` | 1 | `hover:bg-go-success-muted` |
| `hover:bg-green-500/20` | 1 | `hover:bg-go-success-muted` |
| `text-white` | ~40 (form inputs, buttons) | `text-go-text` |
| `hover:text-white` | ~15 (interactive elements) | `hover:text-go-text` |

---

## Typography Gaps

### Font Loading

| Font | Manual Specifies | Current Status |
|---|---|---|
| **Red Hat Display** (go-font-ui) | Google Fonts CDN, weights 400/500/600/700 | Loaded in `nuxt.config.ts` — **correct** |
| **Startup** (go-font-display) | Self-hosted OTF, logo wordmark only | Loaded via `@font-face` in `main.css` — **correct** |

Font loading is properly implemented. `font-ui` and `font-display` are defined in `tailwind.config.js` and `body` uses `font-ui` via `main.css`.

### Type Scale Mapping

| Manual Role | Manual Spec | Tailwind | Current Usage | Status |
|---|---|---|---|---|
| Display (page titles) | 700, 28px, lh 1.2, tracking -0.5px | `text-[28px] font-bold tracking-tight` | `text-2xl font-bold` (24px) | **Wrong size** — 24px vs 28px |
| Heading (sections) | 600, 20px, lh 1.3 | `text-xl font-semibold` | `text-xl font-semibold` | Correct |
| Subheading (cards) | 600, 16px, lh 1.4 | `text-base font-semibold` | `text-lg font-semibold` (18px) | **Wrong size** — 18px vs 16px |
| Body | 400, 14px, lh 1.6 | `text-sm font-normal` | `text-sm` | Correct |
| Body Strong | 500, 14px, lh 1.6 | `text-sm font-medium` | `text-sm font-medium` | Correct |
| Caption | 500, 12px, lh 1.5 | `text-xs font-medium` | `text-xs` (missing font-medium) | **Missing weight** |
| Overline (labels) | 600, 11px, lh 1.4, tracking 1.5px, uppercase | `text-[11px] font-semibold tracking-wider uppercase` | `text-[10px] uppercase tracking-wider` | **Wrong size** — 10px vs 11px |
| Amount (large) | 700, 24px, lh 1.2 | `text-2xl font-bold tabular-nums` | `text-xl font-bold` | **Wrong size** — 20px vs 24px |
| Amount (card) | 700, 18px, lh 1.2 | `text-lg font-bold tabular-nums` | `text-lg font-bold` (missing tabular-nums) | **Missing tabular-nums** |
| Button | 600, 14px, lh 1 | `text-sm font-semibold` | `text-sm font-semibold` (btn-primary) | Correct |
| Badge | 600, 12px, lh 1 | `text-xs font-semibold` | `text-xs font-medium` | **Wrong weight** — medium vs semibold |

### Non-standard text sizes used

| Class | Where | Notes |
|---|---|---|
| `text-6xl` | projects/index.vue:20 | Empty state icon — no manual equivalent |
| `text-[10px]` | ExpenseList.vue, client/project/[id].vue, view/[token].vue | Should be `text-[11px]` per overline spec |

---

## Component Gap Table

| File | Issues Found | Priority |
|---|---|---|
| **components/AppHeader.vue** | None — uses go- tokens correctly. Model component. | None |
| **components/AppLoader.vue** | `text-gray-400` → `text-go-text-tertiary`, `rounded-full` is fine | Low |
| **components/AppModal.vue** | Uses modal- utility classes (correct), no issues | None |
| **components/CategoryManager.vue** | 8 hardcoded hex colors in palette, 5 raw gray classes, non-go buttons, `rounded` and `rounded-lg` → `rounded-go-sm`/`rounded-go-md` | High |
| **components/ClientBalanceTable.vue** | 6 raw gray classes, no go- token usage | Medium |
| **components/ClientExpenseCard.vue** | 8 raw gray classes, 3 raw green classes, `rounded-lg` → `rounded-go-md` | Medium |
| **components/ExpenseCard.vue** | 12 raw gray classes, 6 raw green classes, 1 raw red class, `rounded-lg`/`rounded-full`, non-go buttons | High |
| **components/ExpenseCreateModal.vue** | ~25 raw gray classes, 5 raw green classes, 2 raw red, `bg-gray-800` input pattern ×8, `rounded-lg` → `rounded-go-md` | High |
| **components/ExpenseEditModal.vue** | ~25 raw gray classes, 2 raw green, 2 raw red, same input pattern ×8 | High |
| **components/ExpenseList.vue** | 8 raw gray classes, input pattern ×3, `text-[10px]` → `text-[11px]` | Medium |
| **components/ExpenseSummary.vue** | 15 raw gray classes, 2 raw green, 2 raw red, 1 yellow, `bg-gray-700` progress bar | High |
| **components/ProjectCard.vue** | 8 raw gray classes, 1 raw green, `rounded-xl` → `rounded-go-xl` | Medium |
| **components/ProjectEditModal.vue** | 5 raw gray classes, `bg-gray-600` toggle, `rounded-xl` → `rounded-go-xl` | Medium |
| **components/ProjectForm.vue** | ~25 raw gray classes, input pattern ×10, `rounded-lg` → `rounded-go-md` | High |
| **components/RecipientManager.vue** | 12 raw gray classes, `bg-gray-700`/`bg-gray-800` inputs, `rounded` → `rounded-go-sm` | Medium |
| **layouts/default.vue** | Minimal issues, uses go- tokens mostly | Low |
| **layouts/landing.vue** | `rounded-go-md` used correctly, minor gray in Google button | Low |
| **pages/index.vue** | 4 raw gray, Google button (keep white), `border-gray-600` spinner | Low |
| **pages/projects/index.vue** | 4 raw gray classes | Low |
| **pages/projects/new.vue** | 3 raw gray, `border-gray-700`, `rounded-xl` → `rounded-go-xl` | Low |
| **pages/projects/[id].vue** | ~20 raw gray, 4 raw green, input pattern, non-go payment button, `rounded-lg` | High |
| **pages/settings/whatsapp.vue** | ~25 raw gray, 4 raw green, input pattern, `bg-gray-600`/`bg-gray-700` | High |
| **pages/settings/categories.vue** | 8 raw gray, settings tab bar pattern | Medium |
| **pages/settings/recipients.vue** | 8 raw gray, settings tab bar pattern | Medium |
| **pages/view/[token].vue** | ~20 raw gray, `bg-gray-600`/`bg-gray-800` toggle, input pattern | High |
| **pages/client/index.vue** | 6 raw gray, 1 raw green | Low |
| **pages/client/join.vue** | 8 raw gray, 2 raw green | Low |
| **pages/client/project/[id].vue** | ~30 raw gray, 3 raw green, 2 raw red, 1 yellow, input pattern, toggle | High |

---

## main.css Audit

| Class/Section | Issue | Fix |
|---|---|---|
| `.btn-primary` | Uses go- tokens correctly | None |
| `.btn-secondary` | Uses go- tokens correctly | None |
| `.btn-danger` | Hardcoded `rgba(212, 84, 74, 0.2)` in border and hover | Replace with `border-go-danger/20`, `hover:bg-go-danger/20` |
| `.skeleton-shimmer` | Hardcoded `rgba(255,255,255,0.05)` | Replace with `rgba(var(--go-text-rgb), 0.05)` or keep (acceptable for shimmer) |
| `.modal-*` classes | All use go- tokens correctly | None |
| `.dark-scrollbar` | Uses `var(--go-border)` and `var(--go-text-muted)` correctly | None |
| Light theme `.light` | All go- variables correctly overridden | None |

---

## Migration Checklist

Ordered by impact (highest to lowest). Each item is a specific, actionable change.

### Phase 1 — Data Layer (fixes runtime colors everywhere)

1. **Replace hardcoded hex colors in `web/utils/index.ts`**
   - `DEFAULT_EXPENSE_CATEGORIES`: replace 6 old hex colors with go- category CSS variable values (#5A8FB8, #D4793D, #BFA63D, #A86B5E, #6B9B6B, #8B847A)
   - `TRANSACTION_TYPES`: replace 3 hex colors (#3498DB→use go-primary value, #27AE60→#5CB870, #95A5A6→#8B847A)
   - `PAYMENT_STATUSES`: replace 2 hex colors (#27AE60→#5CB870, #E74C3C→#D4544A)
   - `PAYMENT_METHODS`: replace 3 hex colors (#3498DB→#5A8FB8, #27AE60→#6B9B6B, #9B59B6→#8B6BA3; #00B1EA stays)
   - Replace fallback `#95A5A6` → `#8B847A` in getCategoryColor and getPaymentStatusColor

2. **Replace hardcoded color palette in `web/components/CategoryManager.vue:75`**
   - Replace `['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E']` with brand-aligned palette: `['#5A8FB8', '#D4793D', '#BFA63D', '#A86B5E', '#6B9B6B', '#8B847A', '#8B6BA3', '#5A9BBF']`

### Phase 2 — Global Input Pattern (fixes ~50 form inputs)

3. **Create a reusable input class in `main.css`**
   - Add `.input-base` utility: `bg-go-surface border border-go-border rounded-go-md px-3 py-2 text-go-text placeholder-go-text-muted focus:outline-none focus:border-go-primary`
   - Add `.select-base` variant for selects (same but with `cursor-pointer`)
   - Replace all `bg-gray-800 border border-gray-600 rounded-lg ... text-white placeholder-gray-500` with `input-base` across: ProjectForm.vue, ExpenseCreateModal.vue, ExpenseEditModal.vue, CategoryManager.vue, RecipientManager.vue, ExpenseList.vue, projects/[id].vue, client/project/[id].vue, view/[token].vue

### Phase 3 — Semantic Color Migration (systematic find-replace)

4. **Replace `text-gray-300` → `text-go-text`** across all components (form labels, data values)
5. **Replace `text-gray-400` → `text-go-text-tertiary`** across all components (descriptions, metadata, back links)
6. **Replace `text-gray-500` → `text-go-text-muted`** across all components (secondary labels, hints)
7. **Replace `text-gray-600` → `text-go-text-muted`** across all components
8. **Replace `border-gray-700` → `border-go-border`** across all components (cards, dividers, section borders)
9. **Replace `border-gray-600` → `border-go-border`** across all components (inputs, buttons)
10. **Replace `border-gray-800` → `border-go-border-subtle`** (ClientBalanceTable.vue)
11. **Replace `bg-gray-800` → `bg-go-surface`** (remaining non-input usages)
12. **Replace `bg-gray-700` → `bg-go-surface-alt`** (progress bars, skeleton loaders, tab active states)
13. **Replace `bg-gray-600` → `bg-go-surface-alt`** (toggle switches, view mode buttons)
14. **Replace `bg-gray-500/20` → `bg-go-surface-alt`** (status badges for completed/default)
15. **Replace `placeholder-gray-500` → `placeholder-go-text-muted`** (any remaining outside input-base)
16. **Replace `hover:bg-gray-700/50` → `hover:bg-go-surface-hover`** (settings tab links)
17. **Replace `hover:bg-gray-600` → `hover:bg-go-surface-hover`** (copy button, toggle)
18. **Replace `text-white` → `text-go-text`** in form inputs and data display (NOT in Google button)
19. **Replace `hover:text-white` → `hover:text-go-text`** in interactive text elements

### Phase 4 — Semantic Status Colors

20. **Replace `text-green-400` / `text-green-500` → `text-go-success`** across all components
21. **Replace `bg-green-500/20` → `bg-go-success-muted`** (status badges, WhatsApp icon bg)
22. **Replace `bg-green-500` → `bg-go-success`** (toggle switch on-state)
23. **Replace `border-green-600` / `border-green-700/50` → `border-go-success`** (payment card, button)
24. **Replace `hover:bg-green-500/10` / `hover:bg-green-500/20` → `hover:bg-go-success-muted`**
25. **Replace `text-red-400` → `text-go-danger`** (pending amounts, negative balance, delete hover)
26. **Replace `bg-red-500/20` → `bg-go-danger-muted`** (pending status badge)
27. **Replace `bg-red-500` → `bg-go-danger`** (over-budget progress bar)
28. **Replace `border-red-500` → `border-go-danger`** (pending payment status selector)
29. **Replace `bg-yellow-500` → `bg-go-warning`** (80–100% budget progress bar)
30. **Replace `hover:text-red-400` → `hover:text-go-danger`** (delete item buttons)

### Phase 5 — Border Radius

31. **Replace `rounded-xl` → `rounded-go-xl`** in modal containers, cards (ExpenseCreateModal, ExpenseEditModal, ProjectEditModal, ProjectCard, ExpenseSummary, settings pages, client pages)
32. **Replace `rounded-lg` → `rounded-go-md`** in inputs, small cards, info boxes (ProjectForm, ExpenseList, ExpenseCard, ClientExpenseCard, project detail)
33. **Replace `rounded` → `rounded-go-sm`** in CategoryManager, RecipientManager small inputs

### Phase 6 — Typography Scale Fixes

34. **Replace `text-2xl font-bold` → `text-[28px] font-bold tracking-tight`** for page titles ("Mis Proyectos", "Nuevo Proyecto", "WhatsApp", etc.) in: projects/index.vue, projects/new.vue, projects/[id].vue, settings/*.vue, client/*.vue
35. **Replace `text-lg font-semibold` → `text-base font-semibold`** for card titles in: ProjectCard.vue, ExpenseCard.vue, ClientExpenseCard.vue, ExpenseCreateModal.vue, ExpenseEditModal.vue, ProjectEditModal.vue, AppModal.vue
36. **Add `tabular-nums`** to all amount displays using `text-lg font-bold` and `text-xl font-bold`
37. **Replace `text-[10px]` → `text-[11px]`** for overline labels in ExpenseList.vue, client/project/[id].vue, view/[token].vue
38. **Add `font-medium` to `text-xs` caption usage** where currently missing

### Phase 7 — Button & Interactive Patterns

39. **Replace non-go payment button in `projects/[id].vue:117`**: `border border-green-600 text-green-400 hover:bg-green-500/10` → create `btn-success` utility class using go- tokens
40. **Replace toggle switch pattern**: `bg-gray-600`/`bg-green-500` → `bg-go-surface-alt`/`bg-go-success` in ExpenseCreateModal.vue, ExpenseEditModal.vue, ProjectEditModal.vue
41. **Replace view-mode toggle pattern**: `bg-gray-600 text-white` / `text-gray-400 hover:text-white` → `bg-go-surface-alt text-go-text` / `text-go-text-tertiary hover:text-go-text` in client/project/[id].vue, view/[token].vue
42. **Create settings tab bar component or utility**: replace repeated `bg-gray-700 text-white` / `text-gray-400 hover:text-white hover:bg-gray-700/50` pattern in whatsapp.vue, categories.vue, recipients.vue → `bg-go-surface-alt text-go-text` / `text-go-text-tertiary hover:text-go-text hover:bg-go-surface-hover`
43. **Replace inline delete button pattern**: `text-gray-500 hover:text-red-400` → `text-go-text-muted hover:text-go-danger` in CategoryManager, RecipientManager, ExpenseCreateModal, ExpenseEditModal
44. **Replace `focus:border-primary`** → `focus:border-go-primary` if `primary` is not a Tailwind alias (verify — it might already work via tailwind config)

### Phase 8 — Cleanup

45. **Verify Google login button** in pages/index.vue — `bg-white text-gray-800 hover:bg-gray-100` should remain as-is (Google brand guidelines require white button)
46. **Audit `text-primary`** usage — confirm it resolves to `--go-primary` through Tailwind config or add explicit mapping
47. **Remove unused Startup font `@font-face` from `main.css`** — per brand manual, logo is served as pre-rendered SVG/PNG, font is not needed in dashboard
48. **Add `.btn-success` utility to `main.css`** — `bg-go-success-muted text-go-success border border-go-success/20 rounded-go-md font-medium hover:bg-go-success/20 transition-colors` (matches manual's preview-btn.success)

---

## Migration Complete

*Completed 2026-03-03*

All 8 phases of the visual token migration have been applied across 26 files. Verification grep results:

- **Hex colors in components/pages:** Clean (only CategoryManager color picker palette, which uses brand-aligned values)
- **Raw gray classes:** Clean (only exception: `pages/index.vue` Google button — kept per brand guidelines)
- **Raw green/red/yellow classes:** Clean
- **Orphan classes (bg-surface, text-primary, bg-primary, border-primary, bg-base):** Clean

### Changes Summary

| Phase | Scope | Status |
|---|---|---|
| 1. Data Layer | 17 hex colors in `utils/index.ts` | Done |
| 2. Form Inputs | ~38 inputs across 9 files | Done |
| 3. Gray Classes | ~420 class replacements across ~24 files | Done |
| 4. Status Colors | green/red/yellow → go-success/danger/warning | Done |
| 5. Typography | Page titles, card titles, tabular-nums, overlines, badge weight | Done |
| 6. Border Radius | rounded-xl/lg/bare → rounded-go-xl/md/sm | Done |
| 7. Color Picker | CategoryManager palette aligned to brand | Done |
| 8. main.css | btn-danger fix, btn-success added | Done |

### Known Exceptions

- `pages/index.vue:45` — Google button keeps `bg-white text-gray-800 hover:bg-gray-100` (Google brand guidelines)
- `pages/index.vue:50` — Spinner inside Google button keeps `border-gray-600` (part of button context)
- `components/CategoryManager.vue:75` — Color picker palette uses hex values (brand-aligned, cannot use CSS vars in JS color picker)
