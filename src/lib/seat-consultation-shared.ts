export type SeatSearchFilters = {
  buildingId: string;
  persona?: string;
  grupo?: string;
  equipo?: string;
  empresa?: string;
  floorId?: string;
};

export type SeatSearchRow = {
  id: string;
  persona: string;
  grupo: string;
  equipo: string;
  empresa: string;
  puesto: string;
  floorId: string;
  floorName: string;
  buildingId: string;
  buildingName: string;
  estado: "disponible" | "ocupado";
};

export type SeatSearchOptions = {
  buildings: { id: string; name: string }[];
  floors: { id: string; name: string; buildingId: string }[];
  catalogs: {
    grupo: string[];
    equipo: string[];
    empresa: string[];
  };
};

export type SeatClientFilters = {
  persona?: string;
  grupo?: string;
  equipo?: string;
  empresa?: string;
  floorId?: string;
};

export function filterSeatRows(rows: SeatSearchRow[], filters: SeatClientFilters): SeatSearchRow[] {
  const persona = filters.persona?.trim().toLocaleLowerCase("es");
  const grupo = filters.grupo?.trim();
  const equipo = filters.equipo?.trim();
  const empresa = filters.empresa?.trim();
  const floorId = filters.floorId?.trim();

  return rows.filter((seat) => {
    if (floorId && seat.floorId !== floorId) {
      return false;
    }
    if (grupo && seat.grupo !== grupo) {
      return false;
    }
    if (equipo && seat.equipo !== equipo) {
      return false;
    }
    if (empresa && seat.empresa !== empresa) {
      return false;
    }
    if (persona && !seat.persona.toLocaleLowerCase("es").includes(persona)) {
      return false;
    }
    return true;
  });
}
