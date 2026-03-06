# Loading State Audit - Gasto Obra Web Frontend

**Date:** 2026-03-06
**Scope:** All pages and components in `/web/pages/` and `/web/components/`
**Context:** Pre-production launch audit

---

## 1. Summary Table

### Pages

| File | Async Operation | Loading State? | Type Needed | Priority |
|------|----------------|---------------|-------------|----------|
| `pages/index.vue` | `signInWithGoogle` + `redirectUser` | Yes (spinner + text) | -- | OK |
| `pages/projects/index.vue` | `projectStore.fetchProjects()` | Yes (`AppLoader`) | -- | OK |
| `pages/projects/index.vue` | Firestore `getDocs` for expense totals | No | inline spinner on cards | P2 |
| `pages/projects/new.vue` | `projectStore.createProject()` | Yes (`isSubmitting` prop) | -- | OK |
| `pages/projects/[id].vue` | `fetchProject` + 6 other fetches | Yes (skeleton + `AppLoader`) | -- | OK |
| `pages/projects/[id].vue` | `handleCreateSubmit` (create expense) | **BROKEN** | disable + spinner | **P0** |
| `pages/projects/[id].vue` | `handleEditSave` (edit expense) | **BROKEN** | disable + spinner | **P0** |
| `pages/projects/[id].vue` | `handleDeliverySubmit` (create/edit delivery) | **BROKEN** | disable + spinner | **P0** |
| `pages/projects/[id].vue` | `handleDeleteDelivery` (delete delivery) | No | disable + spinner | **P0** |
| `pages/projects/[id].vue` | `handleProjectEditSave` (edit project) | **BROKEN** | disable + spinner | P1 |
| `pages/projects/[id].vue` | `handleAssignExpenses` (batch assign) | **BROKEN** | disable + spinner | P1 |
| `pages/projects/[id].vue` | `updateStatus` (select change) | No | inline spinner | P1 |
| `pages/client/index.vue` | `fetchClientProjects()` | Yes (`AppLoader`) | -- | OK |
| `pages/client/join.vue` | `signInWithGoogle` | No | disable + spinner | P1 |
| `pages/client/join.vue` | `joinAsClient` | Yes (`isJoining`) | -- | OK |
| `pages/client/project/[id].vue` | `fetchProject` + expenses + categories | Yes (`AppLoader`) | -- | OK |
| `pages/settings/categories.vue` | `categoryStore.fetchGlobal()` | Yes (skeleton shimmer) | -- | OK |
| `pages/settings/categories.vue` | `categoryStore.saveGlobal()` | Yes (`isSaving`) | -- | OK |
| `pages/settings/recipients.vue` | `recipientStore.fetchAll()` | Yes (skeleton shimmer) | -- | OK |
| `pages/settings/recipients.vue` | `recipientStore.saveAll()` | Yes (`isSaving`) | -- | OK |
| `pages/settings/whatsapp.vue` | `fetchLinkedAccount` + `fetchPendingCode` | Yes (spinner + skeleton) | -- | OK |
| `pages/settings/whatsapp.vue` | `generateCode` | Yes (`isGenerating`) | -- | OK |
| `pages/settings/whatsapp.vue` | `handleUnlink` (unlink account) | No | disable + spinner | **P0** |
| `pages/view/[token].vue` | `fetchProjectByShareToken` + expenses + categories | Yes (full skeleton) | -- | OK |
| `pages/privacy.vue` | None | N/A | -- | OK |

### Components

| File | Async Operation | Loading State? | Type Needed | Priority |
|------|----------------|---------------|-------------|----------|
| `ExpenseCreateModal.vue` | `handleSubmit` (emit) | **BROKEN** | disable + spinner | **P0** |
| `ExpenseCreateModal.vue` | `recipientStore.fetchAll()` (fire-and-forget) | No | inline spinner on recipient select | P1 |
| `ExpenseEditModal.vue` | `handleSave` (emit) | **BROKEN** | disable + spinner | **P0** |
| `DeliveryCreateModal.vue` | `handleSubmit` (emit) | **BROKEN** | disable + spinner | **P0** |
| `DeliveryAssignModal.vue` | `handleSave` (emit) | **BROKEN** | disable + spinner | P1 |
| `ProjectEditModal.vue` | `handleSave` (emit) | **BROKEN** | disable + spinner | P1 |
| `ProjectEditModal.vue` | `categoryStore.fetchForProject()` on open | No | skeleton in category section | P1 |
| `ProjectEditModal.vue` | `handleSaveCategories` | Yes (`isSavingCategories`) | -- | OK |
| `ExpenseList.vue` | N/A (receives props) | No loading vs empty distinction | `loading` prop | **P0** |
| `ExpenseSummary.vue` | N/A (receives props) | No (shows $0 / NaN%) | `loading` prop | P1 |
| `DeliveryList.vue` | N/A (receives props) | No loading vs empty distinction | `loading` prop | P1 |
| `ClientBalanceTable.vue` | N/A (receives props) | No loading vs empty distinction | `loading` prop | P1 |
| `RecipientManager.vue` | N/A (receives props) | No loading vs empty distinction | `loading` prop | P1 |
| `AppHeader.vue` | `signOutUser` | No | disable button | P2 |

