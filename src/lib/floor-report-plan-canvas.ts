import { toImageSpacePosition, type LayoutPositionSpace, type PlanPosition } from "@/lib/floor-plan-frame";

type PlanSeat = {
  code: string;
  position: PlanPosition;
  estado: "disponible" | "ocupado";
  persona: string;
};

type PlanRoom = {
  code: string;
  position: PlanPosition;
};

const AMBER = "#fbbf24";
const DARK = "#171717";
const SKY = "#38bdf8";

function isUtilizedSeat(seat: PlanSeat) {
  return seat.estado === "ocupado" || Boolean(seat.persona.trim());
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar el plano"));
    image.src = url;
  });
}

function resolveImagePosition(
  position: PlanPosition,
  layoutPositionSpace: LayoutPositionSpace,
  imageWidth: number,
  imageHeight: number,
): PlanPosition {
  const viewport = { width: imageWidth, height: imageHeight };
  const frame = { width: imageWidth, height: imageHeight, offsetX: 0, offsetY: 0 };
  return toImageSpacePosition(position, layoutPositionSpace, frame, viewport);
}

function markerRadius(imageWidth: number, imageHeight: number) {
  return Math.max(10, Math.min(imageWidth, imageHeight) * 0.014);
}

function drawSeatMarker(
  ctx: CanvasRenderingContext2D,
  seat: PlanSeat,
  x: number,
  y: number,
  radius: number,
) {
  const utilized = isUtilizedSeat(seat);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = utilized ? AMBER : DARK;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, radius * 0.18);
  ctx.strokeStyle = utilized ? DARK : AMBER;
  ctx.stroke();

  const fontSize = Math.max(9, radius * 0.95);
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = utilized ? DARK : AMBER;
  ctx.fillText(seat.code, x, y);
}

function drawRoomMarker(
  ctx: CanvasRenderingContext2D,
  room: PlanRoom,
  x: number,
  y: number,
  size: number,
) {
  const half = size * 0.72;
  ctx.fillStyle = DARK;
  ctx.strokeStyle = SKY;
  ctx.lineWidth = Math.max(1.5, size * 0.12);
  ctx.beginPath();
  ctx.roundRect(x - half, y - half, half * 2, half * 2, size * 0.18);
  ctx.fill();
  ctx.stroke();

  const fontSize = Math.max(9, size * 0.55);
  ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = SKY;
  ctx.fillText(room.code, x, y);
}

export async function renderFloorPlanCanvas(input: {
  imageUrl: string;
  layoutPositionSpace: LayoutPositionSpace;
  seats: PlanSeat[];
  rooms: PlanRoom[];
  maxWidthPx: number;
  maxHeightPx: number;
}) {
  const image = await loadImage(input.imageUrl);
  const scale = Math.min(
    input.maxWidthPx / image.naturalWidth,
    input.maxHeightPx / image.naturalHeight,
    1,
  );
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo preparar el plano");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const radius = markerRadius(width, height);

  for (const room of input.rooms) {
    const position = resolveImagePosition(
      room.position,
      input.layoutPositionSpace,
      image.naturalWidth,
      image.naturalHeight,
    );
    drawRoomMarker(ctx, room, (position.x / 100) * width, (position.y / 100) * height, radius * 2);
  }

  for (const seat of input.seats) {
    const position = resolveImagePosition(
      seat.position,
      input.layoutPositionSpace,
      image.naturalWidth,
      image.naturalHeight,
    );
    drawSeatMarker(ctx, seat, (position.x / 100) * width, (position.y / 100) * height, radius);
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthPx: width,
    heightPx: height,
    widthMm: (width / 96) * 25.4,
    heightMm: (height / 96) * 25.4,
  };
}
