"use client";

import {
  ReactNode,
  useMemo,
} from "react";

export type SharedCalendarMode =
  | "admin"
  | "client";

export type SharedCalendarView =
  | "month"
  | "day";

export type SharedCalendarLegendItem = {
  key: string;
  label: string;
  className: string;
};

export type SharedCalendarDayState = {
  available?: boolean;
  booked?: boolean;
  hold?: boolean;
  selected?: boolean;
  selectedRange?: boolean;
  disabled?: boolean;
  countLabel?: string;
  secondaryLabel?: string;
};

export type SharedAvailabilityCalendarProps = {
  mode: SharedCalendarMode;
  view: SharedCalendarView;
  month: Date;
  selectedDate: string;
  todayKey: string;
  onMonthChange: (nextMonth: Date) => void;
  onViewChange: (view: SharedCalendarView) => void;
  onDateSelect: (date: string) => void;
  dayStates: Record<string, SharedCalendarDayState>;
  legendItems: SharedCalendarLegendItem[];
  dayViewTitle?: ReactNode;
  dayViewSubtitle?: ReactNode;
  dayViewActions?: ReactNode;
  dayViewContent?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel?: string;
  className?: string;
  headerSlot?: ReactNode;
  toolbarSlot?: ReactNode;
  footerSlot?: ReactNode;
  ariaLabel?: string;
};

const IST = "Asia/Kolkata";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: IST,
  }).format(date);
}

function buildMonthDays(month: Date) {
  const first = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
    12
  );

  const mondayIndex =
    (first.getDay() + 6) % 7;

  const start = new Date(first);
  start.setDate(
    first.getDate() - mondayIndex
  );

  return Array.from(
    { length: 42 },
    (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    }
  );
}

export default function SharedAvailabilityCalendar({
  mode,
  view,
  month,
  selectedDate,
  todayKey,
  onMonthChange,
  onViewChange,
  onDateSelect,
  dayStates,
  legendItems,
  dayViewTitle,
  dayViewSubtitle,
  dayViewActions,
  dayViewContent,
  loading = false,
  loadingLabel = "Loading calendar...",
  emptyLabel = "No calendar data available.",
  className = "",
  headerSlot,
  toolbarSlot,
  footerSlot,
  ariaLabel = "Availability calendar",
}: SharedAvailabilityCalendarProps) {
  const days = useMemo(
    () => buildMonthDays(month),
    [month]
  );

  function shiftMonth(amount: number) {
    const next = new Date(month);
    next.setMonth(month.getMonth() + amount);
    onMonthChange(next);
  }

  function goToday() {
    const today = new Date();
    onMonthChange(today);
    onDateSelect(dateKey(today));
  }

  return (
    <section
      className={`shared-availability-calendar ${
        mode === "admin"
          ? "is-admin"
          : "is-client"
      } ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {headerSlot}

      <div className="shared-availability-toolbar">
        <div
          className="shared-availability-view-toggle"
          role="group"
          aria-label="Calendar view"
        >
          <button
            type="button"
            className={
              view === "month" ? "is-active" : ""
            }
            onClick={() => onViewChange("month")}
            aria-pressed={view === "month"}
          >
            Month
          </button>

          <button
            type="button"
            className={
              view === "day" ? "is-active" : ""
            }
            onClick={() => onViewChange("day")}
            aria-pressed={view === "day"}
          >
            Day
          </button>
        </div>

        <div className="shared-availability-month-controls">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>

          <strong aria-live="polite">
            {monthTitle(month)}
          </strong>

          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>

          <button
            type="button"
            className="shared-availability-today"
            onClick={goToday}
          >
            Today
          </button>
        </div>

        {toolbarSlot}
      </div>

      <div
        className="shared-availability-legend"
        aria-label="Calendar legend"
      >
        {legendItems.map((item) => (
          <span key={item.key}>
            <i className={item.className} />
            {item.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div
          className="shared-availability-loading"
          role="status"
          aria-live="polite"
        >
          <span className="shared-availability-skeleton shared-availability-skeleton-wide" />
          <span className="shared-availability-skeleton shared-availability-skeleton-grid" />
          <span>{loadingLabel}</span>
        </div>
      ) : view === "month" ? (
        <div
          className="shared-availability-month-grid"
          role="grid"
          aria-label={`${monthTitle(month)} calendar`}
        >
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day) => (
            <div
              key={day}
              className="shared-availability-weekday"
              role="columnheader"
            >
              <span className="shared-availability-weekday-full">
                {day}
              </span>
              <span className="shared-availability-weekday-short">
                {day.slice(0, 3)}
              </span>
            </div>
          ))}

          {days.map((day) => {
            const key = dateKey(day);
            const state = dayStates?.[key] ?? {};
            const inMonth =
              day.getMonth() === month.getMonth();
            const selected =
              key === selectedDate || state.selected;

            const describedBy = [
              state.available ? "available" : "",
              state.booked ? "booked" : "",
              state.hold ? "payment hold" : "",
              state.selectedRange ? "selected range" : "",
              state.disabled ? "unavailable" : "",
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                className={`shared-availability-day ${
                  inMonth ? "" : "is-outside"
                } ${selected ? "is-selected" : ""} ${
                  state.disabled ? "is-disabled" : ""
                } ${
                  state.selectedRange
                    ? "is-selected-range"
                    : ""
                }`}
                onClick={() =>
                  !state.disabled && onDateSelect(key)
                }
                disabled={state.disabled}
                aria-label={`${new Intl.DateTimeFormat(
                  "en-IN",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: IST,
                  }
                ).format(day)}${
                  describedBy
                    ? `, ${describedBy}`
                    : ""
                }`}
                aria-selected={selected}
              >
                <span className="shared-availability-day-number">
                  {day.getDate()}
                </span>

                {key === todayKey && (
                  <span
                    className="shared-availability-today-badge"
                    aria-hidden="true"
                  >
                    Today
                  </span>
                )}

                <div className="shared-availability-day-state">
                  {state.available && (
                    <i className="is-available" />
                  )}
                  {state.booked && (
                    <i className="is-booked" />
                  )}
                  {state.hold && (
                    <i className="is-held" />
                  )}
                  {state.selectedRange && (
                    <i className="is-selected-range" />
                  )}
                </div>

                {state.countLabel && (
                  <small>{state.countLabel}</small>
                )}

                {state.secondaryLabel && (
                  <small className="is-secondary">
                    {state.secondaryLabel}
                  </small>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="shared-availability-day-view">
          <div className="shared-availability-day-view-header">
            <div>
              {dayViewTitle && (
                <h3>{dayViewTitle}</h3>
              )}
              {dayViewSubtitle && (
                <p>{dayViewSubtitle}</p>
              )}
            </div>

            {dayViewActions}
          </div>

          {dayViewContent ?? (
            <div className="shared-availability-empty-day">
              {emptyLabel}
            </div>
          )}
        </div>
      )}

      {footerSlot}
    </section>
  );
}