import { NextRequest, NextResponse } from "next/server";

import ContactQuery from "@/models/ContactQuery";
import { connectMongoose } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";

import {
  cleanMessage,
  cleanMobile,
  cleanText,
  isValidEmail,
  isValidMobile,
  isContactQueryCategory,
  makePublicId,
} from "@/lib/contactValidation";

import {
  sendContactQueryNotificationEmail,
  sendContactQueryReceiptEmail,
} from "@/lib/email";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

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
      key: `contact-query:${clientIp}`,
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many requests. Please try again later.",
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
     * Honeypot field.
     *
     * Legitimate users should leave this empty.
     * We intentionally return a generic success response
     * instead of revealing that the submission was detected.
     */
    if (
      typeof body?.website === "string" &&
      body.website.trim().length > 0
    ) {
      return NextResponse.json({
        success: true,
        message: "Your query has been received successfully.",
        queryId: makePublicId("QRY"),
      });
    }

    const name = cleanText(body?.name);
    const email = cleanText(body?.email).toLowerCase();
    const mobile = cleanMobile(body?.mobile);
    const category = cleanText(body?.category);
    const subject = cleanText(body?.subject);
    const message = cleanMessage(body?.message);

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

    if (mobile && !isValidMobile(mobile)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid mobile number.",
        },
        { status: 400 }
      );
    }

    if (!category || !isContactQueryCategory(category)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select a valid query category.",
        },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a subject.",
        },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your message.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const queryId = makePublicId("QRY");

    const contactQuery = await ContactQuery.create({
      queryId,
      name,
      email,
      mobile: mobile || undefined,
      subject,
      category,
      message,
      status: "new",
      priority: "normal",
      messages: [
        {
          sender: "customer",
          message,
          sentAt: new Date(),
        },
      ],
    });

    /*
     * The database record is already safely stored.
     *
     * Email failures must not cause the customer to believe
     * their query disappeared or encourage duplicate submission.
     */
    const emailResults = await Promise.allSettled([
      sendContactQueryNotificationEmail({
        queryId: contactQuery.queryId,
        name: contactQuery.name,
        email: contactQuery.email,
        mobile: contactQuery.mobile,
        subject: contactQuery.subject,
        category: contactQuery.category,
        message: contactQuery.message,
      }),

      sendContactQueryReceiptEmail({
        queryId: contactQuery.queryId,
        name: contactQuery.name,
        email: contactQuery.email,
        subject: contactQuery.subject,
      }),
    ]);

    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          index === 0
            ? "CONTACT QUERY ADMIN EMAIL FAILED:"
            : "CONTACT QUERY CUSTOMER RECEIPT EMAIL FAILED:",
          result.reason
        );
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your query has been received successfully.",
        queryId: contactQuery.queryId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CONTACT QUERY API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to submit your query right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}