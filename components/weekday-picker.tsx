import { WEEKDAY_SHORT } from "@/lib/time";

export function WeekdayPicker({ name = "weekday", defaults = [] as number[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7].map((d) => (
        <label key={d} className="relative">
          <input type="checkbox" name={name} value={d} defaultChecked={defaults.includes(d)} className="peer sr-only" />
          <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-contrast peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
            {WEEKDAY_SHORT[d]}
          </span>
        </label>
      ))}
    </div>
  );
}
