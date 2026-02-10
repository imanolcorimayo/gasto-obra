# Gap Analysis: Gasto Obra vs. Grupo DET Payment Document

## Context

Compared the current prototype against a real "Documento de Pago" from Grupo DET (construction company) to client Jorge Passetti. The PDF is a manually-created Word document tracking ~25 line items across Nov-Dec 2024, totaling ~$15M ARS for a renovation at Rivadavia 150, Centro.

This document represents the tedious manual work the app aims to eliminate.

---

## WINS - Where the prototype already delivers value

### 1. Real-time vs. monthly static document
The PDF is a snapshot delivered once (Dec 20). The app gives clients live access via share link + daily WhatsApp summaries.

### 2. AI-powered input automation
Grupo DET staff manually types every row in a Word table. The prototype captures expenses via WhatsApp text, receipt photos (Gemini vision), and audio messages.

### 3. Category-based tracking
The PDF groups by Mano de obra, Materiales, Flete, etc. The prototype already has category tracking with colors, totals, and counts.

### 4. Automated balance calculation
The PDF requires manual math. The app computes `totalPayments - totalExpenses` automatically with budget progress.

### 5. Multi-project support
Grupo DET creates a separate document per client/project. The app handles N projects per provider with `#tags`.

### 6. Built-in client notifications
Each expense triggers an automatic WhatsApp notification. The PDF client only learns about expenses when the document is delivered.

### 7. Itemized breakdown
The `items[]` field on expenses supports sub-item detail (e.g., "Bolsas de arena $56,900 + Caño corrugado $9,970").

---

## GAPS - What the PDF reveals the prototype is missing

### Critical (High Impact)

#### GAP-1: Payment status per expense
- **What the PDF has:** PAGO CANCELADO vs PENDIENTE DE PAGO per line item
- **What's missing:** No concept of whether each expense has been paid or is pending
- **Why it matters:** The single most important thing clients care about: "what do I still owe?"
- **Implementation:** Add `paymentStatus` field to expenses (`paid` | `pending` | `partial`)
- **Status:** TODO

#### GAP-2: Payment method tracking
- **What the PDF has:** Transferencia, Tarjeta de Crédito, Mercado Pago per expense
- **What's missing:** No `paymentMethod` field
- **Why it matters:** Financial reconciliation and client records
- **Implementation:** Add `paymentMethod` field (transferencia, tarjeta, efectivo, mercadopago)
- **Status:** TODO

#### GAP-3: Payment recipient details
- **What the PDF has:** Titular name, CBU/CVU, Alias per payment
- **What's missing:** No payee/recipient information
- **Why it matters:** Accountability - the client needs to know where their money went. Pending payments include payment instructions.
- **Implementation:** Add `payee` object (name, bankInfo: CBU/CVU/alias)
- **Status:** TODO

#### GAP-4: Scope change tracking (ENTREGA vs AGREGADOS)
- **What the PDF has:** ENTREGA (original scope) vs AGREGADOS (additions/changes)
- **What's missing:** Only expense/payment/provider_expense types
- **Why it matters:** Scope creep is the #1 source of client-provider conflict in construction
- **Implementation:** Add `scope` field (`original` | `addition` | `management`) or rethink expense `type`
- **Status:** TODO

#### GAP-5: Partial payment / installment tracking
- **What the PDF has:** "Mano de obra (60% inicial)", "Mobiliario (40%)"
- **What's missing:** No concept of installments or partial payments against a total
- **Why it matters:** Big construction items are paid in stages - this is standard practice
- **Implementation:** New `budgetItems` or `lineItems` collection with total, % paid, linked payments
- **Status:** TODO

#### GAP-6: Formal document / PDF export
- **What the PDF has:** Comprobante number, branded header, structured tables, summary page
- **What's missing:** No export capability
- **Why it matters:** Clients need formal documents for records
- **Implementation:** PDF generation (server-side) with branding, comprobante numbering, formal layout
- **Status:** TODO

