import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  connectMongoose,
} from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

import {
  releaseSlotHold,
} from "@/lib/slotHold";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ==========================================
     * RATE LIMIT
     * ==========================================
     */

    const clientIp =
      getClientIp(request);

    const rateLimit =
      await checkRateLimit({
        key:
          `payment-failed-ip:${clientIp}`,
        limit: 20,
        windowMs:
          15 * 60 * 1000,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many payment requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                rateLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    /*
     * ==========================================
     * READ REQUEST
     * ==========================================
     */

    const body =
      await request.json();

    const bookingId =
      typeof body.bookingId ===
      "string"
        ? body.bookingId.trim()
        : "";

    const razorpayOrderId =
      typeof body.razorpayOrderId ===
      "string"
        ? body.razorpayOrderId.trim()
        : "";

    const razorpayPaymentId =
      typeof body.razorpayPaymentId ===
      "string"
        ? body.razorpayPaymentId.trim()
        : "";

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (
      !bookingId ||
      !razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing payment failure details.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      bookingId.length > 200 ||
      razorpayOrderId.length > 200 ||
      razorpayPaymentId.length > 200
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment failure request.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * DATABASE
     * ==========================================
     */

    await connectMongoose();

    /*
     * ==========================================
     * FIND BOOKING
     * ==========================================
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
            "Booking not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * ORDER ↔ BOOKING
     * ==========================================
     */

    if (
      booking.razorpayOrderId !==
      razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay order does not match booking.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * FIND PAYMENT
     * ==========================================
     */

    const payment =
      await Payment.findOne({
        razorpayOrderId,
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment record not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT ↔ BOOKING
     * ==========================================
     */

    if (
      payment.bookingId.toString() !==
      booking._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment does not belong to this booking.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * SUCCESSFUL PAYMENT IS IMMUTABLE HERE
     * ==========================================
     */

    if (
      payment.status === "paid" ||
      booking.paymentStatus === "paid"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment is already marked as paid.",
      });
    }

    /*
     * ==========================================
     * PREVENT DOWNGRADING A STRONGER STATE
     * ==========================================
     */

    if (
      booking.status ===
        "completed" ||
      booking.status ===
        "consultant_assigned"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This booking is already in a completed processing state.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT ID CONSISTENCY
     * ==========================================
     */

    if (
      payment.razorpayPaymentId &&
      razorpayPaymentId &&
      payment.razorpayPaymentId !==
        razorpayPaymentId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment ID does not match the existing payment record.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * UPDATE PAYMENT
     * ==========================================
     */

    payment.status =
      "failed";

    if (
      razorpayPaymentId
    ) {
      payment.razorpayPaymentId =
        razorpayPaymentId;
    }

    await payment.save();

    /*
     * ==========================================
     * UPDATE BOOKING
     * ==========================================
     */

    booking.paymentStatus =
      "failed";

    booking.status =
      "payment_pending";

    if (
      razorpayPaymentId
    ) {
      booking.razorpayPaymentId =
        razorpayPaymentId;
    }

    await booking.save();

    /*
     * ==========================================
     * RELEASE TEMPORARY SLOT HOLD
     * ==========================================
     */

    if (
      booking.consultantId
    ) {
      await releaseSlotHold({
        consultantId:
          booking.consultantId,

        date:
          booking.date,

        time:
          booking.time,

        bookingId:
          booking.bookingId,
      });
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Failed payment recorded.",

      bookingId:
        booking.bookingId,

      paymentStatus:
        booking.paymentStatus,

      bookingStatus:
        booking.status,
    });
  } catch {
    /*
     * Never expose or log:
     * - payment IDs
     * - order IDs
     * - customer data
     * - request body
     */

    console.error(
      "FAILED PAYMENT UPDATE"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update failed payment.",
      },
      {
        status: 500,
      }
    );
  }
}