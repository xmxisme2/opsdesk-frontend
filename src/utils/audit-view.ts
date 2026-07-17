export const AUDIT_OPERATION_TYPE_LABELS: Record<string, string> = {
  LOGIN: '登录',
  CREATE: '新建',
  UPDATE: '更新',
  DELETE: '删除',
  ASSIGN: '分派',
  TRANSFER: '转派',
  UPLOAD: '上传',
  RESET_PASSWORD: '重置密码',
}

export const AUDIT_BIZ_TYPE_LABELS: Record<string, string> = {
  TICKET: '工单',
  COMMENT: '评论',
  ATTACHMENT: '附件',
  USER: '用户',
  ROLE: '角色',
  SYSTEM_CONFIG: '系统配置',
  KNOWLEDGE: '知识库',
  AI: 'AI 服务',
}

// 审计日志编码是后端检索条件，界面仅展示中文释义；未知编码保留原值便于排查数据问题。
export function auditOperationTypeLabel(operationType?: string) {
  return operationType ? (AUDIT_OPERATION_TYPE_LABELS[operationType] ?? operationType) : '-'
}

export function auditBizTypeLabel(bizType?: string) {
  return bizType ? (AUDIT_BIZ_TYPE_LABELS[bizType] ?? bizType) : '-'
}
