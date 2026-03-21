<template>
  <div class="casquito-happy" :style="{ width: size + 'px' }">
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
      <!-- Happy eyes (arcs) -->
      <path d="M 68,86 Q 76,78 84,86" stroke="#2C261E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M 116,86 Q 124,78 132,86" stroke="#2C261E" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- Sparkles -->
      <circle cx="38" cy="48" r="2.5" fill="#FFAB40">
        <animate attributeName="opacity" values="0;0.8;0" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="r" values="1;3;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="170" cy="52" r="2" fill="#FFAB40">
        <animate attributeName="opacity" values="0;0.6;0" dur="2.4s" repeatCount="indefinite" begin="0.6s"/>
        <animate attributeName="r" values="1;2.5;1" dur="2.4s" repeatCount="indefinite" begin="0.6s"/>
      </circle>
      <circle cx="52" cy="36" r="1.5" fill="#FFAB40">
        <animate attributeName="opacity" values="0;0.5;0" dur="1.8s" repeatCount="indefinite" begin="1.2s"/>
        <animate attributeName="r" values="0.5;2;0.5" dur="1.8s" repeatCount="indefinite" begin="1.2s"/>
      </circle>
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 100 })
</script>

<style scoped>
.casquito-happy {
  animation: casquito-bounce 2.8s ease-in-out infinite;
}

@keyframes casquito-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-10px) scale(1.02); }
  50% { transform: translateY(-4px) scale(1); }
  70% { transform: translateY(-7px) scale(1.01); }
}
</style>
