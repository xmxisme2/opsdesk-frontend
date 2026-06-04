<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    mode?: 'brand' | 'center'
  }>(),
  {
    mode: 'brand',
  },
)

// 认证布局同时服务登录分屏页和注册居中页，避免页面各自重复维护外层视觉结构。
const brandBullets = ['统一接收企业内部问题', '按角色分派和跟踪进度', '沉淀工单处理经验']
</script>

<template>
  <main class="auth-layout" :class="`auth-layout--${props.mode}`">
    <section v-if="props.mode === 'brand'" class="auth-layout__brand">
      <div class="auth-layout__brand-inner">
        <p class="auth-layout__eyebrow">OpsDesk</p>
        <h1>智能工单协作平台</h1>
        <p class="auth-layout__summary">统一接收、分派、跟踪、处理和沉淀企业内部问题。</p>
        <ul class="auth-layout__bullets">
          <li v-for="item in brandBullets" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>
    <section class="auth-layout__form">
      <slot />
    </section>
  </main>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: #f0f2f6;
}

.auth-layout--brand {
  display: grid;
  grid-template-columns: minmax(500px, 640px) minmax(430px, 1fr);
}

.auth-layout--center {
  display: grid;
  place-items: center;
  padding: 48px 20px;
}

.auth-layout__brand {
  min-height: 100vh;
  padding: 86px 72px;
  background: #0e1f38;
  color: #ffffff;
}

.auth-layout__brand-inner {
  max-width: 430px;
}

.auth-layout__eyebrow {
  margin: 0 0 72px;
  color: #d8e4f5;
  font-size: 26px;
  font-weight: 700;
}

.auth-layout__brand h1 {
  margin: 0;
  font-size: 38px;
  font-weight: 700;
  line-height: 1.26;
}

.auth-layout__summary {
  margin: 18px 0 34px;
  color: #b8c6d9;
  font-size: 17px;
  line-height: 1.7;
}

.auth-layout__bullets {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  color: #d6deea;
  list-style: none;
}

.auth-layout__bullets li {
  position: relative;
  padding-left: 22px;
  line-height: 1.55;
}

.auth-layout__bullets li::before {
  position: absolute;
  top: 10px;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5aa7ff;
  content: '';
}

.auth-layout__form {
  display: grid;
  place-items: center;
  min-width: 0;
  padding: 40px;
}

.auth-layout--center .auth-layout__form {
  width: 100%;
  padding: 0;
}

@media (max-width: 900px) {
  .auth-layout--brand {
    grid-template-columns: 1fr;
  }

  .auth-layout__brand {
    min-height: auto;
    padding: 36px 28px;
  }

  .auth-layout__eyebrow {
    margin-bottom: 22px;
  }

  .auth-layout__brand h1 {
    font-size: 30px;
  }

  .auth-layout__form {
    padding: 28px 20px 40px;
  }
}
</style>
