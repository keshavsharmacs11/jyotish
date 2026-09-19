import {
  NextRequest,
  NextResponse,
} from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";

import clientPromise from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Service from "@/models/Service";
import Consultant from "@/models/Consultant";
import SlotHold from "@/models/SlotHold";
import { getCustomerId } from "@/lib/customerAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";

/*
 * ============================================================
 * CUSTOMER DATA VALIDATION
 * ============================================================
 *
 * Frontend validation improves UX, but the API must validate
 * the same critical customer fields because requests can be
 * sent directly without using the browser UI.
 */

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const INDIAN_MOBILE_PATTERN =
  /^[6-9]\d{9}$/;

function isValidString(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function isValidName(
  value: unknown
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  const normalized =
    value.trim();

  return (
    normalized.length >= 2 &&
    normalized.length <= 100 &&
    /^[A-Za-zÀ-ÖØ-öø-ÿ.' -]+$/.test(
      normalized
    )
  );
}

function isValidEmail(
  value: unknown
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  const normalized =
    value.trim().toLowerCase();

  return (
    normalized.length <= 254 &&
    EMAIL_PATTERN.test(
      normalized
    )
  );
}

function isValidIndianMobile(
  value: unknown
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return INDIAN_MOBILE_PATTERN.test(
    value.trim()
  );
}

function isValidDateString(
  value: unknown
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    value.trim()
  );
}

function isValidTimeString(
  value: unknown
): value is string {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
    value.trim()
  );
}


import {
  acquireSlotHold,
  releaseSlotHold,
} from "@/lib/slotHold";

