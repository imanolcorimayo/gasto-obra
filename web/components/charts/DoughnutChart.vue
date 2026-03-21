<template>
  <Doughnut :data="data" :options="mergedOptions" />
</template>

<script setup>
import { Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps({
  data: { type: Object, required: true },
  options: { type: Object, default: () => ({}) }
});

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#1C1915',
      titleFont: { family: 'Red Hat Display', size: 12 },
      bodyFont: { family: 'Red Hat Display', size: 12 },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4
    }
  }
};

function deepMerge(target, source) {
  const out = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(out[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

const mergedOptions = computed(() => deepMerge(baseOptions, props.options));
</script>
