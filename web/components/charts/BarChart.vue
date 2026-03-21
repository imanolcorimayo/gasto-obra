<template>
  <Bar :data="data" :options="mergedOptions" />
</template>

<script setup>
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps({
  data: { type: Object, required: true },
  options: { type: Object, default: () => ({}) }
});

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
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
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: 'Red Hat Display', size: 11 },
        color: '#635B54'
      },
      border: { display: false }
    },
    y: {
      grid: { color: '#E0DBD2' },
      ticks: {
        font: { family: 'Red Hat Display', size: 11 },
        color: '#635B54'
      },
      border: { display: false }
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
