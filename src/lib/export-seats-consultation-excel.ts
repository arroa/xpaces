import type { SeatSearchRow } from "@/lib/seat-consultation-shared";

const EXPORT_COLUMNS = [
  { key: "buildingName" as const, label: "Edificio", width: 20 },
  { key: "floorName" as const, label: "Planta", width: 18 },
  { key: "puesto" as const, label: "Puesto", width: 14 },
  { key: "estado" as const, label: "Estado", width: 14 },
  { key: "grupo" as const, label: "Grupo", width: 16 },
  { key: "equipo" as const, label: "Equipo", width: 16 },
  { key: "persona" as const, label: "Persona", width: 22 },
  { key: "empresa" as const, label: "Empresa", width: 18 },
];

const HEADER_BG = "FF002060";
const HEADER_TEXT = "FFFFFFFF";
const XPACES_DARK = "FF171717";
const XPACES_ROW_ALT = "FFF4F4F5";
const XPACES_BORDER = "FFD4D4D8";

function displayValue(value: string) {
  return value.trim() || "—";
}

function estadoLabel(estado: SeatSearchRow["estado"]) {
  return estado === "ocupado" ? "Ocupado" : "Disponible";
}

function formatExportFilename() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `Xpaces_${day}${month}${year}_${hours}${minutes}.xlsx`;
}

function cellValue(row: SeatSearchRow, key: (typeof EXPORT_COLUMNS)[number]["key"]) {
  if (key === "estado") {
    return estadoLabel(row.estado);
  }
  return displayValue(row[key]);
}

export async function exportSeatsConsultationExcel(rows: SeatSearchRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xpaces";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Consulta", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = EXPORT_COLUMNS.map((column) => ({
    key: column.key,
    width: column.width,
  }));

  const headerRow = sheet.addRow(EXPORT_COLUMNS.map((column) => column.label));
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_BG },
    };
    cell.font = {
      bold: true,
      color: { argb: HEADER_TEXT },
      size: 11,
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: XPACES_BORDER } },
      left: { style: "thin", color: { argb: XPACES_BORDER } },
      bottom: { style: "thin", color: { argb: XPACES_BORDER } },
      right: { style: "thin", color: { argb: XPACES_BORDER } },
    };
  });

  rows.forEach((row, index) => {
    const dataRow = sheet.addRow(
      EXPORT_COLUMNS.map((column) => cellValue(row, column.key)),
    );
    dataRow.height = 20;

    const fillArgb = index % 2 === 1 ? XPACES_ROW_ALT : "FFFFFFFF";
    dataRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillArgb },
      };
      cell.font = { size: 11, color: { argb: XPACES_DARK } };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: XPACES_BORDER } },
        left: { style: "thin", color: { argb: XPACES_BORDER } },
        bottom: { style: "thin", color: { argb: XPACES_BORDER } },
        right: { style: "thin", color: { argb: XPACES_BORDER } },
      };
    });
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = formatExportFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}
