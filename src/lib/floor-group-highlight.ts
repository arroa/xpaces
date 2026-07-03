export type GroupHighlightColor = {
  bg: string;
  border: string;
  text: string;
  ring: string;
};

export const GROUP_HIGHLIGHT_PALETTE: GroupHighlightColor[] = [
  { bg: "#22d3ee", border: "#0891b2", text: "#042f2e", ring: "#22d3ee" },
  { bg: "#a78bfa", border: "#7c3aed", text: "#1e1b4b", ring: "#a78bfa" },
  { bg: "#4ade80", border: "#16a34a", text: "#14532d", ring: "#4ade80" },
  { bg: "#fb923c", border: "#ea580c", text: "#431407", ring: "#fb923c" },
  { bg: "#f472b6", border: "#db2777", text: "#500724", ring: "#f472b6" },
  { bg: "#60a5fa", border: "#2563eb", text: "#1e3a8a", ring: "#60a5fa" },
  { bg: "#facc15", border: "#ca8a04", text: "#422006", ring: "#facc15" },
  { bg: "#2dd4bf", border: "#0d9488", text: "#134e4a", ring: "#2dd4bf" },
  { bg: "#e879f9", border: "#c026d3", text: "#581c87", ring: "#e879f9" },
  { bg: "#f87171", border: "#dc2626", text: "#450a0a", ring: "#f87171" },
  { bg: "#94a3b8", border: "#64748b", text: "#0f172a", ring: "#94a3b8" },
  { bg: "#bef264", border: "#65a30d", text: "#365314", ring: "#bef264" },
];

export function listPlantedSeatEquipos(seats: { equipo: string; position: unknown | null }[]) {
  const equipos = new Set<string>();
  for (const seat of seats) {
    if (!seat.position) {
      continue;
    }
    const equipo = seat.equipo.trim();
    if (equipo) {
      equipos.add(equipo);
    }
  }
  return [...equipos].sort((left, right) => left.localeCompare(right, "es"));
}

export function buildGroupColorMap(items: string[]) {
  const map = new Map<string, GroupHighlightColor>();
  items.forEach((item, index) => {
    map.set(item, GROUP_HIGHLIGHT_PALETTE[index % GROUP_HIGHLIGHT_PALETTE.length]);
  });
  return map;
}

export function resolveGroupHighlightStyle(
  equipo: string,
  highlightedEquipos: Set<string>,
  colorMap: Map<string, GroupHighlightColor>,
): GroupHighlightColor | null {
  const key = equipo.trim();
  if (!key || !highlightedEquipos.has(key)) {
    return null;
  }
  return colorMap.get(key) ?? null;
}
