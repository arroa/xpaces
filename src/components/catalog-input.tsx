"use client";

type CatalogInputProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  listId: string;
  compact?: boolean;
};

export function CatalogInput({
  label,
  value,
  options,
  onChange,
  disabled,
  listId,
  compact,
}: CatalogInputProps) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
      <input
        list={listId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={
          compact
            ? "mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm disabled:opacity-60"
            : "mt-1 w-full rounded-xl input-field px-4 py-2.5 disabled:opacity-60"
        }
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
