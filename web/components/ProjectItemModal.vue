<template>
  <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div>
          <h3 class="font-display font-semibold text-base text-go-text">{{ isEdit ? 'Editar item' : 'Nuevo item' }}</h3>
          <p class="text-go-text-muted text-xs mt-0.5">Una parte de la obra con su propio presupuesto y plazo.</p>
        </div>
        <button @click="$emit('close')" class="modal-close">
          <MdiClose class="text-xl" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Nombre *</label>
            <input
              v-model="form.name"
              type="text"
              required
              maxlength="100"
              placeholder="Ej: Remodelación del baño"
              class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
            />
          </div>

          <!-- Mano de obra -->
          <div>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Mano de obra *</label>
            <div class="flex">
              <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
              <input
                v-model="form.laborBudget"
                type="number"
                required
                min="0"
                step="1"
                placeholder="0"
                class="flex-1 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-lg font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
            <p class="text-[11px] text-go-text-muted mt-1">Costo fijo por el trabajo de esta etapa.</p>
          </div>

          <!-- Estimativo de materiales -->
          <div v-if="!hasMaterials">
            <div class="flex items-baseline justify-between mb-1.5">
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted">Estimativo de materiales</label>
              <span class="text-[10px] text-go-text-muted italic">Opcional · puede variar</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <span class="block text-[10px] uppercase text-go-text-muted mb-1 ml-0.5">Mínimo</span>
                <div class="flex">
                  <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
                  <input
                    v-model="form.materialsBudgetMin"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="flex-1 w-0 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-sm font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                  />
                </div>
              </div>
              <div>
                <span class="block text-[10px] uppercase text-go-text-muted mb-1 ml-0.5">Máximo</span>
                <div class="flex">
                  <span class="bg-go-surface border border-go-border border-r-0 rounded-l-go-md px-3 py-2.5 text-go-text-muted text-sm">$</span>
                  <input
                    v-model="form.materialsBudgetMax"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    class="flex-1 w-0 bg-go-bg border border-go-border rounded-r-go-md rounded-l-none px-3 py-2.5 text-sm font-display font-semibold tabular-nums text-go-text placeholder-go-text-muted focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
                  />
                </div>
              </div>
            </div>
            <p class="text-[11px] text-go-text-muted mt-1">Los materiales son un estimativo: el costo real puede caer en cualquier punto del rango. Si tenés una cifra única, poné el mismo valor en ambos. Si después agregás una lista de materiales, el cálculo pasa a hacerse desde la lista.</p>
          </div>

          <!-- Materials list mode notice -->
          <div v-else>
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Estimativo de materiales</label>
            <div class="bg-go-surface border border-dashed border-go-border rounded-go-md px-3 py-2.5">
              <div class="flex items-center justify-between text-sm">
                <span class="text-go-text-muted">Calculado desde la lista de materiales</span>
                <span class="font-display font-semibold tabular-nums text-go-text">{{ derivedMaterialsLabel }}</span>
              </div>
            </div>
            <p class="text-[11px] text-go-text-muted mt-1">Para editar, usá la lista de materiales en la card del item.</p>
          </div>

          <!-- Live total preview -->
          <div v-if="totalPreview.show" class="flex items-center justify-between bg-go-primary/5 border border-go-primary/15 rounded-go-md px-3 py-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-go-text-muted">Total estimado</span>
            <span class="font-display font-semibold tabular-nums text-go-primary text-sm">{{ totalPreview.label }}</span>
          </div>

          <!-- Dates -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Inicio estimado *</label>
              <input
                v-model="form.plannedStartDate"
                type="date"
                required
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
            <div>
              <label class="block text-[11px] font-semibold uppercase tracking-wider text-go-text-muted mb-1.5">Fin estimado *</label>
              <input
                v-model="form.plannedEndDate"
                type="date"
                required
                :min="form.plannedStartDate || undefined"
                class="w-full bg-go-bg border border-go-border rounded-go-md px-3 py-2.5 text-sm text-go-text focus:outline-none focus:ring-2 focus:ring-go-primary/40 focus:border-go-primary transition-colors"
              />
            </div>
          </div>

          <p v-if="dateError" class="text-xs text-go-danger">{{ dateError }}</p>
          <p v-if="materialsError" class="text-xs text-go-danger">{{ materialsError }}</p>
        </div>

        <div class="modal-footer flex-col sm:flex-row">
          <button type="button" @click="$emit('close')" class="btn-secondary order-2 sm:order-1">Cancelar</button>
          <button
            type="submit"
            :disabled="isSubmitting || !!dateError || !!materialsError"
            class="btn-primary flex-1 sm:flex-initial flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <span v-if="isSubmitting" class="btn-spinner"></span>
            {{ isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear item') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import MdiClose from '~icons/mdi/close';
import { formatPrice } from '~/utils';

const props = defineProps({
  show: { type: Boolean, default: false },
  item: { type: Object, default: null },
  hasMaterials: { type: Boolean, default: false },
  derivedMaterialsMin: { type: Number, default: 0 },
  derivedMaterialsMax: { type: Number, default: 0 },
  isSubmitting: { type: Boolean, default: false }
});

const derivedMaterialsLabel = computed(() => {
  if (props.derivedMaterialsMin === props.derivedMaterialsMax) {
    return formatPrice(props.derivedMaterialsMin);
  }
  return `${formatPrice(props.derivedMaterialsMin)} – ${formatPrice(props.derivedMaterialsMax)}`;
});

const emit = defineEmits(['close', 'submit']);

const isEdit = computed(() => !!props.item);

const form = reactive({
  name: '',
  laborBudget: '',
  materialsBudgetMin: '',
  materialsBudgetMax: '',
  plannedStartDate: '',
  plannedEndDate: ''
});

const dateError = computed(() => {
  if (form.plannedStartDate && form.plannedEndDate && form.plannedEndDate < form.plannedStartDate) {
    return 'La fecha de fin debe ser posterior al inicio.';
  }
  return '';
});

const materialsError = computed(() => {
  if (props.hasMaterials) return '';
  const min = parseFloat(form.materialsBudgetMin);
  const max = parseFloat(form.materialsBudgetMax);
  if (!isNaN(min) && !isNaN(max) && max < min) {
    return 'El máximo de materiales no puede ser menor al mínimo.';
  }
  return '';
});

const totalPreview = computed(() => {
  const labor = parseFloat(form.laborBudget);
  if (isNaN(labor)) return { show: false, label: '' };
  const min = props.hasMaterials ? props.derivedMaterialsMin : parseFloat(form.materialsBudgetMin);
  const max = props.hasMaterials ? props.derivedMaterialsMax : parseFloat(form.materialsBudgetMax);
  if (isNaN(min) || isNaN(max)) return { show: false, label: '' };
  if (min === max) {
    return { show: true, label: formatPrice(labor + min) };
  }
  return {
    show: true,
    label: `${formatPrice(labor + min)} – ${formatPrice(labor + max)}`
  };
});

function toDateInput(d) {
  if (!d) return '';
  const date = d.toDate ? d.toDate() : new Date(d);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

watch(() => props.show, (show) => {
  document.body.classList.toggle('modal-open', show);
  if (show) {
    if (props.item) {
      form.name = props.item.name || '';
      form.laborBudget = props.item.laborBudget ?? '';
      form.materialsBudgetMin = props.item.materialsBudgetMin ?? '';
      form.materialsBudgetMax = props.item.materialsBudgetMax ?? '';
      form.plannedStartDate = toDateInput(props.item.plannedStartDate);
      form.plannedEndDate = toDateInput(props.item.plannedEndDate);
    } else {
      form.name = '';
      form.laborBudget = '';
      form.materialsBudgetMin = '';
      form.materialsBudgetMax = '';
      form.plannedStartDate = '';
      form.plannedEndDate = '';
    }
  }
});

function handleSubmit() {
  if (dateError.value || materialsError.value) return;
  let min = parseFloat(form.materialsBudgetMin);
  let max = parseFloat(form.materialsBudgetMax);
  if (isNaN(min) && isNaN(max)) { min = 0; max = 0; }
  else if (isNaN(min)) min = max;
  else if (isNaN(max)) max = min;
  const data = {
    name: form.name.trim(),
    laborBudget: parseFloat(form.laborBudget) || 0,
    materialsBudgetMin: min,
    materialsBudgetMax: max,
    plannedStartDate: new Date(form.plannedStartDate),
    plannedEndDate: new Date(form.plannedEndDate)
  };
  emit('submit', data);
}
</script>
