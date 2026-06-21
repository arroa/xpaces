"use client";

import { useMemo } from "react";

export type BuildingFloorOptions = {
  id: string;
  name: string;
  floors: { id: string; name: string; buildingId: string }[];
};

type ViewerFloorAccessTreeProps = {
  buildings: BuildingFloorOptions[];
  selectedFloorIds: string[];
  onChange: (floorIds: string[]) => void;
  disabled?: boolean;
};

function buildingFloorIds(building: BuildingFloorOptions) {
  return building.floors.map((floor) => floor.id);
}

function isBuildingFullySelected(building: BuildingFloorOptions, selected: Set<string>) {
  const ids = buildingFloorIds(building);
  return ids.length > 0 && ids.every((id) => selected.has(id));
}

function isBuildingPartiallySelected(building: BuildingFloorOptions, selected: Set<string>) {
  const ids = buildingFloorIds(building);
  const count = ids.filter((id) => selected.has(id)).length;
  return count > 0 && count < ids.length;
}

export function ViewerFloorAccessTree({
  buildings,
  selectedFloorIds,
  onChange,
  disabled = false,
}: ViewerFloorAccessTreeProps) {
  const selected = useMemo(() => new Set(selectedFloorIds), [selectedFloorIds]);

  function updateSelected(next: Set<string>) {
    onChange([...next]);
  }

  function toggleFloor(floorId: string) {
    const next = new Set(selected);
    if (next.has(floorId)) {
      next.delete(floorId);
    } else {
      next.add(floorId);
    }
    updateSelected(next);
  }

  function toggleBuilding(building: BuildingFloorOptions) {
    const ids = buildingFloorIds(building);
    const next = new Set(selected);
    const allSelected = isBuildingFullySelected(building, selected);
    if (allSelected) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    updateSelected(next);
  }

  if (buildings.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Esta organización aún no tiene plantas para asignar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {buildings.map((building) => {
        const allSelected = isBuildingFullySelected(building, selected);
        const partial = isBuildingPartiallySelected(building, selected);

        return (
          <div
            key={building.id}
            className="surface-inset rounded-xl p-3"
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                disabled={disabled || building.floors.length === 0}
                checked={allSelected}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = partial;
                  }
                }}
                onChange={() => toggleBuilding(building)}
                className="accent-[var(--besharpx-amber)]"
              />
              <span className="text-sm font-semibold">{building.name}</span>
              <span className="text-xs text-[var(--muted)]">Todas</span>
            </label>

            {building.floors.length > 0 ? (
              <ul className="mt-2 space-y-1 border-l border-[var(--border-strong)] pl-4">
                {building.floors.map((floor) => (
                  <li key={floor.id}>
                    <label className="flex cursor-pointer items-center gap-2 py-0.5">
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={selected.has(floor.id)}
                        onChange={() => toggleFloor(floor.id)}
                        className="accent-[var(--besharpx-amber)]"
                      />
                      <span className="text-sm">{floor.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 pl-6 text-xs text-[var(--muted)]">Sin plantas</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
