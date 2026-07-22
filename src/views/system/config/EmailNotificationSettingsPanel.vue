<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { getEmailNotificationSettings, updateEmailNotificationSettings } from '@/api/modules/system'
import PageHeader from '@/components/common/PageHeader.vue'
import type { EmailNotificationSettings } from '@/types/system'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const form = reactive<EmailNotificationSettings>({ enabled: false, defaultRecipient: 'xmxisme@gmail.com' })
const rules: FormRules<EmailNotificationSettings> = {
  defaultRecipient: [
    { required: true, message: '请填写默认收件邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] },
  ],
}

// 开关和默认邮箱由后端 system_config 持久化；邮件服务器账号始终留在服务端环境变量中。
async function loadSettings() {
  loading.value = true
  errorMessage.value = ''
  try { Object.assign(form, await getEmailNotificationSettings()) }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '邮件通知配置加载失败' }
  finally { loading.value = false }
}

async function saveSettings() {
  if (!await formRef.value?.validate()) return
  saving.value = true
  try {
    Object.assign(form, await updateEmailNotificationSettings({ ...form, defaultRecipient: form.defaultRecipient.trim() }))
    ElMessage.success('邮件通知配置已保存')
  } finally { saving.value = false }
}

onMounted(loadSettings)
</script>

<template>
  <!-- 邮件发送始终使用固定默认邮箱，避免工单事件按用户资料分散投递。 -->
  <section class="page-stack email-settings-page" v-loading="loading">
    <PageHeader title="邮件通知配置" description="开启后，所有站内通知会同步投递到指定的默认邮箱">
      <template #actions>
        <el-button :icon="ArrowLeft" @click="router.push('/system/config')">返回系统配置</el-button>
        <el-button :icon="Refresh" @click="loadSettings">刷新</el-button>
        <el-button type="primary" :loading="saving" @click="saveSettings">保存配置</el-button>
      </template>
    </PageHeader>
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon>
      <template #default><el-button link type="primary" @click="loadSettings">重新加载</el-button></template>
    </el-alert>
    <section class="page-panel settings-panel">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="启用邮件通知">
          <el-switch v-model="form.enabled" active-text="开启" inactive-text="关闭" />
          <p class="hint">开启后，系统会在成功创建站内通知后发送邮件；发送异常不会影响站内通知。</p>
        </el-form-item>
        <el-form-item label="默认收件邮箱" prop="defaultRecipient">
          <el-input v-model="form.defaultRecipient" maxlength="128" placeholder="请输入接收通知的邮箱" />
          <p class="hint">当前默认值为 xmxisme@gmail.com。开关开启时，所有邮件均投递到此邮箱。</p>
        </el-form-item>
        <el-alert title="SMTP 服务器账号由后端环境变量配置；未配置 SMTP 时邮件会被安全跳过，并保留站内通知。" type="info" :closable="false" show-icon />
      </el-form>
    </section>
  </section>
</template>

<style scoped>
.settings-panel { max-width: 760px; padding: 24px; }
.hint { margin: 8px 0 0; color: var(--ops-text-secondary); font-size: 13px; line-height: 1.6; }
</style>
