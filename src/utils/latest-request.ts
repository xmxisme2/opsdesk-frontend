// 为取消旧请求的页面加载器提供版本令牌，确保只有最后发起的请求能写入响应状态。
export function createLatestRequestGuard() {
  let latestVersion = 0

  return {
    begin() {
      latestVersion += 1
      return latestVersion
    },
    isLatest(version: number) {
      return version === latestVersion
    },
  }
}
