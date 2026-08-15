import { NextResponse } from "next/server";
import crypto from "crypto";

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = body;

    /*
     * ============================================
     * VALIDATION
     * ============================================
     */

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !bookingId
    ) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Missing payment verification details.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * RAZORPAY SECRET
     * ============================================
     */

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error(
        "RAZORPAY_KEY_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Payment verification is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    const client =
      await clientPromise;

    await client
      .db("codepunkdb")
      .command({
        ping: 1,
      });

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
          verified: false,
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
      razorpay_order_id
    ) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Razorpay order does not match the booking.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * SIGNATURE VERIFICATION
     * ============================================
     */

    const bodyToSign =
      `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          keySecret
        )
        .update(bodyToSign)
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

    const receivedBuffer =
      Buffer.from(
        razorpay_signature,
        "hex"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Invalid payment signature.",
        },
        { status: 400 }
      );
    }

    const isValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!isValid) {
      console.error(
        "Razorpay signature verification failed."
      );

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Payment signature verification failed.",
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
        razorpayOrderId:
          razorpay_order_id,
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Payment record not found.",
        },
        { status: 404 }
      );
    }

    /*
     * ============================================
     * IDEMPOTENCY
     * ============================================
     */

    if (
      payment.status === "paid" &&
      booking.paymentStatus === "paid"
    ) {
      return NextResponse.json({
        success: true,
        verified: true,

        paymentId:
          payment.razorpayPaymentId,

        orderId:
          payment.razorpayOrderId,

        bookingId:
          booking.bookingId,

        message:
          "Payment was already verified.",
      });
    }

    /*
     * ============================================
     * CLAIM CONSULTANT SLOT
     * ============================================
     *
     * The unique MongoDB partial index protects
     * this operation from two customers paying
     * for the same consultant/date/time.
     */

    try {
      booking.razorpayPaymentId =
        razorpay_payment_id;

      booking.paymentStatus =
        "paid";

      booking.status =
        "confirmed";

      await booking.save();
    } catch (error: any) {
      /*
       * MongoDB duplicate-key error.
       *
       * This means another paid booking already
       * owns this consultant/date/time slot.
       */

      if (
        error?.code === 11000
      ) {
        console.error(
          "CONSULTANT SLOT ALREADY BOOKED:",
          {
            bookingId:
              booking.bookingId,

            consultantId:
              booking.consultantId
                ?.toString(),

            date:
              booking.date,

            time:
              booking.time,
          }
        );

        return NextResponse.json(
          {
            success: false,
            verified: false,

            error:
              "This consultation slot has just been booked by another customer. Your payment could not be attached to this booking. Please contact support for payment resolution.",
          },
          {
            status: 409,
          }
        );
      }

      throw error;
    }

    /*
     * ============================================
     * UPDATE PAYMENT
     * ============================================
     */

    payment.razorpayPaymentId =
      razorpay_payment_id;

    payment.status =
      "paid";

    await payment.save();

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    console.log(
      "Payment verified and booking updated:",
      {
        bookingId:
          booking.bookingId,

        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,
      }
    );

    return NextResponse.json({
      success: true,

      verified: true,

      paymentId:
        razorpay_payment_id,

      orderId:
        razorpay_order_id,

      bookingId:
        booking.bookingId,

      bookingStatus:
        booking.status,

      paymentStatus:
        booking.paymentStatus,
    });
  } catch (error) {
    console.error(
      "Razorpay payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        verified: false,
        error:
          "Unable to verify Razorpay payment.",
      },
      {
        status: 500,
      }
    );
  }
}