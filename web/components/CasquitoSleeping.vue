<template>
  <div class="casquito-sleeping" :style="{ width: size + 'px' }">
    <svg :width="size" :height="Math.round(size * 230 / 200)" viewBox="0 0 200 230" fill="none" aria-hidden="true">
      <g transform="rotate(-5, 100, 130)">
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
        <!-- Closed eyes (lines) -->
        <line x1="68" y1="87" x2="84" y2="87" stroke="#2C261E" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="116" y1="87" x2="132" y2="87" stroke="#2C261E" stroke-width="2.5" stroke-linecap="round"/>
      </g>
      <!-- Zzz -->
      <g fill="#6B6259" font-family="'Space Grotesk', sans-serif" font-weight="700">
        <text x="162" y="48" font-size="18">z
          <animate attributeName="opacity" values="0;0.4;0" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="y" values="48;28" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="x" values="162;172" dur="3s" repeatCount="indefinite"/>
        </text>
        <text x="172" y="38" font-size="14">z
          <animate attributeName="opacity" values="0;0.3;0" dur="3.5s" repeatCount="indefinite" begin="0.8s"/>
          <animate attributeName="y" values="38;16" dur="3.5s" repeatCount="indefinite" begin="0.8s"/>
          <animate attributeName="x" values="172;184" dur="3.5s" repeatCount="indefinite" begin="0.8s"/>
        </text>
        <text x="180" y="28" font-size="10">z
          <animate attributeName="opacity" values="0;0.2;0" dur="4s" repeatCount="indefinite" begin="1.6s"/>
          <animate attributeName="y" values="28;8" dur="4s" repeatCount="indefinite" begin="1.6s"/>
          <animate attributeName="x" values="180;194" dur="4s" repeatCount="indefinite" begin="1.6s"/>
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 180 })
</script>

<style scoped>
.casquito-sleeping {
  animation: casquito-sway 5s ease-in-out infinite;
}

@keyframes casquito-sway {
  0%, 100% { transform: rotate(-5deg) translateY(0); }
  50% { transform: rotate(-3deg) translateY(-5px); }
}
</style>
