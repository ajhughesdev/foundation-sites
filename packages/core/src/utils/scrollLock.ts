let scrollLockCount = 0;
let previousRootOverflow: string | null = null;
let previousRootPaddingRight: string | null = null;

export function lockScroll(): void {
  scrollLockCount += 1;
  if (scrollLockCount !== 1) return;

  const root = document.documentElement;
  previousRootOverflow = root.style.overflow;
  previousRootPaddingRight = root.style.paddingRight;

  const scrollbarWidth = window.innerWidth - root.clientWidth;
  if (scrollbarWidth > 0) {
    root.style.paddingRight = `${scrollbarWidth}px`;
  }
  root.style.overflow = 'hidden';
}

export function unlockScroll(): void {
  if (scrollLockCount === 0) return;
  scrollLockCount -= 1;
  if (scrollLockCount !== 0) return;

  const root = document.documentElement;
  if (previousRootOverflow !== null) root.style.overflow = previousRootOverflow;
  if (previousRootPaddingRight !== null) root.style.paddingRight = previousRootPaddingRight;

  previousRootOverflow = null;
  previousRootPaddingRight = null;
}

