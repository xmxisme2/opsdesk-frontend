<script setup lang="ts">
defineProps<{
  title: string
  phase: string
  items?: string[]
}>()
</script>

<template>
  <section class="feature-placeholder">
    <div class="feature-placeholder__status">{{ phase }}</div>
    <h2>{{ title }}</h2>
    <ul v-if="items?.length">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>

<style scoped>
.feature-placeholder {
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: var(--ops-bg-panel);
  padding: 24px;
}

.feature-placeholder__status {
  width: fit-content;
  margin-bottom: 10px;
  border: 1px solid #b8d2f2;
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--ops-primary-color);
  background: #eef6ff;
  font-size: 12px;
}

.feature-placeholder h2 {
  margin: 0;
  color: var(--ops-text-primary);
  font-size: 18px;
}

.feature-placeholder ul {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--ops-text-secondary);
  font-size: 14px;
}
</style>
