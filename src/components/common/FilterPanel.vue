<template>
  <section class="filter-panel">
    <slot />
  </section>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--ops-border-color);
  border-radius: 8px;
  background: var(--ops-bg-panel);
  padding: 16px;
}
</style>
