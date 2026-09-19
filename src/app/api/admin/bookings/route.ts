import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  connectMongoose,
} from "@/lib/mongodb";

import {
  requireAdmin,
} from "@/lib/adminAuth";

import Booking from "@/models/Booking";
import Consultant from "@/models/Consultant";
import Payment from "@/models/Payment";

/*
 * ============================================
 * TYPES
 * ============================================
 */

const allowedStatuses = [
  "payment_pending",
  "paid",
  "confirmed",
  "consultant_assigned",
  "completed",
  "cancelled",
] as const;

type BookingStatus =
  (typeof allowedStatuses)[number];

/*
 * ============================================
 * SERIALIZE BOOKING
 * ============================================
 *
 * Refund information is stored in Payment.
 *
 * IMPORTANT:
 *
 * A payment whose status is "refunded", or a booking whose
 * paymentStatus is "refunded", is always exposed to the
 * frontend as refundStatus = "processed".
 *
 * This makes the persisted database state authoritative.
 */

function serializeBooking(
  booking: any,
  payment?: any
) {
  const refundStatus =
    payment?.status === "refunded" ||
    booking.paymentStatus === "refunded"
      ? "processed"
      : payment?.refundStatus || null;

  const paymentStatus =
    payment?.status || null;

  return {
    _id: booking._id
      ? booking._id.toString()
      : undefined,

    bookingId:
      booking.bookingId,

    userId:
      booking.userId
        ? booking.userId.toString()
        : null,

    serviceId:
      booking.serviceId,

    serviceName:
      booking.serviceName,

    category:
      booking.category,

    mode:
      booking.mode,

    date:
      booking.date,

    time:
      booking.time,

    consultantId:
      booking.consultantId
        ? booking.consultantId.toString()
        : null,

    consultantName:
      booking.consultantName || "",

    customer:
      booking.customer || {},

    price:
      booking.price,

    currency:
      booking.currency,

    status:
      booking.status,

    paymentStatus:
      booking.paymentStatus,

    refundReason:
      booking.refundReason || "",

    razorpayOrderId:
      booking.razorpayOrderId || "",

    razorpayPaymentId:
      booking.razorpayPaymentId || "",

    /*
     * ========================================
     * REFUND INFORMATION
     * ========================================
     */

    refundStatus,

    razorpayRefundId:
      payment?.razorpayRefundId || null,

    paymentRefundReason:
      payment?.refundReason || "",

    paymentStatusFromPayment:
      paymentStatus,

    createdAt:
      booking.createdAt,

    updatedAt:
      booking.updatedAt,
  };
}

/*
 * ============================================
 * GET BOOKINGS
 * ============================================
 */

