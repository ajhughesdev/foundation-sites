export type RafScheduler = {
  schedule(): void;
  cancel(): void;
};

export function createRafScheduler(callback: () => void): RafScheduler {
  let rafId = 0;

  return {
    schedule() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        callback();
      });
    },
    cancel() {
      if (!rafId) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
    },
  };
}

