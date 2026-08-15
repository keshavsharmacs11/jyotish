import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";

import clientPromise from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Service from "@/models/Service";
import Consultant from "@/models/Consultant";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      serviceId,
      mode,
      consultantId,
      date,
      time,
      customer,
      userId,
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
     */

    if (
      !customer.fullName ||
      !customer.mobile ||
      !customer.email
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Customer name, mobile and email are required.",
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

    const db = client.db("codepunkdb");

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
     * CHECK SERVICE → CONSULTANT RELATIONSHIP
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
     * CHECK DATE AVAILABILITY
     * ============================================
     */

    const availableDate =
      consultant.availability?.find(
        (item: any) =>
          String(item.date) ===
          String(date)
      );

    if (!availableDate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected consultant is not available on this date.",
        },
        { status: 400 }
      );
    }

    /*
     * ============================================
     * CHECK TIME AVAILABILITY
     * ============================================
     */

    const availableTimes =
      Array.isArray(
        availableDate.times
      )
        ? availableDate.times.map(
            (item: unknown) =>
              String(item)
          )
        : [];

    if (
      !availableTimes.includes(
        String(time)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected time slot is not available for this consultant.",
        },
        { status: 400 }
      );
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
     * CREATE BOOKING
     * ============================================
     */

    const booking =
      await Booking.create({
        bookingId,

        userId:
          userId || null,

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
            String(
              customer.fullName
            ).trim(),

          dob:
            customer.dob || "",

          birthTime:
            customer.birthTime || "",

          birthPlace:
            customer.birthPlace || "",

          gender:
            customer.gender || "",

          mobile:
            String(
              customer.mobile
            ).trim(),

          email:
            String(
              customer.email
            )
              .trim()
              .toLowerCase(),

          concern:
            customer.concern || "",

          language:
            customer.language || "",

          currentName:
            customer.currentName || "",

          person2Name:
            customer.person2Name || "",

          person2Dob:
            customer.person2Dob || "",

          person2BirthTime:
            customer.person2BirthTime ||
            "",

          person2BirthPlace:
            customer.person2BirthPlace ||
            "",

          tarotQuestion:
            customer.tarotQuestion || "",
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

          customer:
            booking.customer,

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