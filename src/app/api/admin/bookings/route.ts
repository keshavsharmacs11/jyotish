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
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      count:
        bookings.length,

      bookings,
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
 * This endpoint supports:
 *
 * 1. Consultant assignment
 *
 * 2. Booking status update
 *
 * IMPORTANT:
 *
 * Paid bookings cannot be cancelled through
 * this endpoint.
 *
 * Paid booking cancellation must go through:
 *
 * /api/admin/bookings/refund
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

    /*
     * At least one update operation
     * must be supplied.
     */

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
     * PAID BOOKING CANCELLATION SAFETY
     * ============================================
     *
     * A paid booking must NOT be cancelled
     * through the normal status endpoint.
     *
     * It must go through the dedicated
     * Cancel & Refund endpoint so that the
     * customer's payment is handled correctly.
     */

    if (
      newStatus === "cancelled" &&
      booking.paymentStatus === "paid"
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
     *
     * Only run this section when
     * consultantId was supplied.
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
       *
       * IMPORTANT:
       *
       * Only do this when the admin did NOT
       * explicitly request another status in
       * the same request.
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
       *
       * A booking cannot become confirmed,
       * consultant_assigned or completed
       * unless payment has been received.
       *
       * Cancellation of an unpaid booking
       * remains allowed.
       *
       * Paid cancellation was already blocked
       * above and must use the refund endpoint.
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
       *
       * consultant_assigned and completed
       * require a consultant.
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
       *
       * A cancelled booking cannot be
       * completed.
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
            ? booking.consultantId.toString()
            : null,

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

        customer:
          booking.customer,

        razorpayOrderId:
          booking.razorpayOrderId,

        razorpayPaymentId:
          booking.razorpayPaymentId,

        createdAt:
          booking.createdAt,

        updatedAt:
          booking.updatedAt,
      },
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