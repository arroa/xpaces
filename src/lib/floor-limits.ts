export const FLOOR_MAX_SEATS = 150;
export const FLOOR_MAX_ROOMS = 99;
export const FLOOR_SEATS_LEGACY_MAX = 99;

export function floatingPanelColumnCount(totalSeats: number) {
  return totalSeats > FLOOR_SEATS_LEGACY_MAX ? 3 : 2;
}

export function floatingPanelWidthClass(totalSeats: number) {
  return floatingPanelColumnCount(totalSeats) === 3 ? "w-[8.75rem]" : "w-[6.25rem]";
}
