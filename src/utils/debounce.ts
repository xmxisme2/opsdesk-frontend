export type DebouncedFn<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
  cancel: () => void
  flush: () => void
}

// 防抖工具用于列表关键词和筛选联动，避免用户连续输入时反复触发查询接口。
export function createDebouncedFn<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 400,
): DebouncedFn<TArgs> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let latestArgs: TArgs | undefined

  const run = ((...args: TArgs) => {
    latestArgs = args
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = undefined
      if (!latestArgs) {
        return
      }
      const argsToRun = latestArgs
      latestArgs = undefined
      callback(...argsToRun)
    }, delay)
  }) as DebouncedFn<TArgs>

  run.cancel = () => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = undefined
    latestArgs = undefined
  }

  run.flush = () => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = undefined
    if (!latestArgs) {
      return
    }
    const argsToRun = latestArgs
    latestArgs = undefined
    callback(...argsToRun)
  }

  return run
}
