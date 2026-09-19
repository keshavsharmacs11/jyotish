 "use client";

import { useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { isSlotInFutureIST } from "@/lib/bookingTime";

type AppointmentSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

type BookingMode = "video" | "voice";

type DateTimeSelectorProps = {
  availability: AppointmentSlot[];
  selectedDate: string | null;
  selectedTime: string | null;
  serviceDuration?: number;
  mode?: BookingMode | null;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
  /** Dates containing occupied consultant periods (bookings/holds). */
  occupiedDates?: string[];
};

type TimeGroup = "Morning" | "Afternoon" | "Evening";

const TIME_GROUPS: TimeGroup[] = [
  "Morning",
  "Afternoon",
  "Evening",
];

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
      ? 29
      : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function parseDateKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatDate(date: string, language: "en" | "hi" = "en") {
  const value = parseDateKey(date);

  return new Intl.DateTimeFormat(
    language === "hi" ? "hi-IN" : "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  ).format(value);
}

function formatTime(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    return time;
  }

  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${match[2]} ${suffix}`;
}

function timeOfDay(time: string): TimeGroup {
  const hour = Number(time.slice(0, 2));

  if (hour < 12) {
    return "Morning";
  }

  if (hour < 17) {
    return "Afternoon";
  }

  return "Evening";
}

function monthLabel(date: Date, language: "en" | "hi" = "en") {
  return new Intl.DateTimeFormat(
    language === "hi" ? "hi-IN" : "en-IN",
    {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  ).format(date);
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + amount,
      1
    )
  );
}

function sameMonth(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  );
}

function todayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return `${values.year}-${values.month}-${values.day}`;
}

export default function DateTimeSelector({
  availability,
  selectedDate,
  selectedTime,
  serviceDuration = 30,
  mode,
  onDateSelect,
  onTimeSelect,
  occupiedDates = [],
}: DateTimeSelectorProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  /*
   * Keep presentation-level filtering current even if the parent has not
   * refreshed its consultant feed yet. The shared helper remains the single
   * IST comparison rule.
   */
  const [bookingClockTick, setBookingClockTick] = useState(0);

  /*
   * Refresh the local presentation every 15 seconds so a slot that passes
   * while the user is on the booking screen disappears without navigation.
   */
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBookingClockTick((value) => value + 1);
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, []);

  /*
   * The API remains the source of truth for availability.
   * We only normalize the values for presentation, while defensively
   * removing any slot whose start minute has already passed in IST.
   */
  const normalizedAvailability = useMemo(() => {
    const byDate = new Map<string, AppointmentSlot[]>();

    for (const slot of availability ?? []) {
      const date = String(slot?.date ?? "").trim();
      const startTime = String(slot?.startTime ?? "").trim();
      const endTime = String(slot?.endTime ?? "").trim();

      if (
        !isValidDateKey(date) ||
        !/^\d{2}:\d{2}$/.test(startTime) ||
        !/^\d{2}:\d{2}$/.test(endTime)
      ) {
        continue;
      }

      if (!isSlotInFutureIST(date, startTime)) {
        continue;
      }

      const current = byDate.get(date) ?? [];
      current.push({
        date,
        startTime,
        endTime,
      });
      byDate.set(date, current);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({
        date,
        slots: slots.sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        ),
      }));
  }, [availability, bookingClockTick]);

  const availableDates = useMemo(
    () => normalizedAvailability.map((item) => item.date),
    [normalizedAvailability]
  );

  const firstAvailableMonth = useMemo(() => {
    const first = availableDates[0];

    if (!first) {
      return new Date();
    }

    const value = parseDateKey(first);

    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        1
      )
    );
  }, [availableDates]);

  const lastAvailableMonth = useMemo(() => {
    const last = availableDates[availableDates.length - 1];

    if (!last) {
      return new Date();
    }

    const value = parseDateKey(last);

    return new Date(
      Date.UTC(
        value.getUTCFullYear(),
        value.getUTCMonth(),
        1
      )
    );
  }, [availableDates]);

  const [visibleMonth, setVisibleMonth] =
    useState<Date | null>(null);

  const calendarMonth =
    visibleMonth ?? firstAvailableMonth;

  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  const occupiedDateSet = useMemo(
    () =>
      new Set(
        (occupiedDates ?? [])
          .map((date) => String(date).trim())
          .filter(Boolean),
      ),
    [occupiedDates],
  );

  const slotCountByDate = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of normalizedAvailability) {
      counts.set(item.date, item.slots.length);
    }

    return counts;
  }, [normalizedAvailability]);

  const selectedSlots = useMemo(
    () =>
      normalizedAvailability.find(
        (item) => item.date === selectedDate
      )?.slots ?? [],
    [normalizedAvailability, selectedDate]
  );

  const groupedSlots = useMemo(() => {
    const groups: Record<TimeGroup, AppointmentSlot[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };

    for (const slot of selectedSlots) {
      groups[timeOfDay(slot.startTime)].push(slot);
    }

    return groups;
  }, [selectedSlots]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getUTCFullYear();
    const month = calendarMonth.getUTCMonth();

    const firstDay = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(
      Date.UTC(year, month + 1, 0)
    ).getUTCDate();

    // Monday-first calendar, matching the booking UI.
    const leadingEmptyDays =
      (firstDay.getUTCDay() + 6) % 7;

    const cells: Array<Date | null> = [];

    for (let i = 0; i < leadingEmptyDays; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(Date.UTC(year, month, day)));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarMonth]);

  const availableDaysInVisibleMonth = useMemo(
    () =>
      availableDates.filter((date) =>
        sameMonth(parseDateKey(date), calendarMonth)
      ).length,
    [availableDates, calendarMonth]
  );

  const todayKey = todayDateKey();

  const canGoPrevious = !sameMonth(
    calendarMonth,
    firstAvailableMonth
  );

  const canGoNext = !sameMonth(
    calendarMonth,
    lastAvailableMonth
  );

  const selectDate = (date: string) => {
    if (!availableDateSet.has(date)) {
      return;
    }

    onDateSelect(date);
  };

  if (availableDates.length === 0) {
    return (
      <div
        className="booking-date-time-card"
        role="status"
        aria-live="polite"
      >
        <div className="booking-date-time-empty">
          <div className="booking-calendar-empty-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h3>{isHindi ? "कोई उपलब्ध तारीख नहीं" : "No available dates"}</h3>
            <p>
              {isHindi
                ? "इस चयन के लिए अभी कोई अपॉइंटमेंट समय उपलब्ध नहीं है।"
                : "No appointment times are available for this selection right now."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-date-time-card">
      <div className="booking-date-time-intro">
        <p className="eyebrow">{isHindi ? "तारीख और समय" : "DATE &amp; TIME"}</p>
        <h2>{isHindi ? "अपनी तारीख और समय चुनें" : "Choose your date and time"}</h2>
        <p>
          {isHindi
            ? "सत्र की अवधि "
            : "Sessions are "}
          <strong>
            {serviceDuration} {isHindi ? "मिनट" : "minutes"}
          </strong>
          {mode
            ? ` · ${
                mode === "video"
                  ? isHindi
                    ? "वीडियो"
                    : "Video"
                  : isHindi
                  ? "वॉइस"
                  : "Voice"
              }`
            : ""}{" "}
          · {isHindi
            ? "सभी समय भारतीय मानक समय के अनुसार दिखाए गए हैं।"
            : "All times are shown in India Standard Time."}
        </p>
      </div>

      <div className="booking-calendar-block">
        <div className="booking-calendar-header">
          <button
            type="button"
            className="booking-calendar-nav"
            onClick={() =>
              setVisibleMonth(
                addMonths(calendarMonth, -1)
              )
            }
            disabled={!canGoPrevious}
            aria-label={isHindi ? "पिछला उपलब्ध महीना" : "Previous available month"}
          >
            <span aria-hidden="true">‹</span>
          </button>

          <div className="booking-calendar-month">
            <span className="booking-calendar-month-eyebrow">
              {isHindi ? "उपलब्ध तारीखें" : "AVAILABLE DATES"}
            </span>
            <strong>{monthLabel(calendarMonth, language)}</strong>
            <span>
              {availableDaysInVisibleMonth}{" "}
              {isHindi
                ? availableDaysInVisibleMonth === 1
                  ? "उपलब्ध दिन"
                  : "उपलब्ध दिन"
                : availableDaysInVisibleMonth === 1
                ? "available day"
                : "available days"}{" "}
              {isHindi ? "इस महीने" : "this month"}
            </span>
          </div>

          <button
            type="button"
            className="booking-calendar-nav"
            onClick={() =>
              setVisibleMonth(
                addMonths(calendarMonth, 1)
              )
            }
            disabled={!canGoNext}
            aria-label={isHindi ? "अगला उपलब्ध महीना" : "Next available month"}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div
          className="booking-calendar-weekdays"
          aria-hidden="true"
        >
          {(isHindi
            ? ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"]
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          ).map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div
          className="booking-calendar-grid"
          role="grid"
          aria-label={isHindi ? `${monthLabel(calendarMonth, language)} कैलेंडर` : `${monthLabel(calendarMonth, language)} calendar`}
        >
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="booking-calendar-day is-empty"
                  aria-hidden="true"
                />
              );
            }

            const key = dateKey(date);
            const isAvailable =
              availableDateSet.has(key);
            const isOccupied =
              occupiedDateSet.has(key);
            const isSelected = selectedDate === key;
            const count =
              slotCountByDate.get(key) ?? 0;
            const isToday = todayKey === key;

            return (
              <button
                key={key}
                type="button"
                className={`booking-calendar-day ${
                  isAvailable
                    ? "is-available"
                    : "is-unavailable"
                } ${
                  isOccupied ? "has-booking" : ""
                } ${
                  isSelected ? "is-selected" : ""
                } ${isToday ? "is-today" : ""}`}
                disabled={!isAvailable}
                onClick={() => selectDate(key)}
                role="gridcell"
                aria-selected={isSelected}
                aria-label={
                  isAvailable
                    ? isHindi
                      ? `${formatDate(key, language)}, ${count} ${
                          count === 1 ? "समय उपलब्ध" : "समय उपलब्ध"
                        }${isOccupied ? ", कुछ समय पहले से बुक हैं" : ""}`
                      : `${formatDate(key, language)}, ${count} available ${
                          count === 1 ? "slot" : "slots"
                        }${isOccupied ? ", some periods are already occupied" : ""}`
                    : isOccupied
                    ? isHindi
                      ? `${formatDate(key, language)}, वर्तमान में बुक`
                      : `${formatDate(key, language)}, currently occupied`
                    : isHindi
                    ? `${formatDate(key, language)}, उपलब्ध नहीं`
                    : `${formatDate(key, language)}, unavailable`
                }
              >
                <span className="booking-calendar-day-number">
                  {date.getUTCDate()}
                </span>

                {isToday && (
                  <span className="booking-calendar-today-label">
                    {isHindi ? "आज" : "Today"}
                  </span>
                )}

                {(isAvailable || isOccupied) && (
                  <span
                    className="booking-calendar-day-dot"
                    aria-hidden="true"
                  >
                    {isAvailable && <i className="is-available" />}
                    {isOccupied && <i className="is-booked" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="booking-calendar-legend"
          aria-label={isHindi ? "कैलेंडर संकेत" : "Calendar legend"}
        >
          <span>
            <i className="booking-calendar-legend-dot is-available" />
            {isHindi ? "उपलब्ध" : "Available"}
          </span>

          <span>
            <i className="booking-calendar-legend-dot is-selected" />
            {isHindi ? "चयनित" : "Selected"}
          </span>

          <span>
            <i className="booking-calendar-legend-dot is-booked" />
            {isHindi ? "बुक" : "Occupied"}
          </span>
        </div>
      </div>

      {selectedDate && (
        <div
          className="booking-time-picker-block"
          aria-live="polite"
        >
          {selectedSlots.length > 0 ? (
            <>
              <div className="booking-date-time-selected-label">
                <div>
                  <span className="booking-selected-kicker">
                    {isHindi ? "चयनित तारीख" : "SELECTED DATE"}
                  </span>
                  <strong>
                    {formatDate(selectedDate, language)}
                  </strong>
                </div>

                <span>
                  {selectedSlots.length}{" "}
                  {isHindi
                    ? "समय उपलब्ध"
                    : selectedSlots.length === 1
                    ? "available time"
                    : "available times"}
                </span>
              </div>

              {TIME_GROUPS.map((group) => {
                const slots = groupedSlots[group];

                if (slots.length === 0) {
                  return null;
                }

                return (
                  <section
                    key={group}
                    className="booking-time-group"
                    aria-labelledby={`booking-time-${group.toLowerCase()}`}
                  >
                    <h3
                      id={`booking-time-${group.toLowerCase()}`}
                    >
                      {isHindi
                        ? group === "Morning"
                          ? "सुबह"
                          : group === "Afternoon"
                          ? "दोपहर"
                          : "शाम"
                        : group}
                    </h3>

                    <div
                      className="booking-time-options"
                      role="list"
                      aria-label={isHindi ? `${group === "Morning" ? "सुबह" : group === "Afternoon" ? "दोपहर" : "शाम"} के समय` : `${group} time slots`}
                    >
                      {slots.map((slot) => {
                        const selected =
                          selectedTime ===
                          slot.startTime;

                        return (
                          <button
                            key={`${slot.date}-${slot.startTime}`}
                            type="button"
                            className={`booking-time-option ${
                              selected
                                ? "is-selected"
                                : ""
                            }`}
                            onClick={() =>
                              onTimeSelect(
                                slot.startTime
                              )
                            }
                            aria-pressed={selected}
                            aria-label={
                              isHindi
                                ? `${formatTime(slot.startTime)}, ${serviceDuration} मिनट का अपॉइंटमेंट, जो ${formatTime(slot.endTime)} पर समाप्त होगा`
                                : `${formatTime(slot.startTime)}, ${serviceDuration} minute${serviceDuration === 1 ? "" : "s"} appointment ending at ${formatTime(slot.endTime)}`
                            }
                          >
                            <span>
                              {formatTime(
                                slot.startTime
                              )}
                            </span>

                            <small>
                              {serviceDuration} {isHindi ? "मिनट" : "min"}
                            </small>

                            {selected && (
                              <b aria-hidden="true">
                                ✓
                              </b>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </>
          ) : (
            <div
              className="booking-date-time-empty"
              role="status"
            >
              <h3>{isHindi ? "इस तारीख को कोई समय उपलब्ध नहीं" : "No times available on this date"}</h3>
              <p>
                {isHindi
                  ? "जारी रखने के लिए कोई दूसरी हाइलाइट की गई तारीख चुनें।"
                  : "Choose another highlighted date to continue."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