---

## 2. Root Cause: Broken Modal Spinner Pattern

**All modal components share the same systemic bug.** The pattern:

```javascript
// IN MODAL (e.g., ExpenseCreateModal.vue)
async function handleSubmit() {
  isSubmitting.value = true
  try {
    emit('submit', formData)  // <-- synchronous emit!
  } finally {
    isSubmitting.value = false  // <-- resets immediately
  }
}

// IN PARENT (pages/projects/[id].vue)
async function handleCreateSubmit(data) {
  await expenseStore.createExpense(data)  // <-- actual async work, no feedback
}
```

The spinner shows for exactly **one tick** then vanishes while the Firestore round-trip is still in progress.

**Affected modals:** `ExpenseCreateModal`, `ExpenseEditModal`, `DeliveryCreateModal`, `DeliveryAssignModal`, `ProjectEditModal`

---

## 3. P0 Fixes List

### Fix 1: Expense Create Modal spinner (P0)

**Problem:** `isSubmitting` resets immediately because `emit('submit')` is synchronous.

**Fix approach:** Pass `isSubmitting` as a prop from parent, controlled by the parent's async handler.

In `pages/projects/[id].vue`:
```javascript
const isCreatingExpense = ref(false)

async function handleCreateSubmit(data) {
  isCreatingExpense.value = true
  try {
    await expenseStore.createExpense(data)
    // close modal on success
  } finally {
    isCreatingExpense.value = false
  }
}
```

In template:
```html
<ExpenseCreateModal :is-submitting="isCreatingExpense" ... />
```

In `ExpenseCreateModal.vue`:
- Remove internal `isSubmitting` ref
- Add prop `isSubmitting: { type: Boolean, default: false }`
- Remove the try/finally wrapper around emit
- Use `props.isSubmitting` for button `:disabled` and spinner

**Effort:** ~20 min

### Fix 2: Expense Edit Modal spinner (P0)

**Same pattern as Fix 1.** Add `isEditingExpense` ref in parent, pass as `:is-saving` prop.

**Effort:** ~15 min

### Fix 3: Delivery Create Modal spinner (P0)

**Same pattern as Fix 1.** Add `isCreatingDelivery` ref in parent, pass as `:is-submitting` prop.

**Effort:** ~15 min

### Fix 4: Delete Delivery feedback (P0)

**Problem:** `handleDeleteDelivery` calls `deliveryStore.deleteDelivery()` with no loading state. Only a `confirm()` dialog.

**Fix:** Add `isDeletingDelivery` ref. Disable the delete button and show spinner during deletion.

```javascript
const isDeletingDelivery = ref(false)

async function handleDeleteDelivery(id) {
  if (!confirm('Eliminar esta entrega?')) return
  isDeletingDelivery.value = true
  try {
    await deliveryStore.deleteDelivery(id)
  } finally {
    isDeletingDelivery.value = false
  }
}
```

Pass to DeliveryList or use directly on the button with `:disabled="isDeletingDelivery"`.

**Effort:** ~10 min

### Fix 5: Unlink WhatsApp feedback (P0)

**Problem:** `handleUnlink` has no loading state on the button.

**Fix:** Add `isUnlinking` ref, disable button + show spinner.

```javascript
const isUnlinking = ref(false)

async function handleUnlink() {
  isUnlinking.value = true
  try {
    await whatsappStore.unlinkAccount()
  } finally {
    isUnlinking.value = false
  }
}
```

Template:
```html
<button :disabled="isUnlinking" @click="handleUnlink">
  <span v-if="isUnlinking" class="spinner" /> Desvincular cuenta
</button>
```

**Effort:** ~10 min

### Fix 6: ExpenseList loading vs empty distinction (P0)

**Problem:** Shows "Sin gastos todavia" when expenses are still loading.

**Fix:** Add optional `loading` prop:

```vue
<script setup>
const props = defineProps({
  expenses: Array,
  editable: Boolean,
  categories: Array,
  loading: { type: Boolean, default: false }
})
</script>

<template>
  <AppLoader v-if="loading" />
  <div v-else-if="expenses.length === 0 && !hasActiveFilters">
    Sin gastos todavia...
  </div>
  <!-- rest of template -->
</template>
```

