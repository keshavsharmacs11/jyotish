import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";

import Booking from "@/models/Booking";

export async function GET(
  request: NextRequest
) {
  /*
   * ============================================
   * ADMIN AUTHENTICATION
   * ============================================
   *
   * Only authenticated administrators can
   * access dashboard statistics.
   */

  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * ============================================
     * CONNECT MONGOOSE
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * GET BOOKINGS
     * ============================================
     *
     * Dashboard statistics are calculated
     * from the booking collection.
     */

    const bookings =
      await Booking.find({})
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * ============================================
     * CALCULATE STATISTICS
     * ============================================
     */

    const totalBookings =
      bookings.length;

    const paidBookings =
      bookings.filter(
        (booking) =>
          booking.paymentStatus ===
          "paid"
      ).length;

    const pendingPayments =
      bookings.filter(
        (booking) =>
          booking.paymentStatus ===
            "pending" ||
          booking.paymentStatus ===
            "failed"
      ).length;

    const revenue =
      bookings
        .filter(
          (booking) =>
            booking.paymentStatus ===
            "paid"
        )
        .reduce(
          (total, booking) =>
            total +
            Number(
              booking.price || 0
            ),
          0
        );

    /*
     * ============================================
     * RECENT BOOKINGS
     * ============================================
     */

    const recentBookings =
      bookings
        .slice(0, 10)
        .map((booking) => ({
          _id:
            booking._id.toString(),

          bookingId:
            booking.bookingId,

          serviceName:
            booking.serviceName,

          date:
            booking.date,

          time:
            booking.time,

          customer:
            booking.customer,

          price:
            Number(
              booking.price || 0
            ),

          status:
            booking.status,

          paymentStatus:
            booking.paymentStatus,
        }));

    /*
     * ============================================
     * SUCCESS RESPONSE
     * ============================================
     */

    return NextResponse.json({
      success: true,

      stats: {
        totalBookings,
        paidBookings,
        pendingPayments,
        revenue,
      },

      recentBookings,
    });
  } catch (error) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load admin dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}