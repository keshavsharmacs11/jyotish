import { NextRequest, NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";
import Consultant from "@/models/Consultant";
import Booking from "@/models/Booking";
import SlotHold from "@/models/SlotHold";
import Service from "@/models/Service";

const BLOCKING_STATUSES = [
  "paid",
  "confirmed",
  "consultant_assigned",
  "completed",
] as const;

function daysInMonth(year: number, month: number) {
  if (month === 2) {
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
      ? 29
      : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(5, 7));
  const day = Number(normalized.slice(8, 10));

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
  );
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }
  return hour * 60 + minute;
}

function toTime(minutes: number) {
  if (minutes >= 1440) {
    return "24:00";
  }

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

function getCurrentISTDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function getCurrentISTMinutes() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  const hour = Number(values.hour);
  const minute = Number(values.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function validateNotPastWindow(date: string, endTime: string) {
  const today = getCurrentISTDateKey();
  if (date < today) {
    return "Availability cannot be added for a past date.";
  }

  if (date === today) {
    const nowMinutes = getCurrentISTMinutes();
    const end = toMinutes(endTime);
    if (nowMinutes !== null && end !== null && end <= nowMinutes) {
      return "Today's availability must end in the future.";
    }
  }

  return null;
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return startA < endB && endA > startB;
}

function normalizeWindows(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item: any) => ({
      date: String(item?.date ?? "").trim(),
      startTime: String(item?.startTime ?? "").trim(),
      endTime: String(item?.endTime ?? "").trim(),
    }))
    .filter((item) => {
      const start = toMinutes(item.startTime);
      const end = toMinutes(item.endTime);

      return (
        isValidDate(item.date) &&
        isValidTime(item.startTime) &&
        isValidTime(item.endTime) &&
        start !== null &&
        end !== null &&
        end > start &&
        !validateNotPastWindow(item.date, item.endTime)
      );
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.startTime.localeCompare(b.startTime)
    );
}

function legacyToWindows(input: unknown) {
  const result: {
    date: string;
    startTime: string;
    endTime: string;
  }[] = [];

  if (!Array.isArray(input)) {
    return result;
  }

  for (const item of input as any[]) {
    const date = String(item?.date ?? "").trim();
    if (!isValidDate(date)) continue;

    const times: string[] = Array.from(
      new Set<string>(
        (Array.isArray(item?.times) ? item.times : [])
          .map((time: unknown) => String(time).trim())
          .filter(isValidTime)
      )
    ).sort();

    for (const time of times) {
      const start = toMinutes(time);
      if (start === null) continue;

      result.push({
        date,
        startTime: time,
        endTime: toTime(Math.min(start + 15, 1440)),
      });
    }
  }

  return result;
}

function windowsToLegacy(windows: { date: string; startTime: string; endTime: string }[]) {
  const grouped = new Map<string, Set<string>>();

  for (const window of windows) {
    const start = toMinutes(window.startTime);
    const end = toMinutes(window.endTime);
    if (start === null || end === null || end <= start) continue;

    const times = grouped.get(window.date) ?? new Set<string>();

    for (let cursor = start; cursor < end; cursor += 15) {
      times.add(toTime(cursor));
    }

    grouped.set(window.date, times);
  }

  return Array.from(grouped.entries())
    .map(([date, times]) => ({
      date,
      times: Array.from(times).sort(),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function loadConsultantCalendar(consultantId: string) {
  const consultant = await Consultant.findById(consultantId).lean();

  if (!consultant) {
    throw new Error("Consultant not found.");
  }

  const [bookings, holds, services] = await Promise.all([
    Booking.find({
      consultantId: consultant._id,
      paymentStatus: "paid",
      status: { $in: BLOCKING_STATUSES },
    })
      .select(
        "bookingId serviceId serviceName date time customer.fullName status paymentStatus"
      )
      .lean(),

    SlotHold.find({
      consultantId: consultant._id,
      expiresAt: { $gt: new Date() },
    })
      .select("bookingId date time expiresAt")
      .lean(),

    Service.find({ active: true })
      .select("serviceId name duration")
      .lean(),
  ]);

  const durationMap = new Map<string, number>();
  for (const service of services) {
    durationMap.set(
      String(service.serviceId),
      typeof service.duration === "number" && service.duration > 0
        ? service.duration
        : 30
    );
  }

  const holdBookingIds = holds.map((hold: any) => String(hold.bookingId));
  const holdBookings = holdBookingIds.length
    ? await Booking.find({ bookingId: { $in: holdBookingIds } })
        .select("bookingId serviceId serviceName customer.fullName")
        .lean()
    : [];

  const holdBookingMap = new Map<string, any>(
    holdBookings.map((booking: any) => [String(booking.bookingId), booking])
  );

  const bookingBlocks = bookings.map((booking: any) => {
    const start = toMinutes(String(booking.time)) ?? 0;
    const duration = durationMap.get(String(booking.serviceId)) ?? 30;

    return {
      bookingId: booking.bookingId,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      date: String(booking.date),
      startTime: String(booking.time),
      endTime: toTime(start + duration),
      duration,
      customerName: booking.customer?.fullName || "Customer",
      status: booking.status,
      paymentStatus: booking.paymentStatus,
    };
  });

  const holdBlocks = holds.map((hold: any) => {
    const booking = holdBookingMap.get(String(hold.bookingId));
    const start = toMinutes(String(hold.time)) ?? 0;
    const duration = booking
      ? durationMap.get(String(booking.serviceId)) ?? 30
      : 30;

    return {
      bookingId: hold.bookingId,
      date: String(hold.date),
      startTime: String(hold.time),
      endTime: toTime(start + duration),
      expiresAt: hold.expiresAt,
      serviceName: booking?.serviceName || "Payment hold",
      customerName: booking?.customer?.fullName || "Customer",
    };
  });

  const rawWindows =
    Array.isArray((consultant as any).availabilityWindows) &&
    (consultant as any).availabilityWindows.length > 0
      ? (consultant as any).availabilityWindows
      : legacyToWindows((consultant as any).availability ?? []);

  return {
    consultant,
    windows: normalizeWindows(rawWindows),
    bookingBlocks,
    holdBlocks,
    services,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    await connectMongoose();

    const consultantId =
      new URL(request.url).searchParams.get("consultantId")?.trim() || "";

    const consultants = await Consultant.find({})
      .select("_id name specialization active availability availabilityWindows")
      .sort({ active: -1, name: 1 })
      .lean();

    if (!consultantId) {
      return NextResponse.json({
        success: true,
        consultants: consultants.map((consultant: any) => ({
          id: consultant._id.toString(),
          name: consultant.name,
          active: consultant.active,
          availabilityWindows:
            Array.isArray(consultant.availabilityWindows) &&
            consultant.availabilityWindows.length > 0
              ? normalizeWindows(consultant.availabilityWindows)
              : legacyToWindows(consultant.availability ?? []),
        })),
        consultant: null,
        bookings: [],
        holds: [],
        services: [],
      });
    }

    const data = await loadConsultantCalendar(consultantId);

    return NextResponse.json({
      success: true,
      consultants: consultants.map((consultant: any) => ({
        id: consultant._id.toString(),
        name: consultant.name,
        active: consultant.active,
      })),
      consultant: {
        id: data.consultant._id.toString(),
        name: data.consultant.name,
        specialization: data.consultant.specialization,
        active: data.consultant.active,
        availabilityWindows: data.windows,
      },
      bookings: data.bookingBlocks,
      holds: data.holdBlocks,
      services: data.services.map((service: any) => ({
        serviceId: service.serviceId,
        name: service.name,
        duration: service.duration,
      })),
    });
  } catch (error) {
    console.error(
      "ADMIN AVAILABILITY CALENDAR ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load consultant availability calendar.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    await connectMongoose();

    const body = await request.json();
    const consultantId = String(body?.consultantId ?? "").trim();

    if (!consultantId) {
      return NextResponse.json(
        {
          success: false,
          error: "Consultant ID is required.",
        },
        { status: 400 }
      );
    }

    const consultant = await Consultant.findById(consultantId);
    if (!consultant) {
      return NextResponse.json(
        {
          success: false,
          error: "Consultant not found.",
        },
        { status: 404 }
      );
    }

    if (!Array.isArray(body?.availabilityWindows)) {
      return NextResponse.json(
        {
          success: false,
          error: "Availability windows are required.",
        },
        { status: 400 }
      );
    }

    const sourceWindows = body.availabilityWindows as any[];

    const invalidPastWindow = sourceWindows.find((item) => {
      const date = String(item?.date ?? "").trim();
      const endTime = String(item?.endTime ?? "").trim();
      if (!isValidDate(date) || !isValidTime(endTime)) return false;
      return Boolean(validateNotPastWindow(date, endTime));
    });

    if (invalidPastWindow) {
      const date = String(invalidPastWindow?.date ?? "").trim();
      const reason = validateNotPastWindow(
        date,
        String(invalidPastWindow?.endTime ?? "").trim(),
      );
      return NextResponse.json(
        {
          success: false,
          error: reason || "Availability date is no longer valid.",
        },
        { status: 400 },
      );
    }

    const windows = normalizeWindows(sourceWindows);

    if (windows.length !== sourceWindows.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more availability windows is invalid. Please use valid dates and a start time before the end time.",
        },
        { status: 400 }
      );
    }

    const [bookings, holds, services] = await Promise.all([
      Booking.find({
        consultantId: consultant._id,
        paymentStatus: "paid",
        status: { $in: BLOCKING_STATUSES },
      })
        .select("bookingId serviceId serviceName date time")
        .lean(),

      SlotHold.find({
        consultantId: consultant._id,
        expiresAt: { $gt: new Date() },
      })
        .select("bookingId date time")
        .lean(),

      Service.find({ active: true })
        .select("serviceId duration")
        .lean(),
    ]);

    const durationMap = new Map<string, number>();
    for (const service of services) {
      durationMap.set(
        String(service.serviceId),
        typeof service.duration === "number" && service.duration > 0
          ? service.duration
          : 30
      );
    }

    const holdBookingIds = holds.map((hold: any) => String(hold.bookingId));
    const holdBookings = holdBookingIds.length
      ? await Booking.find({ bookingId: { $in: holdBookingIds } })
          .select("bookingId serviceId")
          .lean()
      : [];

    const holdServiceMap = new Map<string, string>(
      holdBookings.map((booking: any) => [
        String(booking.bookingId),
        String(booking.serviceId),
      ])
    );

    const occupied: {
      date: string;
      start: number;
      end: number;
      kind: "booking" | "hold";
      label: string;
    }[] = [];

    for (const booking of bookings as any[]) {
      const start = toMinutes(String(booking.time));
      if (start === null) continue;

      occupied.push({
        date: String(booking.date),
        start,
        end:
          start +
          (durationMap.get(String(booking.serviceId)) ?? 30),
        kind: "booking",
        label: booking.serviceName || "Booking",
      });
    }

    for (const hold of holds as any[]) {
      const start = toMinutes(String(hold.time));
      if (start === null) continue;

      occupied.push({
        date: String(hold.date),
        start,
        end:
          start +
          (durationMap.get(
            holdServiceMap.get(String(hold.bookingId)) || ""
          ) ?? 30),
        kind: "hold",
        label: "Payment hold",
      });
    }

    /*
     * An availability window itself cannot overlap an existing
     * booking/hold. The customer booking engine later handles
     * service-specific subdivision inside the saved window.
     */
    for (const window of windows) {
      const start = toMinutes(window.startTime)!;
      const end = toMinutes(window.endTime)!;

      for (const item of occupied) {
        if (item.date !== window.date) continue;

        if (
          overlaps(
            start,
            end,
            item.start,
            item.end
          )
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                `${window.date} ${window.startTime}–${window.endTime} overlaps an existing ${item.kind}. Please keep booked/held periods outside the availability window.`,
            },
            { status: 409 }
          );
        }
      }
    }

    consultant.availabilityWindows = windows;
    consultant.availability = windowsToLegacy(windows);

    await consultant.save();

    return NextResponse.json({
      success: true,
      message:
        "Consultant availability saved successfully.",
      consultant: {
        id: consultant._id.toString(),
        name: consultant.name,
        availabilityWindows: windows,
        availability: consultant.availability,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN AVAILABILITY CALENDAR SAVE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save consultant availability.",
      },
      { status: 500 }
    );
  }
}