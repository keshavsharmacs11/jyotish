import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { requireAdmin } from "@/lib/adminAuth";
import { connectMongoose } from "@/lib/mongodb";
import { cleanMessage } from "@/lib/contactValidation";
import { sendContactQueryReplyEmail } from "@/lib/email";
import ContactQuery from "@/models/ContactQuery";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const queryId =
      typeof body.queryId === "string"
        ? body.queryId.trim()
        : "";

    // The admin queries page sends the reply as "message".
    const reply = cleanMessage(body.message, 5000);

    if (!queryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Query ID is required.",
        },
        { status: 400 }
      );
    }

    if (reply.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reply must contain at least 2 characters.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const query = await ContactQuery.findOne({
      queryId,
    });

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: "Query not found.",
        },
        { status: 404 }
      );
    }

    const adminId = new mongoose.Types.ObjectId(
      auth.admin.userId
    );

    query.messages.push({
      sender: "admin",
      message: reply,
      sentAt: new Date(),
      adminId,
    });

    query.lastRepliedAt = new Date();
    query.status = "in_progress";

    await query.save();

    try {
      await sendContactQueryReplyEmail({
        queryId,
        name: query.name,
        email: query.email,
        subject: query.subject,
        replyMessage: reply,
      });
    } catch (emailError) {
      console.error(
        "ADMIN QUERY REPLY EMAIL ERROR:",
        emailError
      );

      return NextResponse.json({
        success: true,
        emailSent: false,
        message:
          "Reply was saved, but the email could not be sent. Please try again.",
        query,
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: "Reply sent successfully.",
      query,
    });
  } catch (error) {
    console.error(
      "ADMIN QUERY REPLY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to send the reply.",
      },
      { status: 500 }
    );
  }
}