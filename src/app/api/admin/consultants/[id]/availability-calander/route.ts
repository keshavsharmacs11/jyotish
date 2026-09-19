import {
  NextRequest,
  NextResponse,
} from "next/server";

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

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeDate(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function normalizeTime(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function daysInMonth(year: number, month: number) {
  if (month === 2) {
    return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0)
      ? 29
      : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidDate(
  value: string
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

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

function isValidTime(
  value: string
) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function toMinutes(
  time: string
) {
  const [
    hour,
    minute,
  ] = time
    .split(":")
    .map(Number);

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

function validateNotPastWindow(
  date: string,
  startTime: string,
  endTime: string,
) {
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

function addMinutes(
  time: string,
  duration: number
) {
  const start =
    toMinutes(time);

  if (
    start === null
  ) {
    return time;
  }

  const total =
    start +
    Math.max(
      1,
      duration
    );

  /*
   * Keep the result inside the normal
   * 24-hour clock representation.
   */

  const hour =
    Math.floor(
      total / 60
    ) % 24;

  const minute =
    total % 60;

  return `${String(
    hour
  ).padStart(
    2,
    "0"
  )}:${String(
    minute
  ).padStart(
    2,
    "0"
  )}`;
}

/*
 * =========================================================
 * NORMALIZE AVAILABILITY
 * =========================================================
 *
 * Current compatibility structure:
 *
 * [
 *   {
 *     date: "2026-09-02",
 *     times: ["09:00", "10:00", ...]
 *   }
 * ]
 *
 * This route still returns this structure for compatibility
 * with the parts of the current system that use it.
 */

type LegacyAvailability = {
  date: string;
  times: string[];
};

type AvailabilityWindow = {
  date: string;
  startTime: string;
  endTime: string;
};

function normalizeAvailability(
  value: unknown
): LegacyAvailability[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item: any
      ) => {
        const date =
          normalizeDate(
            item?.date
          );

        if (
          !isValidDate(
            date
          )
        ) {
          return null;
        }

        // Never accept legacy availability for dates already in the past.
        if (date < getCurrentISTDateKey()) {
          return null;
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
                .map(
                  normalizeTime
                )
                .filter(
                  isValidTime
                )
            )
          ).sort();

        if (
          times.length ===
          0
        ) {
          return null;
        }

        return {
          date,
          times,
        };
      }
    )
    .filter(
      (
        item
      ): item is LegacyAvailability =>
        item !== null
    )
    .sort(
      (
        a: any,
        b: any
      ) =>
        a.date.localeCompare(
          b.date
        )
    );
}

/*
 * =========================================================
 * GET — ADMIN AVAILABILITY CALENDAR
 * =========================================================
 */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const auth =
    await requireAdmin(
      request
    );

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    /*
     * -----------------------------------------
     * CONSULTANT ID
     * -----------------------------------------
     */

    const {
      id,
    } =
      await context.params;

    const consultantId =
      String(
        id ?? ""
      ).trim();

    if (
      !consultantId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Consultant ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -----------------------------------------
     * CONSULTANT
     * -----------------------------------------
     */

    const consultant =
      await Consultant.findById(
        consultantId
      )
        .select(
          "_id name specialization availableModes availability active availabilityWindows"
        )
        .lean();

    if (
      !consultant
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Consultant not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * -----------------------------------------
     * LOAD BOOKINGS / HOLDS / SERVICES
     * -----------------------------------------
     */

    const [
      bookings,
      holds,
      services,
    ] =
      await Promise.all([
        Booking.find({
          consultantId:
            consultant._id,

          paymentStatus:
            "paid",

          status: {
            $in:
              BLOCKING_STATUSES,
          },
        })
          .select(
            "bookingId consultantId serviceId serviceName date time mode customer.fullName price status paymentStatus"
          )
          .sort({
            date: 1,
            time: 1,
          })
          .lean(),

        SlotHold.find({
          consultantId:
            consultant._id,

          expiresAt: {
            $gt:
              new Date(),
          },
        })
          .select(
            "bookingId consultantId date time expiresAt"
          )
          .sort({
            date: 1,
            time: 1,
          })
          .lean(),

        Service.find({
          active: true,
        })
          .select(
            "serviceId name duration"
          )
          .lean(),
      ]);

    /*
     * -----------------------------------------
     * SERVICE DURATION MAP
     * -----------------------------------------
     */

    const serviceMap =
      new Map<
        string,
        number
      >();

    for (
      const service of
        services
    ) {
      if (
        typeof service.duration ===
          "number" &&
        service.duration >
          0
      ) {
        serviceMap.set(
          String(
            service.serviceId
          ),
          service.duration
        );
      }
    }

    /*
     * -----------------------------------------
     * SERIALIZE CONSULTANT
     * -----------------------------------------
     */

    const serializedConsultant =
      {
        id:
          consultant._id.toString(),

        name:
          consultant.name,

        specialization:
          consultant.specialization,

        availableModes:
          consultant.availableModes,

        active:
          consultant.active,

        /*
         * Legacy compatibility
         */
        availability:
          (
            consultant.availability ??
            []
          ).map(
            (
              item: any
            ) => ({
              date:
                normalizeDate(
                  item?.date
                ),

              times:
                Array.from(
                  new Set(
                    (
                      Array.isArray(
                        item?.times
                      )
                        ? item.times
                        : []
                    )
                      .map(
                        normalizeTime
                      )
                      .filter(
                        isValidTime
                      )
                  )
                ).sort(),
            })
          ),

        /*
         * New source of truth when available.
         */
        availabilityWindows:
          (
            consultant.availabilityWindows ??
            []
          ).map(
            (
              item: any
            ) => ({
              date:
                normalizeDate(
                  item?.date
                ),

              startTime:
                normalizeTime(
                  item?.startTime
                ),

              endTime:
                normalizeTime(
                  item?.endTime
                ),
            })
          )
          .filter(
            (
              item: any
            ) =>
              isValidDate(
                item.date
              ) &&
              isValidTime(
                item.startTime
              ) &&
              isValidTime(
                item.endTime
              )
          ),
      };

    /*
     * -----------------------------------------
     * SERIALIZE BOOKINGS
     * -----------------------------------------
     */

    const serializedBookings =
      bookings.map(
        (
          booking: any
        ) => {
          const time =
            normalizeTime(
              booking.time
            );

          const duration =
            serviceMap.get(
              String(
                booking.serviceId
              )
            ) ?? 30;

          return {
            bookingId:
              booking.bookingId,

            consultantId:
              booking.consultantId?.toString() ||
              "",

            serviceId:
              booking.serviceId,

            serviceName:
              booking.serviceName,

            customerName:
              booking.customer
                ?.fullName ||
              "Customer",

            date:
              normalizeDate(
                booking.date
              ),

            time,

            endTime:
              addMinutes(
                time,
                duration
              ),

            duration,

            mode:
              booking.mode,

            price:
              booking.price,

            status:
              booking.status,

            paymentStatus:
              booking.paymentStatus,
          };
        }
      );

    /*
     * -----------------------------------------
     * SERIALIZE HOLDS
     * -----------------------------------------
     */

    const serializedHolds =
      holds.map(
        (
          hold: any
        ) => ({
          bookingId:
            hold.bookingId,

          consultantId:
            hold.consultantId?.toString() ||
            "",

          date:
            normalizeDate(
              hold.date
            ),

          time:
            normalizeTime(
              hold.time
            ),

          expiresAt:
            hold.expiresAt,
        })
      );

    /*
     * -----------------------------------------
     * SUCCESS
     * -----------------------------------------
     */

    return NextResponse.json({
      success: true,

      consultants: [
        serializedConsultant,
      ],

      bookings:
        serializedBookings,

      holds:
        serializedHolds,

      services:
        services.map(
          (
            service: any
          ) => ({
            serviceId:
              service.serviceId,

            name:
              service.name,

            duration:
              service.duration,
          })
        ),
    });
  } catch (
    error
  ) {
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
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * PUT — SAVE ADMIN AVAILABILITY
 * =========================================================
 *
 * IMPORTANT:
 *
 * Availability is the consultant's general availability.
 *
 * An existing booking or SlotHold INSIDE that availability
 * must NOT cause the availability save to fail.
 *
 * Example:
 *
 * Availability:
 * 09:00 AM → 05:00 PM
 *
 * Existing booking:
 * 02:00 PM → 02:15 PM
 *
 * This is VALID.
 *
 * The booking/availability engine will later remove the
 * occupied interval from customer-visible appointment options.
 */

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const auth =
    await requireAdmin(
      request
    );

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    /*
     * -----------------------------------------
     * CONSULTANT ID
     * -----------------------------------------
     */

    const {
      id,
    } =
      await context.params;

    const consultantId =
      String(
        id ?? ""
      ).trim();

    if (
      !consultantId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Consultant ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * -----------------------------------------
     * REQUEST BODY
     * -----------------------------------------
     */

    const body =
      await request.json();

    /*
     * -----------------------------------------
     * FIND CONSULTANT
     * -----------------------------------------
     */

    const consultant =
      await Consultant.findById(
        consultantId
      );

    if (
      !consultant
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Consultant not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * -----------------------------------------
     * LEGACY AVAILABILITY
     * -----------------------------------------
     *
     * Keep accepting the existing structure so
     * older code does not suddenly stop working.
     */

    if (Array.isArray(body?.availability)) {
      const invalidPastLegacy = body.availability.find((item: any) => {
        const date = normalizeDate(item?.date);
        return isValidDate(date) && date < getCurrentISTDateKey();
      });

      if (invalidPastLegacy) {
        return NextResponse.json(
          {
            success: false,
            error: "Availability cannot be added for a past date.",
          },
          { status: 400 },
        );
      }
    }

    const requestedAvailability =
      normalizeAvailability(
        body?.availability
      );

    /*
     * -----------------------------------------
     * NEW AVAILABILITY WINDOWS
     * -----------------------------------------
     *
     * Expected:
     *
     * [
     *   {
     *     date: "2026-08-27",
     *     startTime: "09:00",
     *     endTime: "17:00"
     *   }
     * ]
     */

    const rawAvailabilityWindows = Array.isArray(
      body?.availabilityWindows
    )
      ? body.availabilityWindows
      : null;

    if (rawAvailabilityWindows) {
      for (const item of rawAvailabilityWindows) {
        const date = normalizeDate(item?.date);
        const startTime = normalizeTime(item?.startTime);
        const endTime = normalizeTime(item?.endTime);

        if (
          !isValidDate(date) ||
          !isValidTime(startTime) ||
          !isValidTime(endTime)
        ) {
          return NextResponse.json(
            {
              success: false,
              error: "One or more availability windows contains an invalid calendar date or time.",
            },
            { status: 400 },
          );
        }

        const pastWindowError = validateNotPastWindow(
          date,
          startTime,
          endTime,
        );

        if (pastWindowError) {
          return NextResponse.json(
            {
              success: false,
              error: pastWindowError,
            },
            { status: 400 },
          );
        }
      }
    }

    const requestedWindows: AvailabilityWindow[] =
      rawAvailabilityWindows
        ? rawAvailabilityWindows
            .map(
              (
                item: any
              ) => {
                const date =
                  normalizeDate(
                    item?.date
                  );

                const startTime =
                  normalizeTime(
                    item?.startTime
                  );

                const endTime =
                  normalizeTime(
                    item?.endTime
                  );

                if (
                  !isValidDate(
                    date
                  ) ||
                  !isValidTime(
                    startTime
                  ) ||
                  !isValidTime(
                    endTime
                  )
                ) {
                  return null;
                }

                const pastWindowError = validateNotPastWindow(
                  date,
                  startTime,
                  endTime,
                );

                if (pastWindowError) {
                  return null;
                }

                const start =
                  toMinutes(
                    startTime
                  );

                const end =
                  toMinutes(
                    endTime
                  );

                /*
                 * Same-day availability window.
                 * End must be later than start.
                 */

                if (
                  start === null ||
                  end === null ||
                  end <= start
                ) {
                  return null;
                }

                return {
                  date,
                  startTime,
                  endTime,
                };
              }
            )
            .filter(
              (
                item: AvailabilityWindow | null
              ): item is AvailabilityWindow =>
                item !== null
            )
            .sort(
              (
                a: any,
                b: any
              ) => {
                const dateCompare =
                  a.date.localeCompare(
                    b.date
                  );

                if (
                  dateCompare !==
                  0
                ) {
                  return dateCompare;
                }

                return (
                  toMinutes(
                    a.startTime
                  )! -
                  toMinutes(
                    b.startTime
                  )!
                );
              }
            )
        : [];

    /*
     * -----------------------------------------
     * SAVE WINDOWS
     * -----------------------------------------
     *
     * Existing bookings and holds DO NOT block
     * saving a consultant availability window.
     *
     * They remain separate booking-state data.
     */

    if (
      Array.isArray(
        body?.availabilityWindows
      )
    ) {
      consultant.availabilityWindows =
        requestedWindows;
    }

    /*
     * -----------------------------------------
     * LEGACY COMPATIBILITY SNAPSHOT
     * -----------------------------------------
     *
     * If the calendar still sends legacy
     * availability, preserve it.
     *
     * New calendar implementations can send only
     * availabilityWindows and the old availability
     * field will not be destroyed.
     */

    if (
      Array.isArray(
        body?.availability
      )
    ) {
      consultant.availability =
        requestedAvailability;
    }

    await consultant.save();

    /*
     * -----------------------------------------
     * RESPONSE
     * -----------------------------------------
     */

    return NextResponse.json({
      success: true,

      message:
        "Consultant availability saved successfully.",

      consultant: {
        id:
          consultant._id.toString(),

        name:
          consultant.name,

        availability:
          (
            consultant.availability ??
            []
          ).map(
            (
              item: any
            ) => ({
              date:
                normalizeDate(
                  item?.date
                ),

              times:
                Array.from(
                  new Set(
                    item?.times ??
                      []
                  )
                ).sort(),
            })
          ),

        availabilityWindows:
          (
            consultant.availabilityWindows ??
            []
          ).map(
            (
              item: any
            ) => ({
              date:
                normalizeDate(
                  item?.date
                ),

              startTime:
                normalizeTime(
                  item?.startTime
                ),

              endTime:
                normalizeTime(
                  item?.endTime
                ),
            })
          ),
      },
    });
  } catch (
    error
  ) {
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
      {
        status: 500,
      }
    );
  }
}