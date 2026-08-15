import { NextResponse } from "next/server";

import clientPromise from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
    } = body;

    /*
     * ============================================
     * VALIDATION
     * ============================================
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
        { status: 400 }
      );
    }

    /*
     * ============================================
     * DATABASE CONNECTION
     * ============================================
     */

    const client =
      await clientPromise;

    await client
      .db("codepunkdb")
      .command({ ping: 1 });

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
            "Booking not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================
     * SECURITY CHECK
     * ============================================
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
        { status: 400 }
      );
    }

    /*
     * ============================================
     * FIND PAYMENT
     * ============================================
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
        { status: 404 }
      );
    }

    /*
     * ============================================
     * DON'T MODIFY A SUCCESSFUL PAYMENT
     * ============================================
     *
     * A late failure notification must never
     * overwrite an already successful payment.
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
     * ============================================
     * UPDATE PAYMENT
     * ============================================
     */

    payment.status =
      "failed";

    if (razorpayPaymentId) {
      payment.razorpayPaymentId =
        razorpayPaymentId;
    }

    await payment.save();

    /*
     * ============================================
     * UPDATE BOOKING
     * ============================================
     */

    booking.paymentStatus =
      "failed";

    booking.status =
      "payment_pending";

    if (razorpayPaymentId) {
      booking.razorpayPaymentId =
        razorpayPaymentId;
    }

    await booking.save();

    /*
     * ============================================
     * RESPONSE
     * ============================================
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
  } catch (error) {
    console.error(
      "Failed payment update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update failed payment.",
      },
      { status: 500 }
    );
  }
}