In parent `pages/projects/[id].vue`:
```html
<ExpenseList :loading="expenseStore.isLoading" :expenses="..." />
```

**Effort:** ~10 min

---

## 4. Recommended Patterns

### Pattern A: Reusable Button Spinner

Since many buttons need submit/loading states, standardize with a pattern:

```vue
<!-- Usage -->
<button :disabled="isLoading" @click="handleAction" class="btn">
  <span v-if="isLoading" class="btn-spinner" />
  {{ isLoading ? 'Guardando...' : 'Guardar' }}
</button>
```

```css
/* Add to main.css */
.btn-spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 0.5rem;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

Or extract a small `<SubmitButton>` component if preferred:

```vue
<!-- components/SubmitButton.vue -->
<template>
  <button :disabled="loading" :class="['btn', $attrs.class]">
    <span v-if="loading" class="btn-spinner" />
    <slot>{{ loading ? loadingText : text }}</slot>
  </button>
</template>

<script setup>
defineProps({
  loading: Boolean,
  text: { type: String, default: 'Guardar' },
  loadingText: { type: String, default: 'Guardando...' }
})
</script>
```

### Pattern B: Parent-controlled Modal Submitting

**The standard pattern for modals should be:**

```vue
<!-- Parent -->
<SomeModal :is-submitting="isSubmitting" @submit="handleSubmit" />

<script setup>
const isSubmitting = ref(false)
async function handleSubmit(data) {
  isSubmitting.value = true
  try {
    await store.someAction(data)
    closeModal()
  } finally {
    isSubmitting.value = false
  }
}
</script>

<!-- Modal -->
<script setup>
const props = defineProps({ isSubmitting: Boolean })
// No internal isSubmitting ref needed
</script>
<template>
  <button :disabled="isSubmitting">
    <span v-if="isSubmitting" class="btn-spinner" />
    Guardar
  </button>
</template>
```

### Pattern C: List Component with Loading Prop

For list components that can't distinguish loading from empty:

```vue
<script setup>
defineProps({
  items: Array,
  loading: { type: Boolean, default: false }
})
</script>

<template>
  <AppLoader v-if="loading" />
  <div v-else-if="items.length === 0" class="empty-state">
    <!-- empty state message -->
  </div>
  <div v-else>
    <div v-for="item in items" :key="item.id">...</div>
  </div>
</template>
```

### Should we add `isLoading` to the project store?

**Answer: No, it already has it.** All five stores (`project`, `expense`, `category`, `recipient`, `whatsapp`) already expose `isLoading`. The project store's `isLoading` is used correctly on `pages/projects/index.vue`. No store changes needed.

---

## 5. Effort Estimates (P0 only)

| Fix | Description | Estimated Effort |
|-----|-------------|-----------------|
| Fix 1 | ExpenseCreateModal spinner (parent-controlled) | ~20 min |
| Fix 2 | ExpenseEditModal spinner (parent-controlled) | ~15 min |
| Fix 3 | DeliveryCreateModal spinner (parent-controlled) | ~15 min |
| Fix 4 | Delete delivery feedback | ~10 min |
| Fix 5 | Unlink WhatsApp feedback | ~10 min |
| Fix 6 | ExpenseList loading vs empty | ~10 min |
| **Total P0** | | **~1.5 hours** |

### P1 effort (for reference)

| Fix | Estimated Effort |
|-----|-----------------|
| ProjectEditModal spinner (parent-controlled) | ~15 min |
| DeliveryAssignModal spinner (parent-controlled) | ~15 min |
| Project status select feedback | ~10 min |
| Client join sign-in button feedback | ~10 min |
| ExpenseSummary NaN guard + loading | ~15 min |
| DeliveryList loading prop | ~10 min |
| ClientBalanceTable loading prop | ~10 min |
| RecipientManager loading prop | ~10 min |
| ExpenseCreateModal recipient loading | ~10 min |
| ProjectEditModal category loading on open | ~15 min |
| **Total P1** | **~2 hours** |

---

## 6. Recommended Fix Order

1. **CSS:** Add `.btn-spinner` class to `main.css` (prerequisite for all button fixes)
2. **Fix 1-3:** Modal spinner pattern (ExpenseCreate, ExpenseEdit, DeliveryCreate) -- biggest user-facing impact
3. **Fix 4:** Delete delivery feedback -- destructive action needs protection
4. **Fix 5:** Unlink WhatsApp feedback -- destructive action needs protection
5. **Fix 6:** ExpenseList loading prop -- prevents false empty state
6. **P1 fixes** as time permits before launch
