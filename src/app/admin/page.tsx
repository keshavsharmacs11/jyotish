"use client";

import { useEffect, useState } from "react";

type DashboardStats = {
  totalBookings: number;
  paidBookings: number;
  pendingPayments: number;
  revenue: number;
};

type Booking = {
  _id: string;
  bookingId: string;
  serviceName: string;
  date: string;
  time: string;
  customer?: {
    fullName?: string;
    email?: string;
    mobile?: string;
  };
  price: number;
  status: string;
  paymentStatus: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    paidBookings: 0,
    pendingPayments: 0,
    revenue: 0,
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/dashboard");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load dashboard."
        );
      }

      setStats(data.stats);
      setBookings(data.recentBookings || []);
    } catch (error) {
      console.error("Dashboard error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="admin-welcome">
        <div>
          <p className="admin-eyebrow">
            AKSHAANSHH JYOTISH
          </p>

          <h2>
            Welcome to your
            <span> administration portal.</span>
          </h2>

          <p>
            Manage bookings, payments, services and consultants
            from one place.
          </p>
        </div>

        <div className="admin-welcome-symbol">
          ✦
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            ◈
          </div>

          <div>
            <span>TOTAL BOOKINGS</span>

            <strong>
              {loading ? "—" : stats.totalBookings}
            </strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            ✓
          </div>

          <div>
            <span>PAID BOOKINGS</span>

            <strong>
              {loading ? "—" : stats.paidBookings}
            </strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            ₹
          </div>

          <div>
            <span>REVENUE</span>

            <strong>
              {loading
                ? "—"
                : `₹${stats.revenue.toLocaleString("en-IN")}`}
            </strong>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            !
          </div>

          <div>
            <span>PENDING PAYMENTS</span>

            <strong>
              {loading ? "—" : stats.pendingPayments}
            </strong>
          </div>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section-header">
          <div>
            <p className="admin-eyebrow">
              BOOKINGS
            </p>

            <h2>
              Recent Bookings
            </h2>
          </div>

          <a
            href="/admin/bookings"
            className="admin-view-all"
          >
            View All →
          </a>
        </div>

        <div className="admin-table-card">
          {loading ? (
            <div className="admin-empty">
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="admin-empty">
              No bookings found.
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>BOOKING</th>
                    <th>CUSTOMER</th>
                    <th>SERVICE</th>
                    <th>DATE</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <strong>
                          {booking.bookingId}
                        </strong>
                      </td>

                      <td>
                        <div className="admin-customer">
                          <strong>
                            {booking.customer?.fullName ||
                              "Unknown"}
                          </strong>

                          <span>
                            {booking.customer?.email || ""}
                          </span>
                        </div>
                      </td>

                      <td>
                        {booking.serviceName}
                      </td>

                      <td>
                        <div>
                          {booking.date}

                          <small>
                            {booking.time}
                          </small>
                        </div>
                      </td>

                      <td>
                        <strong>
                          ₹
                          {booking.price.toLocaleString(
                            "en-IN"
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`admin-status-badge admin-status-${booking.paymentStatus}`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
