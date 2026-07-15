import type { ApiId } from '../types/api.ts'
import type { TicketCategoryVO } from '../types/ticket.ts'

// 父级分类选择器必须移除当前分类及其全部后代，避免形成循环分类关系。
export function excludeCategoryBranch(
  tree: readonly TicketCategoryVO[],
  selectedId?: ApiId,
): TicketCategoryVO[] {
  return tree.flatMap((node) => {
    if (selectedId !== undefined && String(node.id) === String(selectedId)) {
      return []
    }
    return [{
      ...node,
      children: node.children ? excludeCategoryBranch(node.children, selectedId) : undefined,
    }]
  })
}

// 展平仅用于稳定的树结构断言和轻量业务判断，不修改原始分类树。
export function flattenCategoryIds(tree: readonly TicketCategoryVO[]): ApiId[] {
  return tree.flatMap((node) => [node.id, ...flattenCategoryIds(node.children ?? [])])
}
