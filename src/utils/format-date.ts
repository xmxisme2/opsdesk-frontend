export function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }
  return value.replace('T', ' ').replace(/\+\d{2}:\d{2}$/, '')
}
