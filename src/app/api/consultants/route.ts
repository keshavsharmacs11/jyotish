import { NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Consultant from "@/models/Consultant";
import Booking from "@/models/Booking";
import SlotHold from "@/models/SlotHold";
import Service from "@/models/Service";

import {
  isSlotInFutureIST,
} from "@/lib/bookingTime";

function daysInMonth(year: number, month: number) {
  if (month === 2) {
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
      ? 29
      : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
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

function isFutureOrTodayDate(value: string) {
  return isValidDateKey(value) && value >= getCurrentISTDateKey();
}

function toMinutes(
  time: string
) {
  const [
    hour,
    minute,
  ] =
    time.split(":").map(Number);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  return (
    hour * 60 +
    minute
  );
}

function toTime(
  minutes: number
) {
  if (minutes >= 1440) {
    return "24:00";
  }

  return `${String(
    Math.floor(minutes / 60)
  ).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;
}

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number
) {
  return (
    startA < endB &&
    endA > startB
  );
}

function normalizeWindows(
  input: unknown
) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item: any) => ({
      date:
        String(
          item?.date ?? ""
        ).trim(),

      startTime:
        String(
          item?.startTime ?? ""
        ).trim(),

      endTime:
        String(
          item?.endTime ?? ""
        ).trim(),
    }))
    .filter((item) => {
      const start =
        toMinutes(
          item.startTime
        );

      const end =
        toMinutes(
          item.endTime
        );

      return (
        isFutureOrTodayDate(item.date) &&
        start !== null &&
        end !== null &&
        end > start
      );
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(
          b.date
        ) ||
        a.startTime.localeCompare(
          b.startTime
        )
    );
}

function legacyToWindows(
  availability: any[]
) {
  const result: {
    date: string;
    startTime: string;
    endTime: string;
  }[] = [];

  for (
    const item of Array.isArray(
      availability
    )
      ? availability
      : []
  ) {
    const date =
      String(
        item?.date ?? ""
      ).trim();

    if (!isFutureOrTodayDate(date)) {
      continue;
    }

    const times =
      Array.from(
        new Set(
          (
            Array.isArray(
              item?.times
            )
              ? item.times
              : []
          )
            .map((time: unknown) =>
              String(time).trim()
            )
            .filter(
              (time) =>
                /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
                  time
                )
            )
        )
      ).sort();

    for (
      const time of times
    ) {
      const start =
        toMinutes(time);

      if (
        start === null
      ) {
        continue;
      }

      result.push({
        date,
        startTime: time,
        endTime: toTime(
          Math.min(
            start + 15,
            1440
          )
        ),
      });
    }
  }

  return result;
}

export async function GET() {
  try {
    await connectMongoose();

    const consultants =
      await Consultant.find({
        active: true,
      })
        .select(
          "_id name photo specialization availableModes availability availabilityWindows active"
        )
        .sort({
          name: 1,
        })
        .lean();

    console.log(
      "PUBLIC CONSULTANTS DB CHECK:",
      consultants.map((consultant: any) => ({
        id: consultant._id?.toString(),
        name: consultant.name,
        active: consultant.active,
        availabilityCount: Array.isArray(
          consultant.availability
        )
          ? consultant.availability.length
          : 0,
        availabilityWindowsCount:
          Array.isArray(
            consultant.availabilityWindows
          )
            ? consultant.availabilityWindows.length
            : 0,
      }))
    );

    if (
      consultants.length ===
      0
    ) {
      return NextResponse.json({
        success: true,
        count: 0,
        consultants: [],
      });
    }

    const consultantIds =
      consultants.map(
        (consultant) =>
          consultant._id
      );

    const [
      paidBookings,
      activeSlotHolds,
      services,
    ] = await Promise.all([
      Booking.find({
        consultantId: {
          $in: consultantIds,
        },
        paymentStatus:
          "paid",
      })
        .select(
          "bookingId consultantId date time serviceId"
        )
        .lean(),

      SlotHold.find({
        consultantId: {
          $in: consultantIds,
        },
        expiresAt: {
          $gt: new Date(),
        },
      })
        .select(
          "bookingId consultantId date time expiresAt"
        )
        .lean(),

      Service.find({
        active: true,
      })
        .select(
          "serviceId duration"
        )
        .lean(),
    ]);

    const durationMap =
      new Map<
        string,
        number
      >();

    for (
      const service of services
    ) {
      durationMap.set(
        String(
          service.serviceId
        ),
        typeof service.duration ===
          "number" &&
        service.duration > 0
          ? service.duration
          : 30
      );
    }

    const holdBookingIds =
      activeSlotHolds.map(
        (hold: any) =>
          String(
            hold.bookingId
          )
      );

    const holdBookings =
      holdBookingIds.length > 0
        ? await Booking.find({
            bookingId: {
              $in:
                holdBookingIds,
            },
          })
            .select(
              "bookingId serviceId"
            )
            .lean()
        : [];

    const holdServiceIds =
      new Map<
        string,
        string
      >(
        holdBookings.map(
          (booking: any) => [
            String(
              booking.bookingId
            ),
            String(
              booking.serviceId
            ),
          ]
        )
      );

    const blockedByConsultant =
      new Map<
        string,
        {
          date: string;
          startTime: string;
          endTime: string;
        }[]
      >();

    function addBlocked(
      consultantId: string,
      date: string,
      time: string,
      duration: number
    ) {
      const start =
        toMinutes(time);

      if (
        start === null
      ) {
        return;
      }

      const list =
        blockedByConsultant.get(
          consultantId
        ) ?? [];

      list.push({
        date,
        startTime: time,
        endTime: toTime(
          start +
            Math.max(
              1,
              duration
            )
        ),
      });

      blockedByConsultant.set(
        consultantId,
        list
      );
    }

    for (
      const booking of
        paidBookings
    ) {
      if (
        !booking.consultantId ||
        !booking.date ||
        !booking.time
      ) {
        continue;
      }

      addBlocked(
        booking.consultantId.toString(),
        String(
          booking.date
        ),
        String(
          booking.time
        ),
        durationMap.get(
          String(
            booking.serviceId
          )
        ) ?? 30
      );
    }

    for (
      const hold of
        activeSlotHolds
    ) {
      if (
        !hold.consultantId ||
        !hold.date ||
        !hold.time
      ) {
        continue;
      }

      addBlocked(
        hold.consultantId.toString(),
        String(
          hold.date
        ),
        String(
          hold.time
        ),
        durationMap.get(
          holdServiceIds.get(
            String(
              hold.bookingId
            )
          ) ?? ""
        ) ?? 30
      );
    }

    const unavailableSlots =
      new Set<string>();

    for (
      const booking of
        paidBookings
    ) {
      if (
        !booking.consultantId ||
        !booking.date ||
        !booking.time
      ) {
        continue;
      }

      unavailableSlots.add(
        `${booking.consultantId.toString()}|${String(
          booking.date
        )}|${String(
          booking.time
        )}`
      );
    }

    for (
      const hold of
        activeSlotHolds
    ) {
      if (
        !hold.consultantId ||
        !hold.date ||
        !hold.time
      ) {
        continue;
      }

      unavailableSlots.add(
        `${hold.consultantId.toString()}|${String(
          hold.date
        )}|${String(
          hold.time
        )}`
      );
    }

    const consultantsWithAvailability =
      consultants.map(
        (consultant) => {
          const consultantId =
            consultant._id.toString();

          const filteredAvailability =
            (
              consultant.availability ??
              []
            )
              .map(
                (item: any) => {
                  if (
                    !item?.date ||
                    !Array.isArray(
                      item.times
                    )
                  ) {
                    return null;
                  }

                  const normalizedDate =
                    String(
                      item.date
                    ).trim();

                  const remainingTimes =
                    item.times.filter(
                      (
                        time: unknown
                      ) => {
                        const normalizedTime =
                          String(
                            time
                          ).trim();

                        if (
                          !isSlotInFutureIST(
                            normalizedDate,
                            normalizedTime
                          )
                        ) {
                          return false;
                        }

                        const key =
                          `${consultantId}|${normalizedDate}|${normalizedTime}`;

                        return !unavailableSlots.has(
                          key
                        );
                      }
                    );

                  if (
                    remainingTimes.length ===
                    0
                  ) {
                    return null;
                  }

                  return {
                    date:
                      normalizedDate,
                    times:
                      remainingTimes,
                  };
                }
              )
              .filter(
                Boolean
              );

          /*
           * Prefer the newer availabilityWindows representation, but do not
           * let an existing stale/invalid availabilityWindows array hide valid
           * legacy availability. This is important during the transition
           * between the two availability formats.
           */
          const normalizedAvailabilityWindows =
            normalizeWindows(
              (consultant as any)?.availabilityWindows
            );

          const rawWindows =
            normalizedAvailabilityWindows.length > 0
              ? normalizedAvailabilityWindows
              : legacyToWindows(
                  filteredAvailability
                );

          /*
           * Keep windows intact except for windows that
           * are already completely in the past. The customer
           * page will generate service-specific starts and
           * remove starts overlapping blocked intervals.
           */

          const futureWindows =
            rawWindows.filter(
              (window) =>
                isSlotInFutureIST(
                  window.date,
                  window.startTime
                ) ||
                isSlotInFutureIST(
                  window.date,
                  window.endTime ===
                    "24:00"
                    ? "23:59"
                    : window.endTime
                )
            );

          return {
            ...consultant,

            availability:
              filteredAvailability,

            availabilityWindows:
              futureWindows,

            blockedIntervals:
              blockedByConsultant.get(
                consultantId
              ) ?? [],
          };
        }
      );

    return NextResponse.json({
      success: true,
      count:
        consultantsWithAvailability.length,
      consultants:
        consultantsWithAvailability,
    });
  } catch (error) {
    console.error(
      "PUBLIC CONSULTANTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load consultants.",
      },
      { status: 500 }
    );
  }
}