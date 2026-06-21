export type PlanPosition = { x: number; y: number };

export type PlanSize = { width: number; height: number };

/** Rectángulo de la imagen con object-contain dentro del viewport. */
export type FittedPlanFrame = PlanSize & {
  offsetX: number;
  offsetY: number;
};

export type LayoutPositionSpace = "container" | "image";

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

/** Calcula el frame visible del plano (object-contain) dentro del viewport. */
export function computeFittedPlanFrame(
  viewport: PlanSize,
  image: PlanSize,
): FittedPlanFrame {
  if (!viewport.width || !viewport.height || !image.width || !image.height) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(viewport.width / image.width, viewport.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    width,
    height,
    offsetX: (viewport.width - width) / 2,
    offsetY: (viewport.height - height) / 2,
  };
}

/** Puntero → coordenadas % relativas al frame del plano (espacio imagen). */
export function pointerToImagePercent(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  frame: FittedPlanFrame,
): PlanPosition | null {
  if (!frame.width || !frame.height) {
    return null;
  }

  const x = clientX - viewportRect.left - frame.offsetX;
  const y = clientY - viewportRect.top - frame.offsetY;

  return {
    x: clampPercent((x / frame.width) * 100),
    y: clampPercent((y / frame.height) * 100),
  };
}

/** Convierte posiciones legacy (% del viewport) al espacio imagen. */
export function containerPercentToImagePercent(
  position: PlanPosition,
  frame: FittedPlanFrame,
  viewport: PlanSize,
): PlanPosition {
  const px = (position.x / 100) * viewport.width;
  const py = (position.y / 100) * viewport.height;

  return {
    x: clampPercent(((px - frame.offsetX) / frame.width) * 100),
    y: clampPercent(((py - frame.offsetY) / frame.height) * 100),
  };
}

/** Normaliza una posición al espacio imagen para renderizar o persistir. */
export function toImageSpacePosition(
  position: PlanPosition,
  space: LayoutPositionSpace,
  frame: FittedPlanFrame,
  viewport: PlanSize,
): PlanPosition {
  if (space === "image") {
    return position;
  }
  return containerPercentToImagePercent(position, frame, viewport);
}
