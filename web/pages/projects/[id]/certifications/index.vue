<template>
  <div>
    <!-- Sticky header -->
    <header class="sticky top-0 z-20 bg-go-bg-elevated border-b border-go-border-subtle px-4 lg:px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h1 class="font-display font-bold text-lg text-go-text truncate">Certificaciones</h1>
        <p class="text-[11px] text-go-text-muted mt-0.5">
          <template v-if="certs.length">
            {{ certs.length }} {{ certs.length === 1 ? 'certificación' : 'certificaciones' }}
          </template>
          <template v-else>Todavía sin certificaciones</template>
        </p>
      </div>
      <button
        @click="createNew"
        :disabled="creating"
        class="inline-flex items-center gap-1.5 bg-go-primary text-white px-3 py-1.5 rounded-go-md text-[12.5px] font-bold hover:bg-go-primary-hover transition-colors shrink-0 disabled:opacity-60"
      >
        <MdiPlus class="text-[15px]" />
        <span class="hidden sm:inline">Nueva certificación</span>
        <span class="sm:hidden">Nueva</span>
      </button>
    </header>

    <div class="px-4 lg:px-5 py-4 lg:py-5 max-w-[1600px] mx-auto">
      <AppLoader v-if="certStore.isLoading && certs.length === 0" text="Cargando..." />

      <!-- Empty state -->
      <div v-else-if="certs.length === 0" class="text-center py-16">
        <h2 class="font-display text-lg font-semibold text-go-text-secondary">Aún no hay certificaciones</h2>
        <p class="text-[13px] text-go-text-muted mt-1 max-w-sm mx-auto">
          Registrá el avance semanal del proyecto. Cada certificación congela el % por ítem y genera un documento descargable.
        </p>
        <button
          @click="createNew"
          :disabled="creating"
          class="btn-primary inline-flex items-center gap-1.5 mt-5"
        >
          <MdiPlus class="text-[15px]" />
          Crear primera certificación
        </button>
      </div>

      <!-- List -->
      <div v-else class="bg-go-surface border border-go-border-subtle rounded-go-xl divide-y divide-go-border-subtle">
        <NuxtLink
          v-for="c in certs"
          :key="c.id"
          :to="`/projects/${route.params.id}/certifications/${c.id}`"
          class="flex items-center gap-3 px-4 py-3 hover:bg-go-surface-hover transition-colors"
        >
          <div class="shrink-0 w-12 h-12 rounded-go-md bg-go-primary-muted text-go-primary font-display font-bold tabular-nums flex items-center justify-center">
            N°{{ c.number }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-display font-semibold text-[14px] text-go-text truncate">
                {{ c.title || `Certificación N° ${c.number}` }}
              </span>
              <span
                class="shrink-0 text-[9px] uppercase font-bold tracking-[0.08em] px-1.5 py-0.5 rounded-full"
                :class="statusPillClasses(c.status)"
              >
                {{ c.status === 'issued' ? 'Emitida' : 'Borrador' }}
              </span>
            </div>
            <div class="text-[11px] text-go-text-muted tabular-nums mt-0.5">
              {{ periodLabel(c) }}
            </div>
          </div>
          <div class="shrink-0 text-right">
            <div class="font-display font-bold text-[14px] text-go-text tabular-nums">{{ formatPrice(c.totalAmount || 0) }}</div>
            <div class="text-[10.5px] text-go-text-muted">{{ (c.lines || []).length }} {{ (c.lines || []).length === 1 ? 'línea' : 'líneas' }}</div>
          </div>
          <MdiChevronRight class="text-[16px] text-go-text-muted shrink-0" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import MdiPlus from '~icons/mdi/plus';
import MdiChevronRight from '~icons/mdi/chevron-right';
import { useProjectStore } from '~/stores/project';
import { useProjectCertificationStore } from '~/stores/projectCertification';
import { formatPrice, formatDate } from '~/utils';

definePageMeta({
  layout: 'project',
  middleware: ['auth']
});

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const certStore = useProjectCertificationStore();

const creating = ref(false);

const certs = computed(() => certStore.forProject(route.params.id));

useHead({ title: 'Certificaciones' });

onMounted(async () => {
  const id = route.params.id;
  if (!projectStore.currentProject || projectStore.currentProject.id !== id) {
    await projectStore.fetchProject(id);
  }
  await certStore.fetchByProjectId(id);
});

async function createNew() {
  creating.value = true;
  try {
    const project = projectStore.currentProject || await projectStore.fetchProject(route.params.id);
    if (!project) {
      useToast('error', 'Proyecto no encontrado');
      return;
    }
    const result = await certStore.createCertification({
      projectId: project.id,
      providerId: project.providerId,
      periodEnd: new Date()
    });
    if (result.success && result.data?.id) {
      router.push(`/projects/${route.params.id}/certifications/${result.data.id}`);
    } else {
      useToast('error', result.error || 'Error al crear certificación');
    }
  } finally {
    creating.value = false;
  }
}

function periodLabel(c) {
  const end = formatDate(c.periodEnd);
  const start = formatDate(c.periodStart);
  if (start && end) return `${start} → ${end}`;
  if (end) return `Hasta ${end}`;
  return 'Sin período';
}

function statusPillClasses(status) {
  if (status === 'issued') return 'bg-go-success-muted text-go-success';
  return 'bg-go-surface-alt text-go-text-tertiary';
}
</script>
