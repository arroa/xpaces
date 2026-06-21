import type { FloorLayoutData } from "@/lib/floor-layout-data";
import { renderFloorPlanCanvas } from "@/lib/floor-report-plan-canvas";
import {
  computeFloorReportStats,
  listPlantedRooms,
  listPlantedSeats,
  listUtilizedPlantedSeats,
  type FloorReportStats,
} from "@/lib/floor-report-stats";

const HEADER_BG = "#002060";
const HEADER_TEXT = "#ffffff";
const MARGIN = 12;
const PAGE_HEADER_HEIGHT = 14;
const PAGE_FOOTER_HEIGHT = 9;
const CONTENT_TOP = PAGE_HEADER_HEIGHT + 4;
const STATS_PANEL_WIDTH = 58;
const HERO_GAP = 5;
const PLAN_MAX_HEIGHT = 92;
const COLUMN_HEADERS = ["Puesto", "Grupo", "Equipo", "Nombre", "Empresa"];
const TABLE_SEPARATOR_WIDTH = 3.5;
const TABLE_SEPARATOR_GRAY: [number, number, number] = [235, 235, 240];

const BRAND_BG: [number, number, number] = [5, 5, 6];
const BRAND_FOOTER: [number, number, number] = [18, 18, 22];
const BRAND_AMBER: [number, number, number] = [251, 191, 36];
const BRAND_MUTED: [number, number, number] = [180, 180, 192];
const BRAND_FOREGROUND: [number, number, number] = [250, 250, 250];

const NAVY_RGB = { r: 0, g: 32, b: 96 };
const AMBER_RGB = { r: 251, g: 191, b: 36 };

type SeatRow = {
  puesto: string;
  grupo: string;
  equipo: string;
  nombre: string;
  empresa: string;
};

type StatLine = {
  label: string;
  value: number;
  highlight?: boolean;
};

function displayValue(value: string) {
  return value.trim() || "—";
}

function formatGeneratedAt(date: Date) {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatExportFilename(buildingName: string, floorName: string) {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  const safe = (value: string) =>
    value
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40) || "Planta";
  return `Xpaces_Informe_${safe(buildingName)}_${safe(floorName)}_${stamp}.pdf`;
}

function sanitizePdfText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function drawPageChrome(
  doc: import("jspdf").jsPDF,
  buildingName: string,
  floorName: string,
  generatedAt: string,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BRAND_BG);
  doc.rect(0, 0, pageWidth, PAGE_HEADER_HEIGHT, "F");

  doc.setDrawColor(...BRAND_AMBER);
  doc.setLineWidth(0.35);
  doc.line(0, PAGE_HEADER_HEIGHT, pageWidth, PAGE_HEADER_HEIGHT);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_AMBER);
  doc.text("Xpaces", MARGIN, 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND_FOREGROUND);
  doc.text(`${buildingName} — ${floorName}`, pageWidth / 2, 8.2, { align: "center" });

  doc.setFillColor(...BRAND_FOOTER);
  doc.rect(0, pageHeight - PAGE_FOOTER_HEIGHT, pageWidth, PAGE_FOOTER_HEIGHT, "F");

  doc.setDrawColor(86, 86, 106);
  doc.setLineWidth(0.2);
  doc.line(0, pageHeight - PAGE_FOOTER_HEIGHT, pageWidth, pageHeight - PAGE_FOOTER_HEIGHT);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND_MUTED);
  doc.text("Xpaces by BeSharpX", MARGIN, pageHeight - 3.2);

  doc.setFontSize(7);
  doc.text(generatedAt, pageWidth - MARGIN, pageHeight - 3.2, { align: "right" });
}

