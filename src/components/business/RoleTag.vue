<script setup lang="ts">
import type { UserRoleCode } from '@/types/user'

defineProps<{
  role: UserRoleCode
}>()

const ROLE_LABELS: Record<UserRoleCode, string> = {
  USER: '提交人',
  AGENT: '处理人',
  MANAGER: '负责人',
  ADMIN: '管理员',
}
</script>

<template>
  <el-tag>{{ ROLE_LABELS[role] }}</el-tag>
</template>
