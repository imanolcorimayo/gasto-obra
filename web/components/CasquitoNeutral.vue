<template>
  <div class="casquito-neutral" :style="{ width: size + 'px' }">
    <svg :width="size" :height="Math.round(size * 230 / 200)" viewBox="0 0 200 230" fill="none" aria-hidden="true">
      <!-- Ticket body -->
      <path d="M 52,118 L 50,205 Q 100,220 148,205 L 148,118 Z"
        stroke="#FFAB40" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" fill="#FFAB40" fill-opacity="0.06"/>
      <!-- Tear line -->
      <line x1="56" y1="140" x2="144" y2="140" stroke="#FFAB40" stroke-width="5.5" stroke-dasharray="10 14" stroke-linecap="round" opacity="0.5"/>
      <!-- Helmet dome -->
      <path d="M 35,112 C 35,38 165,38 165,112 Z" fill="#FFAB40"/>
      <!-- Brim -->
      <path d="M 14,110 Q 14,100 38,106 L 162,106 Q 186,100 186,110 L 186,120 Q 186,128 162,122 L 38,122 Q 14,128 14,120 Z" fill="#E99A35"/>
      <!-- Band detail -->
      <path d="M 38,108 Q 100,102 162,108" stroke="rgba(255,255,255,0.15)" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Dome highlights -->
      <path d="M 62,56 Q 78,40 108,48" stroke="rgba(255,255,255,0.35)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 68,68 Q 78,58 96,63" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Eyes -->
      <circle cx="76" cy="86" r="5" fill="#2C261E"/>
      <circle cx="124" cy="86" r="5" fill="#2C261E"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 100 })
</script>

<style scoped>
.casquito-neutral {
  animation: casquito-float 4s ease-in-out infinite;
}

@keyframes casquito-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
