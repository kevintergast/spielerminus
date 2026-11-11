"use client";

import { useOptimistic, useTransition } from "react";
import { attendanceAction } from "@/app/(app)/actions";
import type { Attendance } from "@/lib/db/schema";

const OPTIONS: [Attendance, string, string][] = [
  ["present", "Da", "border-yes bg-yes text-white"],
  ["late", "Spät", "border-maybe bg-maybe text-white"],
  ["excused", "Entsch.", "border-open bg-open text-white"],
  ["unexcused", "Unent.", "border-no bg-no text-white"],
];

export function AttendanceButtons({ invitationId, value }: { invitationId: string; value: Attendance | null }) {
  const [current, setCurrent] = useOptimistic(value);
  const [, start] = useTransition();
  return (
    <div className="flex gap-1">
      {OPTIONS.map(([v, label, active]) => (
        <button
          key={v}
          type="button"
          aria-pressed={current === v}
          onClick={() =>
            start(async () => {
              const next = current === v ? null : v;
              setCurrent(next);
              await attendanceAction(invitationId, next);
            })
          }
          className={`min-h-9 rounded-lg border px-2 text-xs font-semibold ${current === v ? active : "border-border text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
