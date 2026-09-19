import { NextRequest, NextResponse } from "next/server";

import Feedback from "@/models/Feedback";
import Booking from "@/models/Booking";

import { connectMongoose } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";

import {
  cleanMessage,
  cleanText,
  isValidEmail,
  isValidRating,
  makePublicId,
} from "@/lib/contactValidation";

import {
  sendFeedbackNotificationEmail,
  sendFeedbackReceiptEmail,
} from "@/lib/email";

const RATE_LIMIT_MAX = 4;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request format.",
        },
        { status: 415 }
      );
    }

    const clientIp = getClientIp(request);

    const rateLimitResult = await checkRateLimit({
      key: `contact-feedback:${clientIp}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many feedback submissions. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimitResult.retryAfterSeconds
            ),
          },
        }
      );
    }

    const body = await request.json();

    /*
     * Honeypot protection.
     *
     * Bots receive a generic successful response so we do not
     * expose the anti-bot mechanism.
     */
    if (
      typeof body?.website === "string" &&
      body.website.trim().length > 0
    ) {
      return NextResponse.json({
        success: true,
        message: "Your feedback has been received successfully.",
        feedbackId: makePublicId("FDB"),
      });
    }

    const name = cleanText(body?.name);
    const email = cleanText(body?.email).toLowerCase();
    const message = cleanMessage(body?.message);
    const serviceName = cleanText(body?.serviceName);
    const bookingId = cleanText(body?.bookingId);

    const rating =
      typeof body?.rating === "number"
        ? body.rating
        : Number(body?.rating);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your name.",
        },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (!isValidRating(rating)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a rating between 1 and 5.",
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your feedback.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    /*
     * A feedback submission may optionally contain a booking ID.
     *
     * If both booking ID and email match an existing booking,
     * the feedback is marked as coming from a verified customer.
     */
    let verifiedCustomer = false;

    if (bookingId) {
      const booking = await Booking.findOne({
        bookingId,
        "customer.email": email,
      })
        .select("_id bookingId customer.email")
        .lean();

      verifiedCustomer = Boolean(booking);
    }

    const feedbackId = makePublicId("FDB");

    const feedback = await Feedback.create({
      feedbackId,
      name,
      email,
      rating,
      message,
      serviceName: serviceName || undefined,
      bookingId: bookingId || undefined,
      verifiedCustomer,
      publishRequested: true,
      status: "pending",
    });

    /*
     * Important:
     *
     * Feedback is deliberately stored as PENDING.
     * It must never become public merely because the visitor
     * submitted it.
     */
    const emailResults = await Promise.allSettled([
      sendFeedbackNotificationEmail({
        feedbackId: feedback.feedbackId,
        name: feedback.name,
        email: feedback.email,
        rating: feedback.rating,
        message: feedback.message,
        serviceName: feedback.serviceName,
        bookingId: feedback.bookingId,
        verifiedCustomer: feedback.verifiedCustomer,
      }),

      sendFeedbackReceiptEmail({
        feedbackId: feedback.feedbackId,
        name: feedback.name,
        email: feedback.email,
      }),
    ]);

    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          index === 0
            ? "FEEDBACK ADMIN EMAIL FAILED:"
            : "FEEDBACK CUSTOMER RECEIPT EMAIL FAILED:",
          result.reason
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Thank you. Your feedback has been received and is pending review.",
        feedbackId: feedback.feedbackId,
        verifiedCustomer: feedback.verifiedCustomer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("FEEDBACK API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to submit your feedback right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}