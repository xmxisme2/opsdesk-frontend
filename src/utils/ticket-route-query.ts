/**
 * 将工单列表的路由查询参数收敛为页面可直接使用的筛选值。
 * 仅接受字符串，避免数组查询参数或异常值污染列表请求。
 */
export function resolveTicketRouteQuery(query: Record<string, unknown>) {
  return {
    ticketNo: typeof query.ticketNo === 'string' ? query.ticketNo : '',
    keyword: typeof query.keyword === 'string' ? query.keyword : '',
  }
}