export async function GET(
  request: NextRequest
) {
  /*
   * ============================================
   * ADMIN AUTHENTICATION
   * ============================================
   */

  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * QUERY PARAMETERS
     * ============================================
     */

    const {
      searchParams,
    } = new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const paymentStatus =
      searchParams
        .get("paymentStatus")
        ?.trim() || "";

    /*
     * ============================================
     * BUILD QUERY
     * ============================================
     */

    const query: Record<
      string,
      any
    > = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus =
        paymentStatus;
    }

    /*
     * ============================================
     * SEARCH
     * ============================================
     */

    if (search) {
      query.$or = [
        {
          bookingId: {
            $regex: search,
            $options: "i",
          },
        },

        {
          "customer.fullName": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "customer.email": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "customer.mobile": {
            $regex: search,
            $options: "i",
          },
        },

        {
          serviceName: {
            $regex: search,
            $options: "i",
          },
        },

        {
          razorpayOrderId: {
            $regex: search,
            $options: "i",
          },
        },

        {
          razorpayPaymentId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    /*
     * ============================================
     * FETCH BOOKINGS
     * ============================================
     */

    const bookings =
      await Booking.find(query)
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * ============================================
     * FETCH PAYMENTS
     * ============================================
     */

    const bookingIds =
      bookings.map(
        (booking: any) =>
          booking._id
      );

    const payments =
      bookingIds.length > 0
        ? await Payment.find({
            bookingId: {
              $in: bookingIds,
            },
          }).lean()
        : [];

    /*
     * ============================================
     * CREATE PAYMENT MAP
     * ============================================
     */

    const paymentMap =
      new Map<
        string,
        any
      >();

    for (
      const payment of payments
    ) {
      if (
        payment.bookingId
      ) {
        paymentMap.set(
          payment.bookingId.toString(),
          payment
        );
      }
    }

    /*
     * ============================================
     * COMBINE BOOKING + PAYMENT DATA
     * ============================================
     */

    const serializedBookings =
      bookings.map(
        (booking: any) => {
          const payment =
            paymentMap.get(
              booking._id.toString()
            );

          return serializeBooking(
            booking,
            payment
          );
        }
      );

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      count:
        serializedBookings.length,

      bookings:
        serializedBookings,
    });
  } catch (error) {
    console.error(
      "ADMIN BOOKINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch bookings.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * ============================================
 * PATCH BOOKING
 * ============================================
 *
 * Supports:
 *
 * 1. Consultant assignment
 * 2. Booking status update
 *
 * Paid bookings cannot be cancelled here.
 * They must use /api/admin/bookings/refund.
 */

export async function PATCH(
  request: NextRequest
) {
  /*
   * ============================================
   * ADMIN AUTHENTICATION
   * ============================================
   */

  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * ============================================
     * READ REQUEST BODY
     * ============================================
     */

    const body =
      await request.json();

    const bookingId =
      String(
        body.bookingId || ""
      ).trim();

    const consultantId =
      body.consultantId
        ? String(
            body.consultantId
          ).trim()
        : "";

    const requestedStatus =
      body.status
        ? String(
            body.status
          ).trim()
        : "";

    /*
     * ============================================
     * BASIC VALIDATION
     * ============================================
     */

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Booking ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !consultantId &&
      !requestedStatus
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Consultant ID or booking status is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================
     * STATUS VALIDATION
     * ============================================
     */

    let newStatus:
      BookingStatus | null =
      null;

    if (requestedStatus) {
      if (
        !allowedStatuses.includes(
          requestedStatus as BookingStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Invalid booking status.",
          },
          {
            status: 400,
          }
        );
      }

      newStatus =
        requestedStatus as BookingStatus;
    }

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * FIND BOOKING
     * ============================================
     */

    const booking =
      await Booking.findOne({
        bookingId,
      });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Booking could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ============================================
     * FIND PAYMENT
     * ============================================
     */

    const payment =
      await Payment.findOne({
        bookingId:
          booking._id,
      }).lean();

    /*
     * ============================================
     * REFUND STATE SAFETY
     * ============================================
     */

    const refundStatus =
      payment?.status === "refunded" ||
      payment?.refundStatus === "processed" ||
      booking.paymentStatus === "refunded"
        ? "processed"
        : payment?.refundStatus || null;

    if (
      newStatus &&
      refundStatus === "pending"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This booking has a refund request currently being processed. Wait for Razorpay confirmation before changing its status.",

          refundPending: true,
        },
        {
          status: 409,
        }
      );
    }

    if (
      newStatus &&
      refundStatus === "processed"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This booking has already been refunded and cannot have its booking status changed through this endpoint.",

          alreadyRefunded: true,
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ============================================
     * PAID BOOKING CANCELLATION SAFETY
     * ============================================
     */

    if (
      newStatus ===
        "cancelled" &&
      booking.paymentStatus ===
        "paid"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "This booking has already been paid. Use the Cancel & Refund action instead of cancelling it directly.",

          requiresRefund: true,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================
     * CONSULTANT ASSIGNMENT
     * ============================================
     */

    if (consultantId) {
      /*
       * ==========================================
       * FIND CONSULTANT
       * ==========================================
       */

      const consultant =
        await Consultant.findById(
          consultantId
        );

      if (!consultant) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Consultant could not be found.",
          },
          {
            status: 404,
          }
        );
      }

      /*
       * ==========================================
       * CHECK ACTIVE
       * ==========================================
       */

      if (!consultant.active) {
        return NextResponse.json(
          {
            success: false,

            error:
              "This consultant is not active.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * CHECK MODE
       * ==========================================
       */

      if (
        !consultant.availableModes.includes(
          booking.mode
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              `This consultant does not support ${booking.mode} consultation.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * CHECK DATE
       * ==========================================
       */

      const dateAvailability =
        consultant.availability?.find(
          (item: any) =>
            item.date ===
            booking.date
        );

      if (!dateAvailability) {
        return NextResponse.json(
          {
            success: false,

            error:
              "This consultant is not available on the selected booking date.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * CHECK TIME
       * ==========================================
       */

      const hasTime =
        dateAvailability.times?.includes(
          booking.time
        );

      if (!hasTime) {
        return NextResponse.json(
          {
            success: false,

            error:
              "This consultant is not available at the selected booking time.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * ASSIGN CONSULTANT
       * ==========================================
       */

      booking.consultantId =
        consultant._id;

      booking.consultantName =
        consultant.name;

      /*
       * If the booking is already paid,
       * assigning a consultant automatically
       * moves it into consultant_assigned.
       */

      if (
        !newStatus &&
        booking.paymentStatus ===
          "paid"
      ) {
        booking.status =
          "consultant_assigned";
      }
    }

    /*
     * ============================================
     * STATUS UPDATE
     * ============================================
     */

    if (newStatus) {
      /*
       * ==========================================
       * PAYMENT SAFETY
       * ==========================================
       */

      const requiresPayment =
        newStatus ===
          "confirmed" ||
        newStatus ===
          "consultant_assigned" ||
        newStatus ===
          "completed";

      if (
        requiresPayment &&
        booking.paymentStatus !==
          "paid"
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "A booking must be paid before it can be confirmed, assigned or completed.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * CONSULTANT ASSIGNMENT SAFETY
       * ==========================================
       */

      if (
        (
          newStatus ===
            "consultant_assigned" ||
          newStatus ===
            "completed"
        ) &&
        !booking.consultantId
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "A consultant must be assigned before this booking can be marked as consultant assigned or completed.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * COMPLETION SAFETY
       * ==========================================
       */

      if (
        booking.status ===
          "cancelled" &&
        newStatus ===
          "completed"
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "A cancelled booking cannot be marked as completed.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * ==========================================
       * UPDATE STATUS
       * ==========================================
       */

      booking.status =
        newStatus;
    }

    /*
     * ============================================
     * SAVE
     * ============================================
     */

    await booking.save();

    /*
     * ============================================
     * REFRESH PAYMENT INFORMATION
     * ============================================
     */

    const updatedPayment =
      await Payment.findOne({
        bookingId:
          booking._id,
      }).lean();

    /*
     * ============================================
     * SUCCESS RESPONSE
     * ============================================
     */

    const actionMessage =
      newStatus
        ? "Booking status updated successfully."
        : "Consultant assigned successfully.";

    return NextResponse.json({
      success: true,

      message:
        actionMessage,

      booking:
        serializeBooking(
          booking,
          updatedPayment
        ),
    });
  } catch (error) {
    console.error(
      "ADMIN BOOKING PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to update booking.",
      },
      {
        status: 500,
      }
    );
  }
}