### Medium (Important but not blocking)

#### GAP-7: Delivery/batch grouping
- **What the PDF has:** Numbered "ENTREGAS" (1st delivery, 2nd delivery) by date with totals
- **What's missing:** Flat list or category breakdown only
- **Implementation:** Group expenses into "delivery batches" for summary
- **Status:** TODO

#### GAP-8: Richer / configurable categories
- **What the PDF has:** Mobiliario, Cortinas, Cristalería, Retiro de escombros, Flete
- **What's missing:** Fixed generic set (materiales, herramientas, transporte, mano de obra, comida, otros)
- **Implementation:** Make categories configurable per project or expand defaults
- **Status:** TODO

#### GAP-9: Vendor/supplier tracking
- **What the PDF has:** PINTURERIA REX, EDIFICOR, TANGENTE per expense
- **What's missing:** No vendor field
- **Implementation:** Add `vendor`/`supplier` field on expenses
- **Status:** TODO

#### GAP-10: Management fee (GESTION)
- **What the PDF has:** "Compra de materiales (10%)" management fee
- **What's missing:** No fee structure
- **Implementation:** Fee/margin tracking per project (% or fixed)
- **Status:** TODO

#### GAP-11: Work timeline with milestones
- **What the PDF has:** CRONOGRAMA DE TRABAJO (start: 31/10, end: 20/12)
- **What's missing:** Only `estimatedEndDate` - no start date, milestones, or phases
- **Implementation:** Add start date, milestones/phases, timeline view
- **Status:** TODO

### Minor (Nice to have)

#### GAP-12: Multiple recipients per expense
- **What the PDF has:** $5.1M split across 9 different payment recipients
- **Implementation:** Support distributing one expense across multiple payees
- **Status:** TODO

#### GAP-13: Comprobante/receipt numbering
- **What the PDF has:** Formal voucher number "0011-3695"
- **Implementation:** Sequential auto-numbering per project
- **Status:** TODO

#### GAP-14: Terms & disclaimers
- **What the PDF has:** Legal terms about materials liability and payment conditions
- **Implementation:** Project-level "terms" field shown in client view
- **Status:** TODO

---

## Summary Scorecard

| Aspect | PDF (Grupo DET) | Prototype | Verdict |
|---|---|---|---|
| Input method | Manual Word doc | WhatsApp + AI + Web | **WIN** |
| Real-time visibility | None (monthly doc) | Live dashboard + daily summary | **WIN** |
| Category tracking | Yes | Yes | **TIE** |
| Balance calculation | Manual | Automatic | **WIN** |
| Payment status | Per-item paid/pending | Not tracked | **GAP** |
| Payment method | Per-item | Not tracked | **GAP** |
| Payment recipients | Full bank details | Not tracked | **GAP** |
| Scope changes | ENTREGA vs AGREGADOS | Not tracked | **GAP** |
| Installments | % tracking | Not tracked | **GAP** |
| PDF export | Native | Not available | **GAP** |
| Vendor tracking | Per expense | Not tracked | **GAP** |
| Delivery grouping | Numbered batches | Flat list only | **GAP** |
| Categories | Rich, domain-specific | Generic, fixed | **GAP** |

---

## Priority order for implementation

1. GAP-1: Payment status (paid/pending) - highest client value
2. GAP-2: Payment method
3. GAP-4: Scope change tracking (ENTREGA vs AGREGADOS)
4. GAP-8: Richer categories
5. GAP-9: Vendor/supplier tracking
6. GAP-3: Payment recipient details
7. GAP-11: Work timeline (start date + milestones)
8. GAP-7: Delivery/batch grouping
9. GAP-5: Installment tracking
10. GAP-6: PDF export
11. GAP-10: Management fees
12. GAP-13: Comprobante numbering
13. GAP-12: Multiple recipients per expense
14. GAP-14: Terms & disclaimers
