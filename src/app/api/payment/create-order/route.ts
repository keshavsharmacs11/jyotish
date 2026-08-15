import { NextResponse } from "next/server";
import Razorpay from "razorpay";

import clientPromise from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      bookingId,
      serviceId,
      serviceName,
      customerName,
      customerEmail,
      customerPhone,
    } = body;

    /*
     * ============================================
     * BASIC VALIDATION
     * ============================================
     */

    if (
      !bookingId ||
      !serviceId ||
      !serviceName ||
      !customerName ||
      !customerEmail ||
      !customerPhone
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required booking information.",
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

    await client
      .db("codepunkdb")
      .command({ ping: 1 });

    /*
     * ============================================
     * FIND BOOKING
     * ============================================
     *
     * IMPORTANT:
     *
     * We DO NOT trust the amount sent by
     * the browser.
     *
     * The price comes from our Booking record,
     * which was created from the MongoDB Service.
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
     * PREVENT PAYMENT FOR ALREADY PAID BOOKING
     * ============================================
     */

    if (
      booking.paymentStatus === "paid" ||
      booking.status === "confirmed"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This booking has already been paid.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * VERIFY SERVICE
     * ============================================
     */

    if (
      booking.serviceId !== serviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service does not match the booking.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * GET AUTHORITATIVE PRICE
     * ============================================
     *
     * This is the price snapshot stored in
     * the booking.
     *
     * Admin can later change Service.price,
     * but this booking remains at the price
     * agreed when it was created.
     */

    const amount =
      booking.price;

    const currency =
      booking.currency || "INR";

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking amount.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * REUSE EXISTING RAZORPAY ORDER
     * ============================================
     *
     * If an order was already created for
     * this booking, reuse it.
     *
     * This avoids creating unnecessary
     * Razorpay orders when a customer retries.
     */

    if (booking.razorpayOrderId) {
      const existingPayment =
        await Payment.findOne({
          razorpayOrderId:
            booking.razorpayOrderId,
        });

      return NextResponse.json({
        success: true,

        orderId:
          booking.razorpayOrderId,

        amount:
          Math.round(amount * 100),

        currency,

        keyId:
          process.env.RAZORPAY_KEY_ID,

        paymentStatus:
          existingPayment?.status ||
          "pending",

        bookingId:
          booking.bookingId,
      });
    }

    /*
     * ============================================
     * CREATE RAZORPAY ORDER
     * ============================================
     */

    const amountInPaise =
      Math.round(
        amount * 100
      );

    const order =
      await razorpay.orders.create({
        amount:
          amountInPaise,

        currency,

        receipt:
          booking.bookingId,

        notes: {
          bookingId:
            booking.bookingId,

          serviceId:
            booking.serviceId,

          serviceName:
            booking.serviceName,

          customerName:
            booking.customer.fullName,

          customerEmail:
            booking.customer.email,

          customerPhone:
            booking.customer.mobile,
        },
      });

    /*
     * ============================================
     * SAVE RAZORPAY ORDER ID TO BOOKING
     * ============================================
     */

    booking.razorpayOrderId =
      order.id;

    await booking.save();

    /*
     * ============================================
     * CREATE PAYMENT RECORD
     * ============================================
     */

    await Payment.create({
      bookingId:
        booking._id,

      razorpayOrderId:
        order.id,

      razorpayPaymentId:
        "",

      amount,

      currency,

      status:
        "pending",
    });

    /*
     * ============================================
     * RESPONSE
     * ============================================
     */

    return NextResponse.json({
      success: true,

      orderId:
        order.id,

      amount:
        order.amount,

      currency:
        order.currency,

      keyId:
        process.env.RAZORPAY_KEY_ID,

      bookingId:
        booking.bookingId,

      paymentStatus:
        "pending",
    });
  } catch (error) {
    console.error(
      "Razorpay order creation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create Razorpay payment order.",
      },
      { status: 500 }
    );
  }
}