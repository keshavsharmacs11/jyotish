"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Window = {
  date: string;
  startTime: string;
  endTime: string;
};

type BookingBlock = {
  bookingId: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  customerName: string;
  status: string;
  paymentStatus: string;
};

type HoldBlock = {
  bookingId: string;
  date: string;
  startTime: string;
  endTime: string;
  expiresAt: string;
  serviceName: string;
  customerName: string;
};

type Props = {
  consultants: {
    _id: string;
    name: string;
    active: boolean;
  }[];
  onEditConsultant?: (consultant: any) => void;
  onConsultantsRefresh?: () => Promise<void> | void;
};

const IST_TIME_ZONE = "Asia/Kolkata";

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
      ? 29
      : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

const WEEKDAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

function toMinutes(time: unknown): number | null {
  if (typeof time !== "string") {
    return null;
  }

  const [hour, minute] = time.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function toTime(minutes: number): string {
  if (minutes >= 1440) {
    return "24:00";
  }

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
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

function currentISTMinutes(): number | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const hour = Number(values.hour);
  const minute = Number(values.minute);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function isWindowCurrentOrFuture(window: Window): boolean {
  const today = dateKey(new Date());

  if (window.date > today) {
    return true;
  }

  if (window.date < today) {
    return false;
  }

  const nowMinutes = currentISTMinutes();
  const endMinutes = toMinutes(window.endTime);

  if (nowMinutes === null || endMinutes === null) {
    return false;
  }

  return endMinutes > nowMinutes;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function weekdayForDate(value: string): number {
  return parseDateInput(value).getDay();
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST_TIME_ZONE,
  }).format(new Date(Date.UTC(year, month - 1, day, 6)));
}

function formatTime(time: string): string {
  if (time === "24:00") {
    return "12:00 AM";
  }

  const match = /^(\d{2}):(\d{2})$/.exec(time);

  if (!match) {
    return time;
  }

  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${match[2]} ${suffix}`;
}

function sameWindow(a: Window, b: Window): boolean {
  return (
    a.date === b.date &&
    a.startTime === b.startTime &&
    a.endTime === b.endTime
  );
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && endA > startB;
}

function monthGrid(month: Date): Date[] {
  const first = new Date(
    Date.UTC(
      month.getUTCFullYear(),
      month.getUTCMonth(),
      1,
      12,
    ),
  );

  const mondayIndex = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

/*
 * The admin availability endpoint has existed with two response shapes:
 *
 * 1. data.consultant
 * 2. data.consultants[0]
 *
 * Keep the UI compatible with both so existing API contracts are untouched.
 */
function getConsultantFromResponse(
  data: any,
  consultantId: string,
) {
  return (
    data?.consultant ??
    data?.consultants?.find(
      (consultant: any) =>
        String(consultant?.id ?? consultant?._id) ===
        String(consultantId),
    ) ??
    data?.consultants?.[0] ??
    null
  );
}

function scrollToSection(id: string) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

export default function ConsultantAvailabilityCalendar({
  consultants,
  onEditConsultant,
  onConsultantsRefresh,
}: Props) {
  const [
    selectedConsultantId,
    setSelectedConsultantId,
  ] = useState(
    consultants[0]?._id ?? "",
  );

  /*
   * Prevent React development/StrictMode from issuing the same
   * consultant availability request twice for the same selection.
   */
  const lastAvailabilityRequestRef =
    useRef<string | null>(null);

  const [
    windows,
    setWindows,
  ] = useState<Window[]>([]);



  /*
   * Draft state is what the admin is currently editing.
   * Saved state is the last server-confirmed schedule.
   */
  const [
    savedWindows,
    setSavedWindows,
  ] = useState<Window[]>([]);

  const [
    bookings,
    setBookings,
  ] = useState<BookingBlock[]>([]);

  const [
    holds,
    setHolds,
  ] = useState<HoldBlock[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    dirty,
    setDirty,
  ] = useState(false);

  const todayKey = dateKey(new Date());

  const [
    formDate,
    setFormDate,
  ] = useState(todayKey);

  const [
    formStart,
    setFormStart,
  ] = useState("10:00");

  const [
    formEnd,
    setFormEnd,
  ] = useState("18:00");

  const [
    editingWindow,
    setEditingWindow,
  ] = useState<Window | null>(null);

  const [
    repeatEnabled,
    setRepeatEnabled,
  ] = useState(false);

  const [
    repeatFrom,
    setRepeatFrom,
  ] = useState(todayKey);

  const [
    repeatUntil,
    setRepeatUntil,
  ] = useState(todayKey);

  const [
    repeatDays,
    setRepeatDays,
  ] = useState<number[]>([
    1,
    2,
    3,
    4,
    5,
  ]);

  const [
    repeatStart,
    setRepeatStart,
  ] = useState("10:00");

  const [
    repeatEnd,
    setRepeatEnd,
  ] = useState("18:00");

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12));
  });

  const selectedConsultant =
    consultants.find(
      (consultant) =>
        consultant._id ===
        selectedConsultantId,
    );

  /* Warn before the admin leaves with unsaved availability changes. */
  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  useEffect(() => {
    const selectedStillExists =
      consultants.some(
        (consultant) =>
          consultant._id ===
            selectedConsultantId &&
          consultant.active,
      );

    if (selectedStillExists) {
      return;
    }

    const nextConsultant =
      consultants.find(
        (consultant) => consultant.active,
      );

    setSelectedConsultantId(
      nextConsultant?._id ?? "",
    );

    // The previous consultant may have been removed or deactivated.
    // Clear its calendar immediately so stale availability is never
    // displayed while the replacement consultant is loading.
    setWindows([]);
    setSavedWindows([]);
    setBookings([]);
    setHolds([]);
    setEditingWindow(null);
    setDirty(false);
    lastAvailabilityRequestRef.current =
      null;
  }, [
    consultants,
    selectedConsultantId,
  ]);

  async function loadCalendar(
    consultantId = selectedConsultantId,
  ) {
    if (!consultantId) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `/api/admin/consultants/${encodeURIComponent(
            consultantId,
          )}/availability-calander`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to load consultant availability.",
        );
      }

      const consultantData =
        getConsultantFromResponse(
          data,
          consultantId,
        );

          const loadedWindows: Window[] =
      consultantData?.availabilityWindows ?? [];

      const visibleWindows = loadedWindows.filter(
        isWindowCurrentOrFuture,
      );

      setWindows(visibleWindows);
      setSavedWindows(visibleWindows);

      setBookings(
        data.bookings ?? [],
      );

      setHolds(
        data.holds ?? [],
      );

      setDirty(false);
      setEditingWindow(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load consultant availability.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedConsultantId) {
      return;
    }

    if (lastAvailabilityRequestRef.current === selectedConsultantId) {
      return;
    }

    lastAvailabilityRequestRef.current = selectedConsultantId;

    void loadCalendar(selectedConsultantId).catch(() => {
      lastAvailabilityRequestRef.current = null;
    });

    // The selected consultant intentionally controls this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConsultantId]);

  const monthDays =
    useMemo(
      () =>
        monthGrid(
          calendarMonth,
        ),
      [calendarMonth],
    );

  const selectedDateWindows =
    useMemo(
      () =>
        savedWindows
          .filter(isWindowCurrentOrFuture)
          .filter(
            (window) =>
              window.date ===
              formDate,
          ),
      [savedWindows, formDate],
    );

  const selectedDateDraftWindows =
    useMemo(
      () =>
        windows
          .filter(isWindowCurrentOrFuture)
          .filter(
            (window) =>
              window.date ===
              formDate,
          ),
      [windows, formDate],
    );

  const selectedDateBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.date ===
            formDate,
        ),
      [bookings, formDate],
    );

  const selectedDateHolds =
    useMemo(
      () =>
        holds.filter(
          (hold) =>
            hold.date ===
            formDate,
        ),
      [holds, formDate],
    );

  function resetForm() {
    setEditingWindow(null);
    setFormStart("10:00");
    setFormEnd("18:00");
    setError("");
  }

  function validateWindow(
    date: string,
    startTime: string,
    endTime: string,
    ignoredWindow?: Window | null,
  ): string | null {
    if (!isValidDateKey(date)) {
      return "Choose a valid calendar date.";
    }

    if (date < todayKey) {
      return "Availability cannot be added for a past date.";
    }

    const start =
      toMinutes(startTime);

    const end =
      toMinutes(endTime);

    if (
      start === null ||
      end === null ||
      end <= start
    ) {
      return "End time must be later than start time.";
    }

    if (date === todayKey) {
      const now = toMinutes(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: IST_TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date()),
      );

      if (now !== null && end <= now) {
        return "Today's availability must end in the future.";
      }
    }

    const occupied = [
      ...bookings
        .filter(
          (item) =>
            item.date === date,
        )
        .map((item) => ({
          start: toMinutes(
            item.startTime,
          ),
          end: toMinutes(
            item.endTime,
          ),
          label: "booking",
        })),

      ...holds
        .filter(
          (item) =>
            item.date === date,
        )
        .map((item) => ({
          start: toMinutes(
            item.startTime,
          ),
          end: toMinutes(
            item.endTime,
          ),
          label: "payment hold",
        })),
    ];

    for (const item of occupied) {
      if (
        item.start !== null &&
        item.end !== null &&
        overlaps(
          start,
          end,
          item.start,
          item.end,
        )
      ) {
        return `This availability overlaps an existing ${item.label}. Choose a different time.`;
      }
    }

    /*
     * Prevent overlapping draft availability windows.
     * This reduces duplicate customer slots while leaving
     * the existing server-side booking validation untouched.
     */
    const conflictingWindow =
      windows.find(
        (window) => {
          if (
            window.date !==
            date
          ) {
            return false;
          }

          if (
            ignoredWindow &&
            sameWindow(
              window,
              ignoredWindow,
            )
          ) {
            return false;
          }

          const existingStart =
            toMinutes(
              window.startTime,
            );

          const existingEnd =
            toMinutes(
              window.endTime,
            );

          return (
            existingStart !== null &&
            existingEnd !== null &&
            overlaps(
              start,
              end,
              existingStart,
              existingEnd,
            )
          );
        },
      );

    if (conflictingWindow) {
      return "This availability overlaps another availability window. Choose a different time.";
    }

    return null;
  }

  function addOrUpdateWindow() {
    const validationError =
      validateWindow(
        formDate,
        formStart,
        formEnd,
        editingWindow,
      );

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    const next: Window = {
      date: formDate,
      startTime: formStart,
      endTime: formEnd,
    };

    setWindows(
      (current) => {
        const withoutEdited =
          editingWindow
            ? current.filter(
                (item) =>
                  !sameWindow(
                    item,
                    editingWindow,
                  ),
              )
            : current;

        const duplicate =
          withoutEdited.some(
            (item) =>
              sameWindow(
                item,
                next,
              ),
          );

        if (duplicate) {
          return withoutEdited;
        }

        return [
          ...withoutEdited,
          next,
        ].sort(
          (a, b) =>
            a.date.localeCompare(
              b.date,
            ) ||
            a.startTime.localeCompare(
              b.startTime,
            ),
        );
      },
    );

    setFormDate(next.date);
    setCalendarMonth(
      parseDateInput(
        next.date,
      ),
    );

    setDirty(true);
    setSuccess(
      "Draft availability added. Press Save Availability to make it live.",
    );
    setError("");
    setEditingWindow(null);
  }

  function editWindow(
    window: Window,
  ) {
    setFormDate(
      window.date,
    );

    setFormStart(
      window.startTime,
    );

    setFormEnd(
      window.endTime,
    );

    setEditingWindow(
      window,
    );

    setError("");
    setSuccess("");

    setCalendarMonth(
      parseDateInput(
        window.date,
      ),
    );

    scrollToSection("availability-add");
  }

 function removeWindow(window: Window) {
  setWindows((current) => {
    const next = current.filter(
      (item) => !sameWindow(item, window),
    );

    return next;
  });

  /*
   * Removal is an unsaved draft change.
   * The UI must update immediately, while MongoDB
   * remains unchanged until Save Availability.
   */
  setDirty(true);

  setEditingWindow((current) =>
    current && sameWindow(current, window)
      ? null
      : current,
  );

  setError("");
  setSuccess("Window removed from draft. Save Availability to apply the change.");

  /*
   * Keep the removed date selected so the admin can
   * immediately see that its availability disappeared.
   */
  setFormDate(window.date);
  setCalendarMonth(
    parseDateInput(window.date),
  );
}

  function clearDate() {
    if (
      selectedDateBookings.length ||
      selectedDateHolds.length
    ) {
      setError(
        "This date has booking activity. Remove only the free availability around those periods.",
      );
      return;
    }

    setWindows(
      (current) =>
        current.filter(
          (window) =>
            window.date !==
            formDate,
        ),
    );

    setDirty(true);
    setSuccess("");
    setError("");
  }

  function applyRepeatToDraft() {
    if (
      !repeatFrom ||
      !repeatUntil
    ) {
      setError(
        "Choose the repeat date range first.",
      );
      return;
    }

    const start =
      parseDateInput(
        repeatFrom,
      );

    const end =
      parseDateInput(
        repeatUntil,
      );

    if (end < start) {
      setError(
        "The repeat end date must be on or after the start date.",
      );
      return;
    }

    if (
      repeatDays.length ===
      0
    ) {
      setError(
        "Select at least one weekday.",
      );
      return;
    }

    const startMinutes =
      toMinutes(
        repeatStart,
      );

    const endMinutes =
      toMinutes(
        repeatEnd,
      );

    if (
      startMinutes ===
        null ||
      endMinutes ===
        null ||
      endMinutes <=
        startMinutes
    ) {
      setError(
        "Repeat end time must be later than repeat start time.",
      );
      return;
    }

    const additions: Window[] =
      [];

    let skipped = 0;

    const cursor =
      new Date(start);

    while (
      cursor <= end
    ) {
      const date =
        dateKey(cursor);

      if (
        repeatDays.includes(
          weekdayForDate(
            date,
          ),
        )
      ) {
        const validationError =
          validateWindow(
            date,
            repeatStart,
            repeatEnd,
          );

        if (
          !validationError
        ) {
          additions.push({
            date,
            startTime:
              repeatStart,
            endTime:
              repeatEnd,
          });
        } else {
          skipped += 1;
        }
      }

      cursor.setDate(
        cursor.getDate() +
          1,
      );
    }

    setWindows(
      (current) => {
        const merged = [
          ...current,
        ];

        for (
          const addition of additions
        ) {
          if (
            !merged.some(
              (item) =>
                sameWindow(
                  item,
                  addition,
                ),
            )
          ) {
            merged.push(
              addition,
            );
          }
        }

        return merged.sort(
          (a, b) =>
            a.date.localeCompare(
              b.date,
            ) ||
            a.startTime.localeCompare(
              b.startTime,
            ),
        );
      },
    );

    setDirty(true);

    /*
     * Show the first generated date immediately.
     */
    if (
      additions.length > 0
    ) {
      setFormDate(
        additions[0].date,
      );

      setCalendarMonth(
        parseDateInput(
          additions[0].date,
        ),
      );

      scrollToSection("availability-draft-preview");
    }

    setSuccess(
      skipped > 0
        ? `${additions.length} date(s) prepared. ${skipped} date(s) skipped because they conflict with existing availability, a booking, or a payment hold. Press Save Availability to make the draft live.`
        : `${additions.length} date(s) prepared. Review the draft, then press Save Availability to make it live.`,
    );

    setError("");
  }

  async function save() {
    if (
      !selectedConsultantId ||
      saving ||
      !dirty
    ) {
      return;
    }

    /*
     * Capture the exact draft being submitted before the request.
     */
    const draftWindows =
      windows
        .filter(isWindowCurrentOrFuture)
        .map(
          (window) => ({
            date:
              window.date,
            startTime:
              window.startTime,
            endTime:
              window.endTime,
          }),
        );

    const preferredDate =
      formDate;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `/api/admin/consultants/${encodeURIComponent(
            selectedConsultantId,
          )}/availability-calander`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "include",
            body: JSON.stringify({
              availabilityWindows:
                draftWindows,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to save availability.",
        );
      }

      /*
       * IMPORTANT:
       * This endpoint returns the saved consultant under
       * data.consultants[0] in the current response shape.
       * We support both current and older shapes.
       */
      const savedConsultant =
        getConsultantFromResponse(
          data,
          selectedConsultantId,
        );

      const savedWindows: Window[] =
        savedConsultant
          ?.availabilityWindows ??
        draftWindows;

      setWindows(savedWindows);
      setSavedWindows(savedWindows);

      setBookings(
        data.bookings ??
          bookings,
      );

      setHolds(
        data.holds ??
          holds,
      );

      /*
       * Keep the date the admin was editing visible.
       * If that date no longer exists, use the first saved date.
       */
      const dateToShow =
        savedWindows.some(
          (window) =>
            window.date ===
            preferredDate,
        )
          ? preferredDate
          : savedWindows[0]
              ?.date ??
            preferredDate;

      setFormDate(
        dateToShow,
      );

      setCalendarMonth(
        parseDateInput(
          dateToShow,
        ),
      );

      setEditingWindow(null);
      setDirty(false);

      /*
       * Availability has already been returned by the successful PUT.
       * Do not trigger another parent refresh here; that caused the
       * same availability data to be requested again.
       */
      setSuccess(
        "Availability saved successfully.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  const repeatPreviewDates =
    useMemo(() => {
      if (
        !repeatFrom ||
        !repeatUntil ||
        repeatDays.length ===
          0
      ) {
        return [] as string[];
      }

      const start =
        parseDateInput(
          repeatFrom,
        );

      const end =
        parseDateInput(
          repeatUntil,
        );

      if (end < start) {
        return [] as string[];
      }

      const dates: string[] =
        [];

      const cursor =
        new Date(start);

      while (
        cursor <= end
      ) {
        const date =
          dateKey(cursor);

        if (
          repeatDays.includes(
            weekdayForDate(
              date,
            ),
          )
        ) {
          dates.push(date);
        }

        cursor.setDate(
          cursor.getDate() +
            1,
        );
      }

      return dates;
    }, [
      repeatFrom,
      repeatUntil,
      repeatDays,
    ]);

  const repeatPreviewConflicts =
    useMemo(() => {
      if (
        !repeatPreviewDates.length
      ) {
        return 0;
      }

      const start =
        toMinutes(
          repeatStart,
        );

      const end =
        toMinutes(
          repeatEnd,
        );

      if (
        start === null ||
        end === null ||
        end <= start
      ) {
        return 0;
      }

      return repeatPreviewDates.filter(
        (date) => {
          const occupiedConflict =
            bookings.some(
              (booking) => {
                const bookingStart =
                  toMinutes(
                    booking.startTime,
                  );

                const bookingEnd =
                  toMinutes(
                    booking.endTime,
                  );

                return (
                  booking.date ===
                    date &&
                  bookingStart !==
                    null &&
                  bookingEnd !==
                    null &&
                  overlaps(
                    start,
                    end,
                    bookingStart,
                    bookingEnd,
                  )
                );
              },
            ) ||
            holds.some(
              (hold) => {
                const holdStart =
                  toMinutes(
                    hold.startTime,
                  );

                const holdEnd =
                  toMinutes(
                    hold.endTime,
                  );

                return (
                  hold.date ===
                    date &&
                  holdStart !==
                    null &&
                  holdEnd !==
                    null &&
                  overlaps(
                    start,
                    end,
                    holdStart,
                    holdEnd,
                  )
                );
              },
            );

          if (
            occupiedConflict
          ) {
            return true;
          }

          /*
           * Also count dates where the planned weekly window
           * would overlap an existing draft availability window.
           */
          return windows.some(
            (window) => {
              if (
                window.date !==
                date
              ) {
                return false;
              }

              const windowStart =
                toMinutes(
                  window.startTime,
                );

              const windowEnd =
                toMinutes(
                  window.endTime,
                );

              return (
                windowStart !==
                  null &&
                windowEnd !==
                  null &&
                overlaps(
                  start,
                  end,
                  windowStart,
                  windowEnd,
                )
              );
            },
          );
        },
      ).length;
    }, [
      repeatPreviewDates,
      repeatStart,
      repeatEnd,
      bookings,
      holds,
      windows,
    ]);

  const repeatPreviewAddableCount =
    Math.max(
      0,
      repeatPreviewDates.length -
        repeatPreviewConflicts,
    );

  const windowsThisMonth =
    savedWindows
      .filter(isWindowCurrentOrFuture)
      .filter(
      (window) => {
        const date =
          parseDateInput(
            window.date,
          );

        return (
          date.getFullYear() ===
            calendarMonth.getFullYear() &&
          date.getMonth() ===
            calendarMonth.getMonth()
        );
      },
    );

  const bookedDates =
    useMemo(
      () =>
        new Set(
          bookings.map(
            (booking) =>
              booking.date,
          ),
        ),
      [bookings],
    );

  const heldDates =
    useMemo(
      () =>
        new Set(
          holds.map(
            (hold) =>
              hold.date,
          ),
        ),
      [holds],
    );

  return (
    <section
      className="admin-availability-manager"
      aria-label="Consultant availability manager"
    >
      <div className="admin-availability-manager-header">
        <div>
          <span className="admin-consultants-eyebrow">
            BOOKING AVAILABILITY
          </span>

          <h2>
            Availability Manager
          </h2>

          <p>
            Set when this consultant can take appointments.
            Customer times are generated automatically from each
            service duration.
          </p>
        </div>

        <div className="admin-availability-manager-header-actions">
          <select
            value={
              selectedConsultantId
            }
            onChange={(event) => {
              setSelectedConsultantId(
                event.target.value,
              );

              resetForm();
              setDirty(false);
              setSuccess("");
            }}
            disabled={
              loading ||
              saving
            }
            aria-label="Select consultant"
          >
            {consultants.map(
              (consultant) => (
                <option
                  key={
                    consultant._id
                  }
                  value={
                    consultant._id
                  }
                >
                  {
                    consultant.name
                  }
                  {consultant.active
                    ? ""
                    : " · Inactive"}
                </option>
              ),
            )}
          </select>

          {selectedConsultant &&
            onEditConsultant && (
              <button
                type="button"
                className="admin-availability-secondary-button"
                onClick={() =>
                  onEditConsultant(
                    selectedConsultant,
                  )
                }
                disabled={
                  saving
                }
              >
                Edit Profile
              </button>
            )}
        </div>
      </div>

      {error && (
        <div
          className="admin-availability-manager-message is-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="admin-availability-manager-message is-success"
          role="status"
          aria-live="polite"
        >
          {success}
        </div>
      )}

      <div className="admin-availability-manager-layout">
        <div className="admin-availability-manager-main">
          <div
            id="availability-add"
            className="admin-availability-card"
          >
            <div className="admin-availability-card-header">
              <div>
                <span className="admin-availability-card-kicker">
                  {editingWindow
                    ? "EDIT WINDOW"
                    : "ADD AVAILABILITY"}
                </span>

                <h3>
                  {editingWindow
                    ? "Update availability"
                    : "Create an availability window"}
                </h3>
              </div>

              {editingWindow && (
                <button
                  type="button"
                  className="admin-availability-text-button"
                  onClick={
                    resetForm
                  }
                >
                  Cancel edit
                </button>
              )}
            </div>

            <div className="admin-availability-form-grid">
              <label>
                <span>Date</span>

                <input
                  type="date"
                  value={
                    formDate
                  }
                  min={
                    todayKey
                  }
                  onChange={(
                    event,
                  ) => {
                    setFormDate(
                      event.target
                        .value,
                    );

                    setCalendarMonth(
                      parseDateInput(
                        event.target
                          .value,
                      ),
                    );

                    setError("");
                    setSuccess("");
                  }}
                />
              </label>

              <label>
                <span>
                  Available from
                </span>

                <input
                  type="time"
                  value={
                    formStart
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormStart(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Available until
                </span>

                <input
                  type="time"
                  value={
                    formEnd
                  }
                  onChange={(
                    event,
                  ) =>
                    setFormEnd(
                      event.target
                        .value,
                    )
                  }
                />
              </label>
            </div>

            <div className="admin-availability-form-actions">
              <button
                type="button"
                className="admin-availability-primary-button"
                onClick={
                  addOrUpdateWindow
                }
                disabled={
                  saving
                }
              >
                {editingWindow
                  ? "Update availability"
                  : "Add availability"}
              </button>

              <span>
                One window can contain many customer
                appointments.
              </span>
            </div>
          </div>

          <div className="admin-availability-card admin-availability-repeat-card">
            <div className="admin-availability-card-header admin-availability-repeat-header">
              <div>
                <span className="admin-availability-card-kicker">
                  REPEAT WEEKLY
                </span>

                <h3>
                  Repeat the same hours each week
                </h3>

                <p>
                  Choose the days and working hours
                  for this date range. We will add one
                  availability window for each matching day.
                </p>
              </div>

              <label
                className="admin-availability-switch"
                aria-label="Turn weekly repeating schedule on or off"
              >
                <input
                  type="checkbox"
                  checked={
                    repeatEnabled
                  }
                  onChange={(
                    event,
                  ) =>
                    setRepeatEnabled(
                      event.target
                        .checked,
                    )
                  }
                />

                <span>
                  {repeatEnabled
                    ? "On"
                    : "Off"}
                </span>
              </label>
            </div>

            {repeatEnabled ? (
              <div className="admin-availability-repeat">
                <div className="admin-availability-repeat-flow">
                  <div className="admin-availability-repeat-step">
                    <span className="admin-availability-repeat-step-number">
                      1
                    </span>

                    <div>
                      <strong>
                        Choose the period
                      </strong>

                      <small>
                        Set the first and last date
                        for the repeating schedule.
                      </small>
                    </div>
                  </div>

                  <div className="admin-availability-repeat-date-grid">
                    <label>
                      <span>
                        Applies from
                      </span>

                      <input
                        type="date"
                        value={
                          repeatFrom
                        }
                        min={
                          todayKey
                        }
                        onChange={(
                          event,
                        ) =>
                          setRepeatFrom(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Through
                      </span>

                      <input
                        type="date"
                        value={
                          repeatUntil
                        }
                        min={
                          repeatFrom ||
                          todayKey
                        }
                        onChange={(
                          event,
                        ) =>
                          setRepeatUntil(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="admin-availability-repeat-flow">
                  <div className="admin-availability-repeat-step">
                    <span className="admin-availability-repeat-step-number">
                      2
                    </span>

                    <div>
                      <strong>
                        Choose the working days
                      </strong>

                      <small>
                        Select every weekday on which
                        this schedule should repeat.
                      </small>
                    </div>
                  </div>

                  <fieldset className="admin-availability-weekdays">
                    <legend className="sr-only">
                      Days of the week
                    </legend>

                    <div>
                      {WEEKDAYS.map(
                        (day) => {
                          const checked =
                            repeatDays.includes(
                              day.value,
                            );

                          return (
                            <label
                              key={
                                day.value
                              }
                              className={
                                checked
                                  ? "is-selected"
                                  : ""
                              }
                            >
                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  setRepeatDays(
                                    (
                                      current,
                                    ) =>
                                      checked
                                        ? current.filter(
                                            (item) =>
                                              item !==
                                              day.value,
                                          )
                                        : [
                                            ...current,
                                            day.value,
                                          ],
                                  )
                                }
                              />

                              <span>
                                {
                                  day.label
                                }
                              </span>
                            </label>
                          );
                        },
                      )}
                    </div>
                  </fieldset>
                </div>

                <div className="admin-availability-repeat-flow">
                  <div className="admin-availability-repeat-step">
                    <span className="admin-availability-repeat-step-number">
                      3
                    </span>

                    <div>
                      <strong>
                        Choose the working hours
                      </strong>

                      <small>
                        Customers will receive appointment
                        slots inside this window.
                      </small>
                    </div>
                  </div>

                  <div className="admin-availability-repeat-time-grid">
                    <label>
                      <span>
                        From
                      </span>

                      <input
                        type="time"
                        value={
                          repeatStart
                        }
                        onChange={(
                          event,
                        ) =>
                          setRepeatStart(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>

                    <span className="admin-availability-repeat-to">
                      to
                    </span>

                    <label>
                      <span>
                        Until
                      </span>

                      <input
                        type="time"
                        value={
                          repeatEnd
                        }
                        onChange={(
                          event,
                        ) =>
                          setRepeatEnd(
                            event.target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                <div
                  className="admin-availability-repeat-summary"
                  aria-live="polite"
                >
                  <strong>
                    Schedule preview
                  </strong>

                  {repeatPreviewDates.length >
                  0 ? (
                    <span>
                      {
                        repeatPreviewAddableCount
                      }{" "}
                      date
                      {repeatPreviewAddableCount ===
                      1
                        ? ""
                        : "s"}{" "}
                      will be added
                      {repeatPreviewConflicts >
                      0
                        ? ` · ${repeatPreviewConflicts} conflicting date${
                            repeatPreviewConflicts ===
                            1
                              ? ""
                              : "s"
                          } will be skipped`
                        : ""}
                      .
                    </span>
                  ) : (
                    <span>
                      Select at least one day and a valid
                      date range.
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-availability-primary-button admin-availability-repeat-apply"
                  onClick={
                    applyRepeatToDraft
                  }
                  disabled={
                    saving ||
                    repeatPreviewAddableCount ===
                      0
                  }
                >
                  Apply schedule to draft
                </button>

                <small className="admin-availability-repeat-note">
                  Draft only. Nothing is written to MongoDB until
                  you press Save Availability.
                </small>
              </div>
            ) : (
              <div className="admin-availability-repeat-off">
                <strong>
                  Weekly repeating is off.
                </strong>

                <span>
                  Turn it on when you want the same
                  hours to repeat across multiple weeks.
                </span>
              </div>
            )}
          </div>

          {dirty && (
            <div
              id="availability-draft-preview"
              className="admin-availability-card admin-availability-draft-card"
            >
              <div className="admin-availability-card-header">
                <div>
                  <span className="admin-availability-card-kicker">
                    UNSAVED DRAFT
                  </span>

                  <h3>
                    Changes waiting to be saved
                  </h3>
                </div>

                <span className="admin-availability-draft-badge">
                  Not live yet
                </span>
              </div>

              <div className="admin-availability-window-list">
                {selectedDateDraftWindows.length ===
                0 ? (
                  <div className="admin-availability-empty">
                    <strong>
                      No draft availability on{" "}
                      {formatDate(formDate)}.
                    </strong>

                    <span>
                      Your saved schedule has not changed
                      until you save.
                    </span>
                  </div>
                ) : (
                  selectedDateDraftWindows.map(
                    (window) => (
                      <div
                        key={`draft-${window.date}-${window.startTime}-${window.endTime}`}
                        className="admin-availability-window-row is-draft"
                      >
                        <div>
                          <strong>
                            {formatTime(
                              window.startTime,
                            )}{" "}
                            –{" "}
                            {formatTime(
                              window.endTime,
                            )}
                          </strong>

                          <span>
                            Draft ·{" "}
                            {formatDate(
                              window.date,
                            )}
                          </span>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="admin-availability-text-button"
                            onClick={() =>
                              editWindow(
                                window,
                              )
                            }
                            disabled={
                              saving
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="admin-availability-danger-button"
                            onClick={() =>
                              removeWindow(
                                window,
                              )
                            }
                            disabled={
                              saving
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>

              <p className="admin-availability-draft-help">
                The calendar overview and live saved schedule
                update only after you press{" "}
                <strong>
                  Save Availability
                </strong>
                .
              </p>
            </div>
          )}

          <div
            id="availability-saved"
            className="admin-availability-card"
          >
            <div className="admin-availability-card-header">
              <div>
                <span className="admin-availability-card-kicker">
                  SAVED SCHEDULE
                </span>

                <h3>
                  Availability windows
                </h3>
              </div>

              <button
                type="button"
                className="admin-availability-secondary-button"
                onClick={
                  clearDate
                }
                disabled={
                  saving ||
                  selectedDateWindows.length ===
                    0
                }
              >
                Clear selected date
              </button>
            </div>

            <div className="admin-availability-window-list">
              {loading ? (
                <div
                  className="admin-availability-loading-skeleton"
                  aria-busy="true"
                >
                  <span />
                  <span />
                  <span />
                </div>
              ) : selectedDateWindows.length ===
                0 ? (
                <div className="admin-availability-empty">
                  <strong>
                    No availability on{" "}
                    {formatDate(
                      formDate,
                    )}
                    .
                  </strong>

                  <span>
                    Add a window above to make this date
                    bookable.
                  </span>
                </div>
              ) : (
                selectedDateWindows.map(
                  (window) => (
                    <div
                      key={`${window.date}-${window.startTime}-${window.endTime}`}
                      className="admin-availability-window-row"
                    >
                      <div>
                        <strong>
                          {formatTime(
                            window.startTime,
                          )}{" "}
                          –{" "}
                          {formatTime(
                            window.endTime,
                          )}
                        </strong>

                        <span>
                          {formatDate(
                            window.date,
                          )}
                        </span>
                      </div>

                      <div>
                        <button
                          type="button"
                          className="admin-availability-text-button"
                          onClick={() =>
                            editWindow(
                              window,
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="admin-availability-danger-button"
                          onClick={() =>
                            removeWindow(
                              window,
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>

            <div className="admin-availability-save-row">
              <div>
                <strong>
                  {dirty
                    ? "Draft changes waiting to be saved"
                    : "All changes saved"}
                </strong>

                <span>
                  {dirty
                    ? "These changes are not live until you save."
                    : "Your live booking availability is up to date."}
                </span>
              </div>

              <button
                type="button"
                className="admin-availability-save-button"
                onClick={
                  save
                }
                disabled={
                  saving ||
                  !dirty
                }
              >
                {saving
                  ? "Saving…"
                  : "Save Availability"}
              </button>
            </div>
          </div>
        </div>

        <aside className="admin-availability-manager-side">
          <div className="admin-availability-card admin-availability-calendar-preview">
            <div className="admin-availability-card-header">
              <div>
                <span className="admin-availability-card-kicker">
                  SCHEDULE OVERVIEW
                </span>

                <h3>
                  {calendarMonth.toLocaleDateString(
                    "en-IN",
                    {
                      month:
                        "long",
                      year:
                        "numeric",
                    },
                  )}
                </h3>
              </div>

              <div className="admin-availability-calendar-nav">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() =>
                    setCalendarMonth(
                      (current) =>
                        new Date(
                          Date.UTC(
                            current.getUTCFullYear(),
                            current.getUTCMonth() - 1,
                            1,
                            12,
                          ),
                        ),
                    )
                  }
                >
                  ‹
                </button>

                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() =>
                    setCalendarMonth(
                      (current) =>
                        new Date(
                          Date.UTC(
                            current.getUTCFullYear(),
                            current.getUTCMonth() + 1,
                            1,
                            12,
                          ),
                        ),
                    )
                  }
                >
                  ›
                </button>
              </div>
            </div>

            <div
              className="admin-availability-calendar-grid"
              aria-label="Availability month overview"
            >
              {WEEKDAYS.map(
                (day) => (
                  <span
                    key={
                      day.value
                    }
                  >
                    {day.label.slice(
                      0,
                      2,
                    )}
                  </span>
                ),
              )}

              {monthDays.map(
                (day) => {
                  const key =
                    dateKey(
                      day,
                    );

                  const inMonth =
                    day.getUTCMonth() ===
                    calendarMonth.getUTCMonth() &&
                    day.getUTCFullYear() ===
                    calendarMonth.getUTCFullYear();

                  const hasAvailability =
                    windowsThisMonth.some(
                      (window) =>
                        window.date ===
                        key,
                    );

                  const booked =
                    bookedDates.has(
                      key,
                    );

                  const held =
                    heldDates.has(
                      key,
                    );

                  const selected =
                    key ===
                    formDate;

                  const isToday = key === todayKey;
                  const isPast = key < todayKey;

                  return (
                    <button
                      key={
                        key
                      }
                      type="button"
                      disabled={isPast}
                      className={`${inMonth ? "" : "is-outside"} ${
                        isPast
                          ? "is-past"
                          : ""
                      } ${
                        isToday
                          ? "is-today"
                          : ""
                      } ${
                        hasAvailability
                          ? "has-availability"
                          : ""
                      } ${
                        booked
                          ? "has-booking"
                          : ""
                      } ${
                        held
                          ? "has-hold"
                          : ""
                      } ${
                        selected
                          ? "is-selected"
                          : ""
                      }`}
                      onClick={() => {
                        if (isPast) {
                          return;
                        }

                        setFormDate(
                          key,
                        );

                        setCalendarMonth(
                          day,
                        );

                        resetForm();

                        scrollToSection(
                          "availability-day-overview",
                        );
                      }}
                      aria-label={`${formatDate(
                        key,
                      )}${
                        isToday
                          ? ", today"
                          : ""
                      }${
                        isPast
                          ? ", past date"
                          : ""
                      }${
                        hasAvailability
                          ? ", availability set"
                          : ", no availability"
                      }${
                        booked
                          ? ", has bookings"
                          : ""
                      }${
                        held
                          ? ", payment hold"
                          : ""
                      }`}
                    >
                      <strong className="admin-availability-calendar-day-number">
                        {day.getUTCDate()}
                      </strong>
                      {isToday && (
                        <small
                          className="admin-availability-calendar-today-label"
                          aria-hidden="true"
                        >
                          Today
                        </small>
                      )}
                      <span />
                    </button>
                  );
                },
              )}
            </div>

            <div className="admin-availability-calendar-legend">
              <span>
                <i className="is-available" />
                Available
              </span>

              <span>
                <i className="is-booked" />
                Booked
              </span>

              <span>
                <i className="is-held" />
                Hold
              </span>
            </div>
          </div>

          <div
            id="availability-day-overview"
            className="admin-availability-card admin-availability-day-summary"
          >
            <div>
              <span className="admin-availability-card-kicker">
                DAY OVERVIEW
              </span>

              <h3>
                {formatDate(
                  formDate,
                )}
              </h3>
            </div>

            <div className="admin-availability-summary-stat">
              <strong>
                {
                  selectedDateWindows.length
                }
              </strong>

              <span>
                availability window
                {selectedDateWindows.length ===
                1
                  ? ""
                  : "s"}
              </span>
            </div>

            {selectedDateBookings.length >
              0 && (
              <div className="admin-availability-activity-list">
                <strong>
                  Bookings
                </strong>

                {selectedDateBookings.map(
                  (booking) => (
                    <div
                      key={
                        booking.bookingId
                      }
                      className="admin-availability-activity is-booked"
                    >
                      <span>
                        {formatTime(
                          booking.startTime,
                        )}{" "}
                        –{" "}
                        {formatTime(
                          booking.endTime,
                        )}
                      </span>

                      <small>
                        {
                          booking.serviceName
                        }
                      </small>
                    </div>
                  ),
                )}
              </div>
            )}

            {selectedDateHolds.length >
              0 && (
              <div className="admin-availability-activity-list">
                <strong>
                  Payment holds
                </strong>

                {selectedDateHolds.map(
                  (hold) => (
                    <div
                      key={`${hold.bookingId}-${hold.startTime}`}
                      className="admin-availability-activity is-held"
                    >
                      <span>
                        {formatTime(
                          hold.startTime,
                        )}{" "}
                        –{" "}
                        {formatTime(
                          hold.endTime,
                        )}
                      </span>

                      <small>
                        {
                          hold.serviceName
                        }
                      </small>
                    </div>
                  ),
                )}
              </div>
            )}

            {selectedDateBookings.length ===
              0 &&
              selectedDateHolds.length ===
                0 && (
                <div className="admin-availability-empty compact">
                  <span>
                    No booked or held periods on this date.
                  </span>
                </div>
              )}
          </div>
        </aside>
      </div>
    </section>
  );
}
