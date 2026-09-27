// 以 key 區分的 debounce；delay 為 0 時直接執行，設定變更時可整批取消。
export class KeyedDebouncer {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  run(key: string, delayMs: number, task: () => void): void {
    this.cancel(key);
    if (delayMs <= 0) {
      task();
      return;
    }
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        task();
      }, delayMs),
    );
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  dispose(): void {
    this.cancelAll();
  }
}
