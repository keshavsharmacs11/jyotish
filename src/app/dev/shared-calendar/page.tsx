"use client";

import { useMemo, useState } from "react";
import SharedAvailabilityCalendar, {
  type SharedCalendarLegendItem,
  type SharedCalendarDayState,
} from "@/components/availability/SharedAvailabilityCalendar";

type PreviewDay = {
  date: string;
  inCurrentMonth?: boolean;
  isToday?: boolean;
  state?: SharedCalendarDayState;
  meta?: string;
};

const IST = "Asia/Kolkata";

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildMonthDays(month: Date): PreviewDay[] {
  const first = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
    12
  );
  const start = new Date(first);
  const mondayIndex = (first.getDay() + 6) % 7;
  start.setDate(first.getDate() - mondayIndex);

  const todayKey = formatDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    const key = formatDateKey(date);
    const inCurrentMonth =
      date.getMonth() === month.getMonth();
    const dayNumber = date.getDate();

    const isAvailable =
      inCurrentMonth && dayNumber % 5 !== 0;
    const isBooked =
      isAvailable && dayNumber % 7 === 0;
    const isHold =
      isAvailable && dayNumber % 9 === 0;

    return {
      date: key,
      inCurrentMonth,
      isToday: key === todayKey,
      state: isAvailable
        ? {
            available: true,
            booked: isBooked,
            hold: isHold,
            countLabel: `${4 + (dayNumber % 5)} available`,
          }
        : undefined,
      meta: isAvailable
        ? `${4 + (dayNumber % 5)} available`
        : undefined,
    };
  });
}

export default function SharedCalendarPreviewPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });

  const [view, setView] = useState<"month" | "day">("month");

  const [selectedDate, setSelectedDate] = useState(() =>
    formatDateKey(new Date())
  );

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const days = useMemo(
    () => buildMonthDays(month),
    [month]
  );

  const dayStates = useMemo(() => {
    const states: Record<string, SharedCalendarDayState> = {};

    for (const day of days) {
      if (day.state) {
        states[day.date] = {
          ...day.state,
          selected: day.date === selectedDate,
        };
      }
    }

    if (!states[selectedDate]) {
      states[selectedDate] = {
        selected: true,
      };
    } else {
      states[selectedDate] = {
        ...states[selectedDate],
        selected: true,
      };
    }

    return states;
  }, [days, selectedDate]);

  const timeCells = useMemo(
    () =>
      [
        ["10:00", "10:00 AM", "available"],
        ["10:15", "10:15 AM", "available"],
        ["10:30", "10:30 AM", "booked"],
        ["10:45", "10:45 AM", "available"],
        ["11:00", "11:00 AM", "hold"],
        ["11:15", "11:15 AM", "available"],
        ["11:30", "11:30 AM", "empty"],
        ["11:45", "11:45 AM", "empty"],
      ].map(([time, label, state]) => ({
        time,
        label,
        state:
          selectedTime === time
            ? "selected"
            : state,
        disabled:
          state === "booked" ||
          state === "hold",
      })),
    [selectedTime]
  );

  const legendItems: SharedCalendarLegendItem[] = [
    {
      key: "available",
      label: "Available",
      className: "is-available",
    },
    {
      key: "booked",
      label: "Booked",
      className: "is-booked",
    },
    {
      key: "hold",
      label: "Payment hold",
      className: "is-held",
    },
    {
      key: "selected",
      label: "Selected range",
      className: "is-selected-range",
    },
  ];

  return (
    <main
      style={{
        padding: "32px",
        maxWidth: 1320,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <p className="admin-consultants-eyebrow">
          STEP 1 PREVIEW
        </p>
        <h1 style={{ margin: "6px 0 8px" }}>
          Shared Availability Calendar
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--color-muted)",
          }}
        >
          Visual-only verification. This page does not read or
          write MongoDB and does not change the existing admin or
          booking flow.
        </p>
      </div>

      <SharedAvailabilityCalendar
        mode="admin"
        month={month}
        onMonthChange={setMonth}
        view={view}
        onViewChange={setView}
        selectedDate={selectedDate}
        todayKey={formatDateKey(new Date())}
        onDateSelect={setSelectedDate}
        dayStates={dayStates}
        legendItems={legendItems}
        dayViewTitle="Preview consultant"
        dayViewSubtitle="India Standard Time · 15-minute grid"
        dayViewActions={
          <button
            type="button"
            onClick={() => setSelectedTime(null)}
            disabled={!selectedDate}
          >
            Clear day
          </button>
        }
        dayViewContent={
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
            }}
          >
            {timeCells.map((cell) => (
              <button
                key={cell.time}
                type="button"
                onClick={() =>
                  !cell.disabled &&
                  setSelectedTime(cell.time)
                }
                disabled={cell.disabled}
                aria-pressed={
                  cell.state === "selected"
                }
              >
                {cell.label}
              </button>
            ))}
          </div>
        }
        emptyLabel="No availability configured for this date."
      />
    </main>
  );
}
