export type FloatingSide = 'top' | 'bottom' | 'left' | 'right';
export type FloatingAlign = 'start' | 'center' | 'end';
export type FloatingPlacement =
  | FloatingSide
  | `${FloatingSide}-${FloatingAlign}`;

export type ComputeFloatingPositionOptions = {
  placement: FloatingPlacement;
  offset: number;
  viewportPadding: number;
  flip: boolean;
};

export type FloatingPosition = {
  top: number;
  left: number;
  placement: FloatingPlacement;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parsePlacement(placement: FloatingPlacement): { side: FloatingSide; align: FloatingAlign } {
  const [side, align] = placement.split('-') as [FloatingSide, FloatingAlign?];
  return {
    side,
    align: align ?? 'center',
  };
}

function oppositeSide(side: FloatingSide): FloatingSide {
  switch (side) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

function computeRaw(anchor: DOMRect, floating: DOMRect, placement: FloatingPlacement, offset: number): { top: number; left: number } {
  const { side, align } = parsePlacement(placement);

  let top = 0;
  let left = 0;

  if (side === 'bottom') top = anchor.bottom + offset;
  if (side === 'top') top = anchor.top - floating.height - offset;
  if (side === 'right') left = anchor.right + offset;
  if (side === 'left') left = anchor.left - floating.width - offset;

  if (side === 'top' || side === 'bottom') {
    if (align === 'start') left = anchor.left;
    if (align === 'end') left = anchor.right - floating.width;
    if (align === 'center') left = anchor.left + (anchor.width - floating.width) / 2;
  } else {
    if (align === 'start') top = anchor.top;
    if (align === 'end') top = anchor.bottom - floating.height;
    if (align === 'center') top = anchor.top + (anchor.height - floating.height) / 2;
  }

  return { top, left };
}

function getOverflow(anchor: DOMRect, floating: DOMRect, position: { top: number; left: number }, viewportPadding: number): number {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const leftOverflow = Math.max(0, viewportPadding - position.left);
  const rightOverflow = Math.max(0, position.left + floating.width + viewportPadding - viewportWidth);
  const topOverflow = Math.max(0, viewportPadding - position.top);
  const bottomOverflow = Math.max(0, position.top + floating.height + viewportPadding - viewportHeight);

  return leftOverflow + rightOverflow + topOverflow + bottomOverflow;
}

export function computeFloatingPosition(
  anchor: DOMRect,
  floating: DOMRect,
  options: ComputeFloatingPositionOptions
): FloatingPosition {
  const { placement, offset, viewportPadding, flip } = options;

  let resolvedPlacement: FloatingPlacement = placement;
  let raw = computeRaw(anchor, floating, resolvedPlacement, offset);

  if (flip) {
    const { side, align } = parsePlacement(placement);
    const flipped: FloatingPlacement = align === 'center' ? oppositeSide(side) : (`${oppositeSide(side)}-${align}` as const);

    const rawFlipped = computeRaw(anchor, floating, flipped, offset);
    const overflowPreferred = getOverflow(anchor, floating, raw, viewportPadding);
    const overflowFlipped = getOverflow(anchor, floating, rawFlipped, viewportPadding);

    if (overflowFlipped + 0.5 < overflowPreferred) {
      resolvedPlacement = flipped;
      raw = rawFlipped;
    }
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const maxTop = Math.max(viewportPadding, viewportHeight - viewportPadding - floating.height);
  const maxLeft = Math.max(viewportPadding, viewportWidth - viewportPadding - floating.width);

  const top = clamp(raw.top, viewportPadding, maxTop);
  const left = clamp(raw.left, viewportPadding, maxLeft);

  return { top, left, placement: resolvedPlacement };
}