function toMinutes(
  time: string
) {
  const [hour, minute] =
    time.split(":").map(
      Number
    );

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

function legacyAvailabilityToWindows(
  availability: any[]
) {
  return (
    Array.isArray(
      availability
    )
      ? availability
      : []
  ).flatMap((item: any) =>
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
        (time: string) =>
          /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(
            time
          )
      )
      .map((time: string) => {
        const start =
          toMinutes(time);

        return {
          date: String(
            item.date
          ),
          startTime: time,
          endTime:
            start === null
              ? time
              : `${String(
                  Math.floor(
                    Math.min(
                      start + 15,
                      1440
                    ) / 60
                  )
                ).padStart(
                  2,
                  "0"
                )}:${String(
                  Math.min(
                    start + 15,
                    1440
                  ) % 60
                ).padStart(
                  2,
                  "0"
                )}`,
        };
      })
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ============================================
     * PUBLIC BOOKING ABUSE PROTECTION
     * ============================================
     *
     * Booking creation is an unauthenticated endpoint
     * for guests and performs multiple database queries
     * plus an atomic slot hold. Limit both oversized
     * requests and repeated requests before doing that work.
     */

    const contentLength = request.headers.get(
      "content-length"
    );

    const MAX_BODY_BYTES = 32 * 1024;

    if (
      contentLength &&
      Number.isFinite(Number(contentLength)) &&
      Number(contentLength) > MAX_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Request payload is too large.",
        },
        { status: 413 }
      );
    }

    const clientIp = getClientIp(request);

    const ipLimit = await checkRateLimit({
      key: `booking-create-ip:${clientIp}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many booking requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              ipLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    const body = await request.json();

    const {
      serviceId,
      mode,
      consultantId,
      date,
      time,
      customer,
      policyConsent,
    } = body;

    /*
     * ============================================
     * BASIC VALIDATION
     * ============================================
     */

    if (
      !serviceId ||
      !mode ||
      !consultantId ||
      !date ||
      !time ||
      !customer
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service, consultation mode, consultant, date, time and customer information are required.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * CUSTOMER VALIDATION
     * ============================================
     *
     * Keep this validation server-side even when
     * the frontend already validates the form.
     */

    if (
      !customer ||
      typeof customer !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer information is invalid.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidName(
        customer.fullName
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid full name.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidIndianMobile(
        customer.mobile
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid 10-digit Indian mobile number.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidEmail(
        customer.email
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    /*
     * Normalize values once. This preserves the
     * existing booking flow while ensuring that
     * persisted customer data has a consistent form.
     */

    const normalizedCustomer = {
      ...customer,

      fullName:
        customer.fullName.trim(),

      mobile:
        customer.mobile.trim(),

      email:
        customer.email
          .trim()
          .toLowerCase(),
    };

    /*
     * Never trust a customer/user ID supplied by the browser.
     * When a customer is signed in, derive the owner from the
     * server-side session. Guests remain unlinked.
     */
    const authenticatedCustomerId =
      await getCustomerId();

    /*
     * ============================================
     * REQUIRED POLICY CONSENT
     * ============================================
     *
     * Server-authoritative. The client checkbox
     * must not be trusted on its own.
     */

    const POLICY_VERSION =
      "2026-08-21";

    if (
      !policyConsent ||
      policyConsent.agreed !== true ||
      policyConsent.version !==
        POLICY_VERSION
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must accept the Terms & Conditions, Privacy Policy, and Cancellation & Refund Policy before booking.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * DATE / TIME FORMAT VALIDATION
     * ============================================
     *
     * The existing availability checks still
     * remain authoritative below. This only
     * rejects malformed input early.
     */

    if (
      !isValidDateString(
        date
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid consultation date.",
        },
        { status: 400 }
      );
    }

    if (
      !isValidTimeString(
        time
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid consultation time.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * DATABASE CONNECTION
     * ============================================
     */

    const client = await clientPromise;

    const db = client.db();

    await db.command({
      ping: 1,
    });

    /*
     * ============================================
     * FIND SERVICE
     * ============================================
     */

    const service =
      await Service.findOne({
        serviceId: String(serviceId),
        active: true,
      }).lean();

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected service is not available.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================
     * CHECK CONSULTATION MODE
     * ============================================
     */

    if (
      !service.availableModes.includes(
        mode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected consultation mode is not available for this service.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * VALIDATE CONSULTANT ID
     * ============================================
     */

    if (
      !mongoose.Types.ObjectId.isValid(
        String(consultantId)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid consultant.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * FIND CONSULTANT
     * ============================================
     */

    const consultant =
      await Consultant.findOne({
        _id: consultantId,
        active: true,
      }).lean();

    if (!consultant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected consultant is not available.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================
     * CHECK CONSULTANT MODE
     * ============================================
     */

    if (
      !consultant.availableModes.includes(
        mode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected consultation mode is not available for this consultant.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * CHECK SERVICE â†’ CONSULTANT RELATIONSHIP
     * ============================================
     *
     * If the service has consultantIds configured,
     * the selected consultant must belong to that list.
     *
     * If consultantIds is empty, all active
     * consultants are allowed.
     */

    const configuredConsultants =
      Array.isArray(
        service.consultantIds
      )
        ? service.consultantIds
        : [];

    if (
      configuredConsultants.length > 0 &&
      !configuredConsultants.includes(
        String(consultant._id)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected consultant is not available for this service.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * CHECK SERVICE-SPECIFIC AVAILABILITY
     * ============================================
     *
     * Consultant availability is now stored as
     * windows. The selected service duration determines
     * the requested appointment interval.
     *
     * Legacy date/time availability is supported as
     * a backward-compatible fallback.
     */

    const duration =
      typeof service.duration ===
        "number" &&
      service.duration > 0
        ? service.duration
        : 30;

    const selectedStart =
      toMinutes(
        String(time)
      );

    if (
      selectedStart === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid consultation time.",
        },
        { status: 400 }
      );
    }

    const selectedEnd =
      selectedStart +
      duration;

    const windows =
      Array.isArray(
        (consultant as any)
          .availabilityWindows
      ) &&
      (
        consultant as any
      ).availabilityWindows
        .length > 0
        ? (
            consultant as any
          ).availabilityWindows
        : legacyAvailabilityToWindows(
            (consultant as any)
              .availability ??
              []
          );

    const matchingWindow =
      windows.find(
        (window: any) => {
          if (
            String(
              window.date
            ) !==
            String(date)
          ) {
            return false;
          }

          const start =
            toMinutes(
              String(
                window.startTime
              )
            );

          const end =
            toMinutes(
              String(
                window.endTime
              )
            );

          if (
            start === null ||
            end === null
          ) {
            return false;
          }

          return (
            selectedStart >=
              start &&
            selectedEnd <=
              end
          );
        }
      );

    if (
      !matchingWindow
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected appointment time is outside the consultant's available window.",
        },
        { status: 400 }
      );
    }

    /*
     * Existing paid bookings and temporary holds must
     * not overlap the requested service interval.
     */

    const [
      existingBookings,
      activeHolds,
    ] = await Promise.all([
      Booking.find({
        consultantId:
          consultant._id,

        paymentStatus:
          "paid",

        status: {
          $in: [
            "paid",
            "confirmed",
            "consultant_assigned",
            "completed",
          ],
        },
      })
        .select(
          "bookingId serviceId date time"
        )
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
          "bookingId date time"
        )
        .lean(),
    ]);

    const blockedBookingIds =
      activeHolds.map(
        (hold: any) =>
          String(
            hold.bookingId
          )
      );

    const holdBookings =
      blockedBookingIds.length
        ? await Booking.find({
            bookingId: {
              $in:
                blockedBookingIds,
            },
          })
            .select(
              "bookingId serviceId"
            )
            .lean()
        : [];

    const holdServiceMap =
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

    const occupiedIntervals: {
      start: number;
      end: number;
    }[] = [];

    for (
      const booking of
        existingBookings
    ) {
      if (
        String(
          booking.date
        ) !== String(date)
      ) {
        continue;
      }

      const start =
        toMinutes(
          String(
            booking.time
          )
        );

      if (
        start === null
      ) {
        continue;
      }

      const bookingService =
        await Service.findOne({
          serviceId:
            String(
              booking.serviceId
            ),
          active: true,
        })
          .select(
            "duration"
          )
          .lean();

      const bookingDuration =
        bookingService &&
        typeof bookingService.duration ===
          "number" &&
        bookingService.duration >
          0
          ? bookingService.duration
          : 30;

      occupiedIntervals.push({
        start,
        end:
          start +
          bookingDuration,
      });
    }

    /*
     * Resolve all active hold durations in one pass.
     */
    const holdServiceDocs =
      holdServiceMap.size > 0
        ? await Service.find({
            serviceId: {
              $in:
                Array.from(
                  holdServiceMap.values()
                ),
            },
            active: true,
          })
            .select(
              "serviceId duration"
            )
            .lean()
        : [];

    const holdDurationMap =
      new Map<
        string,
        number
      >(
        holdServiceDocs.map(
          (serviceDoc: any) => [
            String(
              serviceDoc.serviceId
            ),
            typeof serviceDoc.duration ===
                "number" &&
              serviceDoc.duration >
                0
              ? serviceDoc.duration
              : 30,
          ]
        )
      );

    for (
      const hold of
        activeHolds
    ) {
      if (
        String(
          hold.date
        ) !== String(date)
      ) {
        continue;
      }

      const start =
        toMinutes(
          String(
            hold.time
          )
        );

      if (
        start === null
      ) {
        continue;
      }

      const holdDuration =
        holdDurationMap.get(
          holdServiceMap.get(
            String(
              hold.bookingId
            )
          ) ?? ""
        ) ?? 30;

      occupiedIntervals.push({
        start,
        end:
          start +
          holdDuration,
      });
    }

    const conflicting =
      occupiedIntervals.some(
        (interval) =>
          overlaps(
            selectedStart,
            selectedEnd,
            interval.start,
            interval.end
          )
      );

    if (
      conflicting
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected appointment time overlaps another booking or an active payment hold. Please choose another time.",
        },
        { status: 409 }
      );
    }

    /*
     * ============================================
     * CATEGORY-SPECIFIC CUSTOMER VALIDATION
     * ============================================
     */

    if (
      service.category ===
      "astrology"
    ) {
      if (
        !isValidDateString(
          customer.dob
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A valid date of birth is required for astrology.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidTimeString(
          customer.birthTime
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A valid birth time is required for astrology.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidString(
          customer.birthPlace,
          150
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Place of birth is required for astrology.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidString(
          customer.language,
          50
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Preferred language is required.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidString(
          customer.concern,
          2000
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your main concern or question is required.",
          },
          { status: 400 }
        );
      }
    }

    if (
      service.category ===
      "numerology"
    ) {
      if (
        !isValidDateString(
          customer.dob
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A valid date of birth is required for numerology.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidName(
          customer.currentName
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "A valid current name spelling is required.",
          },
          { status: 400 }
        );
      }

      if (
        !isValidString(
          customer.concern,
          2000
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your specific requirement is required.",
          },
          { status: 400 }
        );
      }
    }

    if (
      service.category ===
      "tarot"
    ) {
      if (
        !isValidString(
          customer.tarotQuestion,
          2000
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your tarot question is required.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * ============================================
     * GENERATE BOOKING ID
     * ============================================
     */

    const year =
      new Date().getFullYear();

    let bookingId = "";

    for (
      let attempt = 0;
      attempt < 5;
      attempt++
    ) {
      const randomNumber =
        crypto.randomInt(
          100000,
          1000000
        );

      const candidate =
        `AKJ-${year}-${randomNumber}`;

      const existingBooking =
        await Booking.exists({
          bookingId: candidate,
        });

      if (!existingBooking) {
        bookingId = candidate;
        break;
      }
    }

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to generate a unique booking ID.",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================
     * ACQUIRE TEMPORARY SLOT HOLD
     * ============================================
     *
     * The slot is temporarily reserved before
     * the booking/payment process continues.
     *
     * This prevents two customers from starting
     * payment for the same consultant/date/time
     * simultaneously.
     */

    const slotHold =
      await acquireSlotHold({
        bookingId,

        consultantId:
          consultant._id,

        date:
          String(date),

        time:
          String(time),
      });

    if (!slotHold.success) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This consultation slot is currently being booked by another customer. Please choose another time.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ============================================
     * CREATE BOOKING
     * ============================================
     *
     * If booking creation fails, release the
     * temporary slot hold so the slot does not
     * remain blocked unnecessarily.
     */

    let booking;

    try {
      booking =
        await Booking.create({
          bookingId,

          userId:
            authenticatedCustomerId || null,

          serviceId:
            service.serviceId,

          serviceName:
            service.name,

          category:
            service.category,

          mode,

          date,

          time,

          /*
           * IMPORTANT:
           *
           * Consultant is now selected by
           * the customer and verified by
           * the server.
           */

          consultantId:
            consultant._id,

          consultantName:
            consultant.name,

          /*
           * CUSTOMER
           */

          customer: {
            fullName:
              normalizedCustomer.fullName,

            dob:
              normalizedCustomer.dob || "",

            birthTime:
              normalizedCustomer.birthTime || "",

            birthPlace:
              normalizedCustomer.birthPlace || "",

            gender:
              normalizedCustomer.gender || "",

            mobile:
              normalizedCustomer.mobile,

            email:
              normalizedCustomer.email,

            concern:
              normalizedCustomer.concern || "",

            language:
              normalizedCustomer.language || "",

            currentName:
              normalizedCustomer.currentName || "",

            person2Name:
              normalizedCustomer.person2Name || "",

            person2Dob:
              normalizedCustomer.person2Dob || "",

            person2BirthTime:
              normalizedCustomer.person2BirthTime ||
              "",

            person2BirthPlace:
              normalizedCustomer.person2BirthPlace ||
              "",

            tarotQuestion:
              normalizedCustomer.tarotQuestion || "",
          },

          /*
           * ============================================
           * POLICY CONSENT SNAPSHOT
           * ============================================
           */

          policyConsent: {
            agreed: true,

            agreedAt:
              policyConsent.agreedAt
                ? new Date(
                    policyConsent.agreedAt
                  )
                : new Date(),

            version:
              POLICY_VERSION,
          },

          /*
           * PRICE SNAPSHOT
           */

          price:
            service.price,

          currency:
            service.currency || "INR",

          status:
            "payment_pending",

          paymentStatus:
            "pending",
        });
    } catch (error) {
      /*
       * ==========================================
       * RELEASE HOLD IF BOOKING CREATION FAILS
       * ==========================================
       */

      await releaseSlotHold({
        consultantId:
          consultant._id,

        date:
          String(date),

        time:
          String(time),

        bookingId,
      });

      throw error;
    }

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Booking created successfully.",

        booking: {
          id:
            booking._id.toString(),

          bookingId:
            booking.bookingId,

          serviceId:
            booking.serviceId,

          serviceName:
            booking.serviceName,

          category:
            booking.category,

          mode:
            booking.mode,

          consultantId:
            booking.consultantId
              ?.toString(),

          consultantName:
            booking.consultantName,

          date:
            booking.date,

          time:
            booking.time,

          price:
            booking.price,

          currency:
            booking.currency,

          status:
            booking.status,

          paymentStatus:
            booking.paymentStatus,

          createdAt:
            booking.createdAt,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "BOOKING CREATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create booking.",
      },
      {
        status: 500,
      }
    );
  }
}