function drawStatsPanel(
  doc: import("jspdf").jsPDF,
  x: number,
  y: number,
  width: number,
  minHeight: number,
  stats: FloorReportStats,
) {
  const headerHeight = 9;
  const rowHeight = 7.5;
  const sections: { title: string; items: StatLine[] }[] = [
    {
      title: "Puestos",
      items: [
        { label: "Total", value: stats.totalSeats },
        { label: "En plano", value: stats.plantedSeats },
        { label: "Utilizados", value: stats.utilizedSeats, highlight: true },
        { label: "Disponibles", value: stats.availableSeats },
      ],
    },
    {
      title: "Salas",
      items: [
        { label: "Total", value: stats.totalRooms },
        { label: "En plano", value: stats.plantedRooms },
      ],
    },
  ];

  const bodyHeight = sections.reduce(
    (total, section) => total + 5 + section.items.length * rowHeight,
    4,
  );
  const panelHeight = Math.max(minHeight, headerHeight + bodyHeight + 4);

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, panelHeight, 2.5, 2.5, "FD");

  doc.setFillColor(NAVY_RGB.r, NAVY_RGB.g, NAVY_RGB.b);
  doc.rect(x, y + headerHeight - 1.5, width, 1.5, "F");
  doc.roundedRect(x, y, width, headerHeight, 2.5, 2.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Resumen", x + 4, y + 6);

  let itemY = y + headerHeight + 5;

  for (const section of sections) {
    doc.setTextColor(NAVY_RGB.r, NAVY_RGB.g, NAVY_RGB.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(section.title.toUpperCase(), x + 4, itemY);
    itemY += 4;

    for (const item of section.items) {
      doc.setDrawColor(236, 236, 240);
      doc.setLineWidth(0.1);
      doc.line(x + 3, itemY + rowHeight - 2, x + width - 3, itemY + rowHeight - 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text(item.label, x + 4, itemY + 3.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      if (item.highlight) {
        doc.setTextColor(AMBER_RGB.r, AMBER_RGB.g, AMBER_RGB.b);
      } else {
        doc.setTextColor(23, 23, 23);
      }
      doc.text(String(item.value), x + width - 4, itemY + 4, { align: "right" });

      itemY += rowHeight;
    }

    itemY += 2;
  }

  return panelHeight;
}

function buildDualColumnRows(rows: SeatRow[]) {
  const midpoint = Math.ceil(rows.length / 2);
  const leftRows = rows.slice(0, midpoint);
  const rightRows = rows.slice(midpoint);
  const total = Math.max(leftRows.length, rightRows.length);
  const tableRows: string[][] = [];

  for (let index = 0; index < total; index += 1) {
    const left = leftRows[index];
    const right = rightRows[index];
    tableRows.push([
      left?.puesto ?? "",
      left?.grupo ?? "",
      left?.equipo ?? "",
      left?.nombre ?? "",
      left?.empresa ?? "",
      "",
      right?.puesto ?? "",
      right?.grupo ?? "",
      right?.equipo ?? "",
      right?.nombre ?? "",
      right?.empresa ?? "",
    ]);
  }

  return tableRows;
}

export async function exportFloorReportPdf(data: FloorLayoutData) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const generatedAt = formatGeneratedAt(new Date());
  const stats = computeFloorReportStats(data);
  const utilizedRows: SeatRow[] = listUtilizedPlantedSeats(data).map((seat) => ({
    puesto: seat.code,
    grupo: displayValue(seat.grupo),
    equipo: displayValue(seat.equipo),
    nombre: displayValue(seat.persona),
    empresa: displayValue(seat.empresa),
  }));

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const heroTopY = CONTENT_TOP;

  drawPageChrome(doc, data.building.name, data.floor.name, generatedAt);

  const planMaxWidth = contentWidth - STATS_PANEL_WIDTH - HERO_GAP;

  const plan = await renderFloorPlanCanvas({
    imageUrl: data.floor.imageUrl,
    layoutPositionSpace: data.floor.layoutPositionSpace,
    seats: listPlantedSeats(data).flatMap((seat) =>
      seat.position
        ? [
            {
              code: seat.code,
              position: seat.position,
              estado: seat.estado,
              persona: seat.persona,
            },
          ]
        : [],
    ),
    rooms: listPlantedRooms(data).flatMap((room) =>
      room.position ? [{ code: room.code, position: room.position }] : [],
    ),
    maxWidthPx: 960,
    maxHeightPx: 720,
  });

  const planScale = Math.min(planMaxWidth / plan.widthMm, PLAN_MAX_HEIGHT / plan.heightMm, 1);
  const planWidth = plan.widthMm * planScale;
  const planHeight = plan.heightMm * planScale;
  const planX = MARGIN;

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.rect(planX - 0.5, heroTopY - 0.5, planWidth + 1, planHeight + 1);
  doc.addImage(plan.dataUrl, "PNG", planX, heroTopY, planWidth, planHeight);

  const statsX = planX + planWidth + HERO_GAP;
  const statsHeight = drawStatsPanel(doc, statsX, heroTopY, STATS_PANEL_WIDTH, planHeight, stats);

  let cursorY = heroTopY + Math.max(planHeight, statsHeight) + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(23, 23, 23);
  doc.text("Puestos plantados utilizados", MARGIN, cursorY);
  cursorY += 4;

  const tableHead = [...COLUMN_HEADERS, "", ...COLUMN_HEADERS];
  const tableBody = buildDualColumnRows(utilizedRows);
  const columnGroupWidth = (contentWidth - TABLE_SEPARATOR_WIDTH) / 2;
  const col = {
    puesto: columnGroupWidth * 0.11,
    grupo: columnGroupWidth * 0.14,
    equipo: columnGroupWidth * 0.14,
    nombre: columnGroupWidth * 0.36,
    empresa: columnGroupWidth * 0.25,
  };
  const separatorStyle = {
    cellWidth: TABLE_SEPARATOR_WIDTH,
    fillColor: TABLE_SEPARATOR_GRAY,
    lineWidth: 0,
    textColor: TABLE_SEPARATOR_GRAY,
  };

  autoTable(doc, {
    startY: cursorY,
    head: [tableHead],
    body: tableBody,
    margin: {
      top: PAGE_HEADER_HEIGHT + 3,
      right: MARGIN,
      bottom: PAGE_FOOTER_HEIGHT + 2,
      left: MARGIN,
    },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 1.2,
      lineColor: [212, 212, 216],
      lineWidth: 0.1,
      textColor: [23, 23, 23],
      overflow: "linebreak",
    },
    bodyStyles: {
      fontSize: 6,
    },
    headStyles: {
      fillColor: HEADER_BG,
      textColor: HEADER_TEXT,
      fontStyle: "bold",
      halign: "center",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: col.puesto },
      1: { cellWidth: col.grupo },
      2: { cellWidth: col.equipo },
      3: { cellWidth: col.nombre },
      4: { cellWidth: col.empresa },
      5: separatorStyle,
      6: { cellWidth: col.puesto },
      7: { cellWidth: col.grupo },
      8: { cellWidth: col.equipo },
      9: { cellWidth: col.nombre },
      10: { cellWidth: col.empresa },
    },
    didParseCell(data) {
      if (data.column.index === 5) {
        data.cell.styles.fillColor = TABLE_SEPARATOR_GRAY;
        data.cell.styles.lineWidth = 0;
        data.cell.text = [];
        return;
      }

      if (data.section === "head" && (data.column.index === 0 || data.column.index === 6)) {
        data.cell.styles.fontSize = 5.5;
        data.cell.styles.cellPadding = { top: 1.2, right: 0.4, bottom: 1.2, left: 0.4 };
      }
    },
    didDrawPage: () => {
      drawPageChrome(doc, data.building.name, data.floor.name, generatedAt);
    },
  });

  doc.save(
    formatExportFilename(sanitizePdfText(data.building.name), sanitizePdfText(data.floor.name)),
  );
}
