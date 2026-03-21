<template>
  <div class="casquito-working" :style="{ width: size + 'px' }">
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
      <!-- Hammer -->
      <g class="casquito-hammer" opacity="0.6">
        <line x1="175" y1="60" x2="190" y2="42" stroke="#4A443D" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="185" y="34" width="12" height="8" rx="2" fill="#4A443D" transform="rotate(-35, 191, 38)"/>
      </g>
      <!-- Dust particles -->
      <circle cx="30" cy="180" r="2" fill="#6B6259">
        <animate attributeName="opacity" values="0.4;0" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="180;162" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="170" cy="185" r="1.5" fill="#6B6259">
        <animate attributeName="opacity" values="0.3;0" dur="2.5s" repeatCount="indefinite" begin="0.8s"/>
        <animate attributeName="cy" values="185;167" dur="2.5s" repeatCount="indefinite" begin="0.8s"/>
      </circle>
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 180 })
</script>

<style scoped>
.casquito-working {
  animation: casquito-bob 3s ease-in-out infinite;
}

.casquito-hammer {
  transform-origin: 85% 15%;
  animation: casquito-hammer-swing 1.8s ease-in-out infinite;
}

@keyframes casquito-bob {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-5px); }
  75% { transform: translateY(3px); }
}

@keyframes casquito-hammer-swing {
  0%, 100% { transform: rotate(0deg); }
  30% { transform: rotate(-25deg); }
  60% { transform: rotate(8deg); }
}
</style>
