"use client";

import { useEffect, useMemo, useState } from "react";

type Consultant = {
  _id: string;
  name: string;
  specialization: string;
  availableModes: ("video" | "voice")[];
  availability: {
    date: string;
    times: string[];
  }[];
  active: boolean;
};

type Booking = {
  _id: string;
  bookingId: string;
  serviceName: string;
  category: string;
  mode: "video" | "voice";
  date: string;
  time: string;

  consultantId?: string | null;
  consultantName?: string;

  price: number;
  currency: string;

  status: string;
  paymentStatus: string;

  refundStatus?: "pending" | "processed" | "failed" | null;
  razorpayRefundId?: string | null;

  razorpayOrderId?: string;
  razorpayPaymentId?: string;

  customer: {
    fullName: string;
    mobile: string;
    email: string;

    dob?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: string;

    concern?: string;
    language?: string;
    currentName?: string;

    person2Name?: string;
    person2Dob?: string;
    person2BirthTime?: string;
    person2BirthPlace?: string;

    tarotQuestion?: string;
  };

  createdAt: string;
  updatedAt: string;
};

type Filter =
  | "all"
  | "paid"
  | "pending"
  | "failed"
  | "refunded";

export default function AdminBookingsPage() {
  /*
   * ============================================
   * BOOKINGS
   * ============================================
   */

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * ============================================
   * CONSULTANTS
   * ============================================
   */

  const [consultants, setConsultants] =
    useState<Consultant[]>([]);

  const [consultantsLoading, setConsultantsLoading] =
    useState(false);

  const [consultantsError, setConsultantsError] =
    useState("");

  /*
   * ============================================
   * SEARCH / FILTER
   * ============================================
   */

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  /*
   * ============================================
   * SELECTED BOOKING
   * ============================================
   */

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  /*
   * ============================================
   * CONSULTANT ASSIGNMENT
   * ============================================
   */

  const [
    selectedConsultantId,
    setSelectedConsultantId,
  ] = useState<string>("");

  const [
    assigningConsultant,
    setAssigningConsultant,
  ] = useState(false);

  const [
    assignmentMessage,
    setAssignmentMessage,
  ] = useState("");

  /*
   * ============================================
   * BOOKING STATUS
   * ============================================
   */

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<string>("");

  const [
    updatingStatus,
    setUpdatingStatus,
  ] = useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  /*
   * ============================================
   * REFUND
   * ============================================
   */

  const [
    refunding,
    setRefunding,
  ] = useState(false);

  const [
    refundMessage,
    setRefundMessage,
  ] = useState("");

  const [refundPolling, setRefundPolling] =
    useState(false);

  const [
    reconcilingRefund,
    setReconcilingRefund,
  ] = useState(false);

  /*
   * ============================================
   * INITIAL LOAD
   * ============================================
   */

  useEffect(() => {
    loadBookings();
    loadConsultants();
  }, []);

  /*
   * ============================================
   * REFUND STATUS POLLING
   * ============================================
   *
   * Razorpay confirmation arrives asynchronously
   * through the webhook. While the selected booking
   * is pending, refresh the booking data periodically
   * so the detail panel changes to Refunded without
   * requiring a manual page refresh.
   *
   * The database remains the source of truth.
   * ============================================
   */
  useEffect(() => {
    if (
      !showDetails ||
      !selectedBooking ||
      selectedBooking.refundStatus !== "pending"
    ) {
      setRefundPolling(false);
      return;
    }

    let active = true;
    let attempts = 0;
    const maxAttempts = 60;

    setRefundPolling(true);

    const pollRefundStatus = async () => {
      if (!active) {
        return;
      }

      attempts += 1;

      try {
        await loadBookings();
      } catch (error) {
        console.error(
          "REFUND STATUS POLLING ERROR:",
          error
        );
      }

      if (!active || attempts >= maxAttempts) {
        setRefundPolling(false);
      }
    };

    const intervalId = window.setInterval(
      pollRefundStatus,
      5000
    );

    return () => {
      active = false;
      window.clearInterval(intervalId);
      setRefundPolling(false);
    };
  }, [
    showDetails,
    selectedBooking?.refundStatus,
  ]);

  /*
   * ============================================
   * LOAD BOOKINGS
   * ============================================
   */

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to load bookings."
        );
      }

      const normalizedBookings: Booking[] = (
        data.bookings || []
      ).map((booking: Booking) => ({
        ...booking,
        customer: booking.customer || {
          fullName: "",
          mobile: "",
          email: "",
        },
        refundStatus:
          booking.paymentStatus === "refunded"
            ? "processed"
            : booking.refundStatus || null,
        razorpayRefundId:
          booking.razorpayRefundId || null,
      }));

      setBookings(normalizedBookings);

      /*
       * Keep detail panel synchronized
       * if it is currently open.
       */

      if (selectedBooking) {
        const updatedBooking =
          normalizedBookings.find(
            (booking: Booking) =>
              booking._id ===
              selectedBooking._id
          );

        if (updatedBooking) {
          setSelectedBooking(
            updatedBooking
          );

          setSelectedConsultantId(
            updatedBooking.consultantId ||
              ""
          );

          setSelectedStatus(
            updatedBooking.status
          );
        }
      }
    } catch (error) {
      console.error(
        "Admin bookings error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load bookings."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================
   * LOAD CONSULTANTS
   * ============================================
   */

  async function loadConsultants() {
    try {
      setConsultantsLoading(true);
      setConsultantsError("");

      const response =
        await fetch(
          "/api/admin/consultants",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to load consultants."
        );
      }

      setConsultants(
        data.consultants || []
      );
    } catch (error) {
      console.error(
        "Admin consultants error:",
        error
      );

      setConsultantsError(
        error instanceof Error
          ? error.message
          : "Unable to load consultants."
      );
    } finally {
      setConsultantsLoading(false);
    }
  }

  /*
   * ============================================
   * FILTER BOOKINGS
   * ============================================
   */

  const filteredBookings =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return bookings.filter(
        (booking) => {
          const matchesSearch =
            !normalizedSearch ||
            booking.bookingId
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (booking.customer?.fullName || "")
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (booking.customer?.email || "")
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (booking.customer?.mobile || "")
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            booking.serviceName
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (
              booking.consultantName ||
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesFilter =
            filter === "all" ||
            booking.paymentStatus ===
              filter;

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      bookings,
      search,
      filter,
    ]);

  /*
   * ============================================
   * STATISTICS
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

  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.paymentStatus ===
        "pending"
    ).length;

  const completedBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        "completed"
    ).length;

  /*
   * ============================================
   * OPEN BOOKING
   * ============================================
   */

  function openBooking(
    booking: Booking
  ) {
    setSelectedBooking(
      booking
    );

    setSelectedConsultantId(
      booking.consultantId || ""
    );

    setSelectedStatus(
      booking.status
    );

    setAssignmentMessage("");

    setStatusMessage("");

    setRefundMessage("");

    setShowDetails(true);
  }

  /*
   * ============================================
   * CLOSE BOOKING
   * ============================================
   */

  function closeBooking() {
    setShowDetails(false);

    setSelectedBooking(null);

    setSelectedConsultantId("");

    setSelectedStatus("");

    setAssignmentMessage("");

    setStatusMessage("");

    setRefundMessage("");

    setConsultantsError("");
  }

  /*
   * ============================================
   * ASSIGN CONSULTANT
   * ============================================
   */

  async function assignConsultant() {
    if (!selectedBooking) {
      return;
    }

    if (!selectedConsultantId) {
      setAssignmentMessage(
        "Please select a consultant."
      );

      return;
    }

    try {
      setAssigningConsultant(true);
      setAssignmentMessage("");

      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              bookingId:
                selectedBooking.bookingId,

              consultantId:
                selectedConsultantId,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to assign consultant."
        );
      }

      /*
       * Update selected booking
       * immediately.
       */

      const updatedBooking =
        data.booking;

      if (updatedBooking) {
        setSelectedBooking(
          (previousBooking) => {
            if (!previousBooking) {
              return updatedBooking;
            }

            return {
              ...previousBooking,
              ...updatedBooking,
              customer:
                updatedBooking.customer ||
                previousBooking.customer,
            };
          }
        );

        setSelectedConsultantId(
          updatedBooking.consultantId ||
            ""
        );

        setSelectedStatus(
          updatedBooking.status
        );
      }

      /*
       * Refresh complete booking list.
       */

      await loadBookings();

      setAssignmentMessage(
        "Consultant assigned successfully."
      );
    } catch (error) {
      console.error(
        "ASSIGN CONSULTANT ERROR:",
        error
      );

      setAssignmentMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign consultant."
      );
    } finally {
      setAssigningConsultant(false);
    }
  }

  /*
   * ============================================
   * UPDATE BOOKING STATUS
   * ============================================
   */

  async function updateBookingStatus() {
    if (!selectedBooking) {
      return;
    }

    if (!selectedStatus) {
      setStatusMessage(
        "Please select a booking status."
      );

      return;
    }

    if (
      selectedStatus ===
      selectedBooking.status
    ) {
      setStatusMessage(
        "The booking is already using this status."
      );

      return;
    }

    try {
      setUpdatingStatus(true);
      setStatusMessage("");

      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              bookingId:
                selectedBooking.bookingId,

              status:
                selectedStatus,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Unable to update booking status."
        );
      }

      /*
       * Update selected booking
       * immediately.
       */

      if (data.booking) {
        setSelectedBooking(
          (previousBooking) => {
            if (!previousBooking) {
              return data.booking;
            }

            return {
              ...previousBooking,
              ...data.booking,
              customer:
                data.booking.customer ||
                previousBooking.customer,
            };
          }
        );

        setSelectedStatus(
          data.booking.status
        );
      }

      /*
       * Refresh booking list.
       */

      await loadBookings();

      setStatusMessage(
        "Booking status updated successfully."
      );
    } catch (error) {
      console.error(
        "UPDATE BOOKING STATUS ERROR:",
        error
      );

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to update booking status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  /*
   * ============================================
   * REFUND & CANCEL BOOKING
   * ============================================
   */

  async function refundBooking() {
    if (!selectedBooking) {
      return;
    }

    if (selectedBooking.refundStatus === "pending") {
      setRefundMessage(
        "A refund request is already processing. Please wait for Razorpay confirmation."
      );
      return;
    }

    if (selectedBooking.refundStatus === "processed") {
      setRefundMessage(
        "This booking has already been refunded successfully."
      );
      return;
    }

  /*
   * ============================================
   * ONLY PAID BOOKINGS CAN BE REFUNDED
   * ============================================
   */

  if (
    selectedBooking.paymentStatus !==
    "paid"
  ) {
    setRefundMessage(
      "Only paid bookings can be refunded."
    );

    return;
  }

  /*
   * ============================================
   * COMPLETED BOOKINGS
   * ============================================
   */

  if (
    selectedBooking.status ===
    "completed"
  ) {
    setRefundMessage(
      "A completed consultation cannot be refunded through this flow."
    );

    return;
  }

  /*
   * ============================================
   * ALREADY CANCELLED
   * ============================================
   */

  if (
    selectedBooking.status ===
    "cancelled"
  ) {
    setRefundMessage(
      "This booking has already been cancelled."
    );

    return;
  }

  /*
   * ============================================
   * CONFIRMATION
   * ============================================
   */

  const confirmed =
    window.confirm(
      `Are you sure you want to cancel booking ${selectedBooking.bookingId} and issue a full refund of ${formatAmount(
        selectedBooking.price,
        selectedBooking.currency
      )}?`
    );

  if (!confirmed) {
    return;
  }

  try {
    setRefunding(true);
    setRefundMessage("");

    /*
     * ==========================================
     * CALL REFUND API
     * ==========================================
     */

    const response =
      await fetch(
        "/api/admin/bookings/refund",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            bookingId:
              selectedBooking.bookingId,

            reason:
              "Cancelled by administrator",
          }),
        }
      );

    /*
     * ==========================================
     * SAFELY READ RESPONSE
     * ==========================================
     *
     * This prevents the frontend from crashing
     * if the server ever returns HTML instead
     * of JSON.
     */

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    let data: any = null;

    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data =
        await response.json();
    } else {
      const text =
        await response.text();

      console.error(
        "REFUND API RETURNED NON-JSON:",
        {
          status:
            response.status,

          statusText:
            response.statusText,

          body:
            text.slice(0, 500),
        }
      );

      throw new Error(
        `Refund API returned an unexpected response (${response.status}).`
      );
    }

    /*
     * ==========================================
     * API ERROR
     * ==========================================
     */

    if (
      !response.ok ||
      !data?.success
    ) {
      throw new Error(
        data?.error ||
          "Unable to process refund."
      );
    }

    /*
     * ==========================================
     * IMPORTANT:
     *
     * The refund API intentionally returns only
     * part of the booking.
     *
     * DO NOT replace selectedBooking with
     * data.booking directly.
     *
     * Instead merge the API response into the
     * existing complete booking.
     *
     * This preserves:
     *
     * customer
     * service
     * consultant
     * date
     * time
     * price
     * etc.
     * ==========================================
     */

    if (data.booking) {
      setSelectedBooking(
        (previousBooking) => {
          if (!previousBooking) {
            return previousBooking;
          }

          return {
            ...previousBooking,

            ...data.booking,

            /*
             * Preserve nested customer object
             * because refund API does not return it.
             */

            customer:
              data.booking.customer ||
              previousBooking.customer,

            refundStatus:
              data.booking.paymentStatus === "refunded"
                ? "processed"
                : data.refund?.status ||
                  data.booking.refundStatus ||
                  previousBooking.refundStatus ||
                  null,

            razorpayRefundId:
              data.refund?.refundId ||
              data.booking.razorpayRefundId ||
              previousBooking.razorpayRefundId ||
              null,
          };
        }
      );

      setSelectedStatus(
        data.booking.status ||
          "cancelled"
      );

      /*
       * Preserve the existing consultant ID
       * if the refund API doesn't return it.
       */

      if (
        data.booking.consultantId
      ) {
        setSelectedConsultantId(
          data.booking.consultantId
        );
      }
    } else if (data.refund) {
      setSelectedBooking(
        (previousBooking) =>
          previousBooking
            ? {
                ...previousBooking,
                refundStatus:
                  data.refund.status ||
                  (previousBooking.paymentStatus === "refunded"
                    ? "processed"
                    : previousBooking.refundStatus || null),
                razorpayRefundId:
                  data.refund.refundId ||
                  previousBooking.razorpayRefundId ||
                  null,
              }
            : previousBooking
      );
    }

    /*
     * ==========================================
     * REFRESH BOOKINGS
     * ==========================================
     *
     * The database remains the source of truth.
     *
     * This will retrieve the complete booking
     * including customer information.
     * ==========================================
     */

    await loadBookings();

    /*
     * ==========================================
     * SUCCESS MESSAGE
     * ==========================================
     */

    if (
      data.refunded === true
    ) {
      setRefundMessage(
        "Booking cancelled and refund processed successfully."
      );
    } else {
      setRefundMessage(
        "Refund request submitted successfully. Waiting for Razorpay confirmation."
      );
    }
  } catch (error) {
    console.error(
      "REFUND BOOKING ERROR:",
      error
    );

    setRefundMessage(
      error instanceof Error
        ? error.message
        : "Unable to process refund."
    );
  } finally {
    setRefunding(false);
  }
}

  /*
   * ============================================
   * RECONCILE REFUND WITH RAZORPAY
   * ============================================
   *
   * Used when Razorpay already shows the refund as
   * processed but our local Payment record is still
   * pending. This endpoint only reads the existing
   * Razorpay refund and synchronizes our database.
   */
  async function reconcileRefund() {
    if (!selectedBooking) {
      return;
    }

    if (selectedBooking.refundStatus !== "pending") {
      setRefundMessage(
        "This refund is no longer pending."
      );
      return;
    }

    if (!selectedBooking.razorpayRefundId) {
      setRefundMessage(
        "No Razorpay Refund ID is available for reconciliation."
      );
      return;
    }

    try {
      setReconcilingRefund(true);
      setRefundMessage("");

      const response = await fetch(
        "/api/admin/bookings/reconcile-refund",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: selectedBooking.bookingId,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let data: any = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        console.error(
          "RECONCILE REFUND API RETURNED NON-JSON:",
          {
            status: response.status,
            statusText: response.statusText,
            body: text.slice(0, 500),
          }
        );

        throw new Error(
          "Refund reconciliation returned an unexpected server response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to reconcile the refund with Razorpay."
        );
      }

      await loadBookings();

      if (data.status === "processed") {
        setRefundMessage(
          "Refund status synchronized successfully. The refund is processed."
        );
      } else if (data.status === "failed") {
        setRefundMessage(
          "Razorpay reports that this refund failed."
        );
      } else {
        setRefundMessage(
          "Razorpay still reports this refund as pending."
        );
      }
    } catch (error) {
      console.error(
        "RECONCILE REFUND ERROR:",
        error
      );

      setRefundMessage(
        error instanceof Error
          ? error.message
          : "Unable to reconcile the refund."
      );
    } finally {
      setReconcilingRefund(false);
    }
  }

  /*
   * ============================================
   * FORMAT DATE
   * ============================================
   */

  function formatDate(
    date: string
  ) {
    if (!date) {
      return "—";
    }

    const parsed =
      new Date(
        `${date}T00:00:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return date;
    }

    return parsed.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  /*
   * ============================================
   * FORMAT AMOUNT
   * ============================================
   */

  function formatAmount(
    amount: number,
    currency: string
  ) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency:
          currency || "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

  /*
   * ============================================
   * STATUS LABEL
   * ============================================
   */

  function statusLabel(
    status: string
  ) {
    return status
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }

  /*
   * ============================================
   * EXCEL-READY EXPORT
   * ============================================
   *
   * CSV is intentionally generated in the browser so there is
   * no new backend/export endpoint to maintain. Excel opens CSV
   * files directly, and the export contains the complete booking
   * record rather than only the columns visible in the compact UI.
   */
  function csvCell(value: unknown) {
    const text =
      value === null || value === undefined
        ? ""
        : String(value);

    return `"${text.replaceAll('"', '""')}"`;
  }

  function excelReadyValue(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    return value;
  }

  function downloadExcelReadyBookings() {
    if (bookings.length === 0) {
      return;
    }

    const headers = [
      "Booking ID",
      "Date",
      "Time",
      "Customer Name",
      "Mobile",
      "Email",
      "Service",
      "Category",
      "Mode",
      "Consultant",
      "Price",
      "Currency",
      "Payment Status",
      "Booking Status",
      "Refund Status",
      "Razorpay Order ID",
      "Razorpay Payment ID",
      "Razorpay Refund ID",
      "Date of Birth",
      "Birth Time",
      "Birth Place",
      "Gender",
      "Concern",
      "Language",
      "Current Name",
      "Person 2 Name",
      "Person 2 Date of Birth",
      "Person 2 Birth Time",
      "Person 2 Birth Place",
      "Tarot Question",
      "Created At",
      "Updated At",
    ];

    const rows = bookings.map((booking) => [
      booking.bookingId,
      booking.date,
      booking.time,
      booking.customer?.fullName,
      booking.customer?.mobile,
      booking.customer?.email,
      booking.serviceName,
      booking.category,
      booking.mode === "video" ? "Video" : "Voice",
      booking.consultantName || "",
      excelReadyValue(booking.price),
      booking.currency || "INR",
      statusLabel(booking.paymentStatus),
      statusLabel(booking.status),
      booking.refundStatus || "",
      booking.razorpayOrderId || "",
      booking.razorpayPaymentId || "",
      booking.razorpayRefundId || "",
      booking.customer?.dob || "",
      booking.customer?.birthTime || "",
      booking.customer?.birthPlace || "",
      booking.customer?.gender || "",
      booking.customer?.concern || "",
      booking.customer?.language || "",
      booking.customer?.currentName || "",
      booking.customer?.person2Name || "",
      booking.customer?.person2Dob || "",
      booking.customer?.person2BirthTime || "",
      booking.customer?.person2BirthPlace || "",
      booking.customer?.tarotQuestion || "",
      booking.createdAt,
      booking.updatedAt,
    ]);

    const csv =
      [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replaceAll("-", "");

    anchor.href = url;
    anchor.download = `akshaanshh-jyotish-bookings-${stamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  /*
   * ============================================
   * RENDER
   * ============================================
   */

  return (
    <main className="admin-bookings-page">

      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <section className="admin-bookings-header">

        <div>
          <p className="admin-bookings-eyebrow">
            ADMINISTRATION
          </p>

          <h1>
            Bookings
          </h1>

          <p className="admin-bookings-description">
            Manage consultations,
            clients, payments and
            appointments from one
            place.
          </p>
        </div>

        <button
          type="button"
          className="admin-bookings-refresh"
          onClick={() => {
            loadBookings();
            loadConsultants();
          }}
          disabled={
            loading ||
            consultantsLoading
          }
        >
          ↻

          <span>
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </span>
        </button>

      </section>

      {/* ==========================================
          STATISTICS
      ========================================== */}

      <section className="admin-bookings-stats">

        <div className="admin-bookings-stat">
          <span>
            Total Bookings
          </span>

          <strong>
            {totalBookings}
          </strong>

          <small>
            All consultations
          </small>
        </div>

        <div className="admin-bookings-stat">
          <span>
            Paid
          </span>

          <strong>
            {paidBookings}
          </strong>

          <small>
            Payments received
          </small>
        </div>

        <div className="admin-bookings-stat">
          <span>
            Pending
          </span>

          <strong>
            {pendingBookings}
          </strong>

          <small>
            Awaiting payment
          </small>
        </div>

        <div className="admin-bookings-stat">
          <span>
            Completed
          </span>

          <strong>
            {completedBookings}
          </strong>

          <small>
            Consultations completed
          </small>
        </div>

      </section>

      {/* ==========================================
          CONTROLS
      ========================================== */}

      <section className="admin-bookings-controls">

        <div className="admin-bookings-search">

          <span>
            ⌕
          </span>

          <input
            type="search"
            placeholder="Search booking, client, email or service..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          )}

        </div>

        <div className="admin-bookings-filters">

          {(
            [
              ["all", "All"],
              ["paid", "Paid"],
              [
                "pending",
                "Pending",
              ],
              [
                "failed",
                "Failed",
              ],
              [
                "refunded",
                "Refunded",
              ],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  filter === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(value)
                }
              >
                {label}
              </button>
            )
          )}

        </div>

      </section>

      {/* ==========================================
          ERROR
      ========================================== */}

      {error && (
        <div className="admin-bookings-error">

          <strong>
            Unable to load bookings
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={loadBookings}
          >
            Try Again
          </button>

        </div>
      )}

      {/* ==========================================
          LOADING
      ========================================== */}

      {loading && (
        <div className="admin-bookings-loading">

          <div className="admin-bookings-spinner" />

          <p>
            Loading bookings...
          </p>

        </div>
      )}

      {/* ==========================================
          BOOKINGS
      ========================================== */}

      {!loading &&
        !error && (
          <section className="admin-bookings-table-wrapper">

            <div className="admin-bookings-table-header">

              <div>

                <span>
                  CONSULTATIONS
                </span>

                <strong>
                  {
                    filteredBookings.length
                  }{" "}
                  booking
                  {filteredBookings.length ===
                  1
                    ? ""
                    : "s"}
                </strong>

              </div>

              <div className="admin-bookings-table-header-actions">
                <span className="admin-bookings-live">

                  <i />

                  Live data

                </span>

                <button
                  type="button"
                  className="admin-bookings-export"
                  onClick={downloadExcelReadyBookings}
                  disabled={bookings.length === 0}
                  title="Download every booking as an Excel-ready CSV"
                >
                  ↓ Excel-ready CSV
                </button>
              </div>

            </div>

            {filteredBookings.length ===
            0 ? (
              <div className="admin-bookings-empty">

                <div className="admin-bookings-empty-icon">
                  ✦
                </div>

                <h3>
                  No bookings found
                </h3>

                <p>
                  Try changing your
                  search or filter.
                </p>

              </div>
            ) : (
              <div className="admin-bookings-table-scroll" tabIndex={0} aria-label="Scrollable bookings list">
                <div className="admin-bookings-table">

                <div className="admin-bookings-row admin-bookings-row-heading">

                  <div>
                    Booking
                  </div>

                  <div>
                    Client
                  </div>

                  <div>
                    Consultation
                  </div>

                  <div>
                    Payment
                  </div>

                  <div>
                    Status
                  </div>

                  <div>
                    Action
                  </div>

                </div>

                {filteredBookings.map(
                  (booking) => (
                    <div
                      className="admin-bookings-row"
                      key={
                        booking._id
                      }
                    >

                      {/* BOOKING */}

                      <div className="admin-booking-id">

                        <strong>
                          {
                            booking.bookingId
                          }
                        </strong>

                        <span>
                          {formatDate(
                            booking.date
                          )}
                        </span>

                      </div>

                      {/* CLIENT */}

                      <div className="admin-booking-client">

                        <div className="admin-booking-avatar">

                          {booking.customer.fullName
                            .charAt(0)
                            .toUpperCase()}

                        </div>

                        <div>

                          <strong>
                            {
                              booking
                                .customer
                                .fullName
                            }
                          </strong>

                          <span>
                            {
                              booking
                                .customer
                                .email
                            }
                          </span>

                        </div>

                      </div>

                      {/* CONSULTATION */}

                      <div className="admin-booking-consultation">

                        <strong>
                          {
                            booking.serviceName
                          }
                        </strong>

                        <span>
                          {booking.mode ===
                          "video"
                            ? "Video"
                            : "Voice"}

                          {" • "}

                          {
                            booking.time
                          }
                        </span>

                        <span>
                          Consultant:{" "}
                          {
                            booking.consultantName ||
                            "To be assigned"
                          }
                        </span>

                      </div>

                      {/* PAYMENT */}

                      <div className="admin-booking-payment">

                        <strong>
                          {formatAmount(
                            booking.price,
                            booking.currency
                          )}
                        </strong>

                        <span
                          className={`admin-payment-badge admin-payment-${booking.paymentStatus}`}
                        >
                          {statusLabel(
                            booking.paymentStatus
                          )}
                        </span>

                      </div>

                      {/* STATUS */}

                      <div>

                        <span
                          className={`admin-booking-status admin-status-${booking.status}`}
                        >
                          {statusLabel(
                            booking.status
                          )}
                        </span>

                      </div>

                      {/* ACTION */}

                      <div>

                        <button
                          type="button"
                          className="admin-booking-view"
                          onClick={() =>
                            openBooking(
                              booking
                            )
                          }
                        >
                          View

                          <span>
                            →
                          </span>

                        </button>

                      </div>

                    </div>
                  )
                )}

                </div>
              </div>
            )}

          </section>
        )}

      {/* ==========================================
          EXCEL-READY BOOKING REGISTER
      ========================================== */}

      {!loading && !error && bookings.length > 0 && (
        <section className="admin-bookings-export-card">
          <div className="admin-bookings-export-header">
            <div>
              <span className="admin-bookings-export-eyebrow">
                EXCEL-READY REGISTER
              </span>
              <h2>All bookings at a glance</h2>
              <p>
                This register is generated automatically from the same live booking data above.
                Use the CSV button to open the complete record in Excel.
              </p>
            </div>

            <button
              type="button"
              className="admin-bookings-export-primary"
              onClick={downloadExcelReadyBookings}
            >
              Download all bookings ↓
            </button>
          </div>

          <div className="admin-bookings-register-scroll" tabIndex={0} aria-label="Scrollable Excel-ready booking register">
            <table className="admin-bookings-register-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Service</th>
                  <th>Consultant</th>
                  <th>Mode</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Refund</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={`register-${booking._id}`}>
                    <td>{booking.bookingId}</td>
                    <td>{formatDate(booking.date)}</td>
                    <td>{booking.time}</td>
                    <td>{booking.customer?.fullName || "—"}</td>
                    <td>{booking.customer?.mobile || "—"}</td>
                    <td>{booking.customer?.email || "—"}</td>
                    <td>{booking.serviceName || "—"}</td>
                    <td>{booking.consultantName || "Unassigned"}</td>
                    <td>{booking.mode === "video" ? "Video" : "Voice"}</td>
                    <td>{formatAmount(booking.price, booking.currency)}</td>
                    <td>{statusLabel(booking.paymentStatus)}</td>
                    <td>{statusLabel(booking.status)}</td>
                    <td>{booking.refundStatus || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ==========================================
          BOOKING DETAIL PANEL
      ========================================== */}

      {showDetails &&
        selectedBooking && (
          <div
            className="admin-booking-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeBooking();
              }
            }}
          >

            <aside className="admin-booking-detail">

              {/* ==================================
                  DETAIL HEADER
              ================================== */}

              <div className="admin-booking-detail-header">

                <div>

                  <span>
                    BOOKING
                  </span>

                  <h2>
                    {
                      selectedBooking.bookingId
                    }
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    closeBooking
                  }
                  aria-label="Close"
                >
                  ×
                </button>

              </div>

              <div className="admin-booking-detail-body">

                {/* ==================================
                    SUMMARY
                ================================== */}

                <div className="admin-detail-summary">

                  <span>
                    {
                      selectedBooking.category
                    }
                  </span>

                  <h3>
                    {
                      selectedBooking
                        .serviceName
                    }
                  </h3>

                  <strong>
                    {formatAmount(
                      selectedBooking.price,
                      selectedBooking.currency
                    )}
                  </strong>

                </div>

                {/* ==================================
                    CONSULTATION
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Consultation
                  </div>

                  <div className="admin-detail-grid">

                    <DetailItem
                      label="Date"
                      value={formatDate(
                        selectedBooking.date
                      )}
                    />

                    <DetailItem
                      label="Time"
                      value={
                        selectedBooking.time
                      }
                    />

                    <DetailItem
                      label="Mode"
                      value={
                        selectedBooking.mode ===
                        "video"
                          ? "Video Consultation"
                          : "Voice Consultation"
                      }
                    />

                    <DetailItem
                      label="Consultant"
                      value={
                        selectedBooking
                          .consultantName ||
                        "To be assigned"
                      }
                    />

                  </div>

                </div>

                {/* ==================================
                    ASSIGN CONSULTANT
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Assign Consultant
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "12px",
                    }}
                  >

                    {consultantsLoading ? (
                      <p>
                        Loading consultants...
                      </p>
                    ) : consultantsError ? (
                      <>
                        <p
                          style={{
                            color:
                              "#b42318",
                          }}
                        >
                          {
                            consultantsError
                          }
                        </p>

                        <button
                          type="button"
                          className="admin-booking-view"
                          onClick={
                            loadConsultants
                          }
                        >
                          Try Again →
                        </button>
                      </>
                    ) : consultants.length ===
                      0 ? (
                      <p>
                        No consultants
                        have been added
                        yet.
                      </p>
                    ) : (
                      <>
                        <select
                          value={
                            selectedConsultantId
                          }
                          onChange={(
                            event
                          ) =>
                            setSelectedConsultantId(
                              event.target
                                .value
                            )
                          }
                          style={{
                            width:
                              "100%",
                            padding:
                              "12px 14px",
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "8px",
                            fontSize:
                              "15px",
                            background:
                              "#fff",
                          }}
                        >

                          <option value="">
                            Select a consultant
                          </option>

                          {consultants
                            .filter(
                              (
                                consultant
                              ) =>
                                consultant.active
                            )
                            .map(
                              (
                                consultant
                              ) => (
                                <option
                                  key={
                                    consultant._id
                                  }
                                  value={
                                    consultant._id
                                  }
                                >
                                  {
                                    consultant.name
                                  }{" "}
                                  —{" "}
                                  {
                                    consultant.specialization
                                  }
                                </option>
                              )
                            )}

                        </select>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={
                            assignConsultant
                          }
                          disabled={
                            assigningConsultant ||
                            !selectedConsultantId ||
                            selectedBooking.status ===
                              "cancelled"
                          }
                        >
                          {assigningConsultant
                            ? "Assigning..."
                            : selectedBooking.consultantId
                            ? "Update Consultant →"
                            : "Assign Consultant →"}
                        </button>

                      </>
                    )}

                    {assignmentMessage && (
                      <div
                        style={{
                          padding:
                            "12px 14px",
                          borderRadius:
                            "8px",
                          background:
                            assignmentMessage.includes(
                              "successfully"
                            )
                              ? "#eefbf3"
                              : "#fff1f1",
                          color:
                            assignmentMessage.includes(
                              "successfully"
                            )
                              ? "#137333"
                              : "#b42318",
                        }}
                      >
                        {
                          assignmentMessage
                        }
                      </div>
                    )}

                  </div>

                </div>

                {/* ==================================
                    BOOKING STATUS
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Booking Status
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "12px",
                    }}
                  >

                    <select
                      value={
                        selectedStatus
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedStatus(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        selectedBooking.status ===
                        "cancelled"
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "12px 14px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        fontSize:
                          "15px",
                        background:
                          "#fff",
                      }}
                    >

                      <option value="payment_pending">
                        Payment Pending
                      </option>

                      <option value="paid">
                        Paid
                      </option>

                      <option value="confirmed">
                        Confirmed
                      </option>

                      <option value="consultant_assigned">
                        Consultant Assigned
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="cancelled">
                        Cancelled
                      </option>

                    </select>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={
                        updateBookingStatus
                      }
                      disabled={
                        updatingStatus ||
                        !selectedStatus ||
                        selectedStatus ===
                          selectedBooking.status ||
                        selectedBooking.status ===
                          "cancelled"
                      }
                    >
                      {updatingStatus
                        ? "Updating..."
                        : "Update Status →"}
                    </button>

                    {statusMessage && (
                      <div
                        style={{
                          padding:
                            "12px 14px",
                          borderRadius:
                            "8px",
                          background:
                            statusMessage.includes(
                              "successfully"
                            )
                              ? "#eefbf3"
                              : "#fff1f1",
                          color:
                            statusMessage.includes(
                              "successfully"
                            )
                              ? "#137333"
                              : "#b42318",
                        }}
                      >
                        {
                          statusMessage
                        }
                      </div>
                    )}

                  </div>

                </div>

                {/* ==================================
                    REFUND PROCESSING
                ================================== */}

            {selectedBooking.refundStatus ===
            "pending" && (
            <div className="admin-detail-section">
                <div className="admin-detail-section-title">
                Refund Processing
                </div>

                <div
                style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "#fff8e8",
                    color: "#8a5a00",
                    fontSize: "14px",
                    lineHeight: 1.6,
                }}
                >
                <div
                    style={{
                    fontWeight: 600,
                    marginBottom: "6px",
                    }}
                >
                    Refund has been submitted successfully.
                </div>

                <div>
                    Razorpay is currently processing the
                    refund. This page is checking the refund
                    status automatically and will change to
                    <strong>Refunded</strong> when Razorpay
                    confirms the final refund status.
                </div>

                {selectedBooking.razorpayRefundId && (
                    <div
                    style={{
                        marginTop: "12px",
                        paddingTop: "10px",
                        borderTop: "1px solid #ead9ae",
                        fontSize: "13px",
                    }}
                    >
                    <strong>Razorpay Refund ID:</strong>{" "}
                    <span
                        style={{
                        fontFamily:
                            "monospace",
                        wordBreak:
                            "break-all",
                        }}
                    >
                        {selectedBooking.razorpayRefundId}
                    </span>
                    </div>
                )}

                <button
                  type="button"
                  onClick={reconcileRefund}
                  disabled={
                    reconcilingRefund ||
                    !selectedBooking.razorpayRefundId
                  }
                  style={{
                    marginTop: "14px",
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "8px",
                    border: "1px solid #c08a16",
                    background: "#fff",
                    color: "#8a5a00",
                    fontWeight: 600,
                    cursor:
                      reconcilingRefund ||
                      !selectedBooking.razorpayRefundId
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      reconcilingRefund ||
                      !selectedBooking.razorpayRefundId
                        ? 0.65
                        : 1,
                  }}
                >
                  {reconcilingRefund
                    ? "Syncing with Razorpay..."
                    : "Sync Refund Status with Razorpay →"}
                </button>
                </div>
            </div>
            )}


                  {refundPolling && (
                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "12px",
                        opacity: 0.8,
                      }}
                    >
                      Checking Razorpay refund status…
                    </div>
                  )}

            {selectedBooking.refundStatus ===
            "failed" && (
            <div className="admin-detail-section">
                <div className="admin-detail-section-title">
                Refund Failed
                </div>

                <div
                style={{
                    padding: "16px",
                    borderRadius: "8px",
                    background: "#fff1f1",
                    color: "#b42318",
                    fontSize: "14px",
                    lineHeight: 1.6,
                }}
                >
                <div
                    style={{
                    fontWeight: 600,
                    marginBottom: "6px",
                    }}
                >
                    Razorpay could not complete the refund.
                </div>

                <div>
                    The original payment remains paid.
                    You can review the issue and retry the
                    refund using the button below.
                </div>

                {selectedBooking.razorpayRefundId && (
                    <div
                    style={{
                        marginTop: "12px",
                        paddingTop: "10px",
                        borderTop:
                        "1px solid #f0caca",
                        fontSize: "13px",
                    }}
                    >
                    <strong>
                        Razorpay Refund ID:
                    </strong>{" "}
                    <span
                        style={{
                        fontFamily:
                            "monospace",
                        wordBreak:
                            "break-all",
                        }}
                    >
                        {selectedBooking.razorpayRefundId}
                    </span>
                    </div>
                )}
                </div>
            </div>
            )}

                {/* ==================================
                    CANCELLATION & REFUND
                ================================== */}

                {selectedBooking.paymentStatus ===
                  "paid" &&
                  selectedBooking.status !==
                    "completed" &&
                  selectedBooking.status !==
                    "cancelled" &&
                  selectedBooking.refundStatus !==
                    "pending" &&
                  selectedBooking.refundStatus !==
                    "processed" && (
                    <div className="admin-detail-section">

                      <div className="admin-detail-section-title">
                        Cancellation & Refund
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap: "12px",
                        }}
                      >

                        <p
                          style={{
                            margin: 0,
                            fontSize:
                              "14px",
                            lineHeight:
                              1.6,
                            color:
                              selectedBooking.refundStatus ===
                              "failed"
                                ? "#b42318"
                                : "#666",
                          }}
                        >
                          {selectedBooking.refundStatus ===
                          "failed"
                            ? "The previous refund attempt failed. You can safely retry the full refund."
                            : "Cancelling this booking will issue a full refund of "}
                          {selectedBooking.refundStatus !==
                            "failed" && (
                            <>
                              <strong>
                                {formatAmount(
                                  selectedBooking.price,
                                  selectedBooking.currency
                                )}
                              </strong>{" "}
                              to the customer through Razorpay.
                            </>
                          )}
                        </p>

                     {selectedBooking.refundStatus !== "pending" &&
  selectedBooking.refundStatus !== "processed" &&
  selectedBooking.status !== "cancelled" &&
  selectedBooking.status !== "completed" && (
    <button
      type="button"
      className="btn btn-primary"
      onClick={refundBooking}
      disabled={refunding}
      style={{
        background: "#b42318",
        borderColor: "#b42318",
      }}
    >
      {refunding
        ? "Processing Refund..."
        : selectedBooking.refundStatus ===
          "failed"
        ? "Retry Refund →"
        : "Cancel & Refund Booking →"}
    </button>
  )}

                        {refundMessage && (
                          <div
                            style={{
                              padding:
                                "12px 14px",
                              borderRadius:
                                "8px",
                              background:
                                refundMessage.includes(
                                  "successfully"
                                )
                                  ? "#eefbf3"
                                  : "#fff1f1",
                              color:
                                refundMessage.includes(
                                  "successfully"
                                )
                                  ? "#137333"
                                  : "#b42318",
                            }}
                          >
                            {
                              refundMessage
                            }
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                {/* ==================================
                    REFUND RESULT
                ================================== */}

               {/* ==================================
    REFUND RESULT
================================== */}

        {(selectedBooking.refundStatus ===
        "processed" ||
        selectedBooking.paymentStatus ===
            "refunded") && (
        <div className="admin-detail-section">

            <div className="admin-detail-section-title">
            Refund
            </div>

            <div
            style={{
                padding: "16px",
                borderRadius: "8px",
                background: "#eefbf3",
                color: "#137333",
                fontSize: "14px",
                lineHeight: 1.6,
            }}
            >
            <div
                style={{
                fontWeight: 600,
                marginBottom: "6px",
                }}
            >
                Refund processed successfully.
            </div>

            <div>
                Razorpay has confirmed that the
                refund was successfully processed.
                This booking has been cancelled and
                the payment has been marked as refunded.
            </div>

            {selectedBooking.razorpayRefundId && (
                <div
                style={{
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop:
                    "1px solid #cce8d5",
                    fontSize: "13px",
                }}
                >
                <strong>
                    Razorpay Refund ID:
                </strong>{" "}
                <span
                    style={{
                    fontFamily:
                        "monospace",
                    wordBreak:
                        "break-all",
                    }}
                >
                    {selectedBooking.razorpayRefundId}
                </span>
                </div>
            )}
            </div>

        </div>
        )}
                {/* ==================================
                    CLIENT
                ==== ============================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Client
                  </div>

                  <div className="admin-detail-client">

                    <div className="admin-booking-avatar large">

                    {selectedBooking.customer?.fullName
                    ?.charAt(0)
                    ?.toUpperCase() || "C"}

                    </div>

                    <div>

                      <strong>
                        {
                          selectedBooking
                            .customer
                            .fullName
                        }
                      </strong>

                      <span>
                        {
                          selectedBooking
                            .customer
                            .email
                        }
                      </span>

                      <span>
                        {
                          selectedBooking
                            .customer
                            .mobile
                        }
                      </span>

                    </div>

                  </div>

                </div>

                {/* ==================================
                    BIRTH DETAILS
                ================================== */}

                {(selectedBooking.customer.dob ||
                  selectedBooking
                    .customer
                    .birthTime ||
                  selectedBooking
                    .customer
                    .birthPlace ||
                  selectedBooking
                    .customer
                    .gender) && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Birth Details
                    </div>

                    <div className="admin-detail-grid">

                      <DetailItem
                        label="Date of Birth"
                        value={
                          selectedBooking
                            .customer
                            .dob
                        }
                      />

                      <DetailItem
                        label="Birth Time"
                        value={
                          selectedBooking
                            .customer
                            .birthTime
                        }
                      />

                      <DetailItem
                        label="Birth Place"
                        value={
                          selectedBooking
                            .customer
                            .birthPlace
                        }
                      />

                      <DetailItem
                        label="Gender"
                        value={
                          selectedBooking
                            .customer
                            .gender
                        }
                      />

                    </div>

                  </div>
                )}

                {/* ==================================
                    CONSULTATION DETAILS
                ================================== */}

                {(selectedBooking.customer
                  .concern ||
                  selectedBooking
                    .customer
                    .language ||
                  selectedBooking
                    .customer
                    .currentName ||
                  selectedBooking
                    .customer
                    .tarotQuestion) && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Consultation Details
                    </div>

                    {selectedBooking.customer
                      .concern && (
                      <DetailText
                        label="Concern"
                        value={
                          selectedBooking
                            .customer
                            .concern
                        }
                      />
                    )}

                    {selectedBooking.customer
                      .language && (
                      <DetailText
                        label="Language"
                        value={
                          selectedBooking
                            .customer
                            .language
                        }
                      />
                    )}

                    {selectedBooking.customer
                      .currentName && (
                      <DetailText
                        label="Current Name"
                        value={
                          selectedBooking
                            .customer
                            .currentName
                        }
                      />
                    )}

                    {selectedBooking.customer
                      .tarotQuestion && (
                      <DetailText
                        label="Tarot Question"
                        value={
                          selectedBooking
                            .customer
                            .tarotQuestion
                        }
                      />
                    )}

                  </div>
                )}

                {/* ==================================
                    SECOND PERSON
                ================================== */}

                {selectedBooking.customer
                  .person2Name && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Additional Person
                    </div>

                    <div className="admin-detail-grid">

                      <DetailItem
                        label="Name"
                        value={
                          selectedBooking
                            .customer
                            .person2Name
                        }
                      />

                      <DetailItem
                        label="Date of Birth"
                        value={
                          selectedBooking
                            .customer
                            .person2Dob
                        }
                      />

                      <DetailItem
                        label="Birth Time"
                        value={
                          selectedBooking
                            .customer
                            .person2BirthTime
                        }
                      />

                      <DetailItem
                        label="Birth Place"
                        value={
                          selectedBooking
                            .customer
                            .person2BirthPlace
                        }
                      />

                    </div>

                  </div>
                )}

                {/* ==================================
                    PAYMENT
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Payment
                  </div>

                  <div className="admin-detail-payment">

                    <div>
                      <span>
                        Status
                      </span>

                      <strong>
                        {statusLabel(
                          selectedBooking
                            .paymentStatus
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Razorpay Order
                      </span>

                      <strong>
                        {
                          selectedBooking
                            .razorpayOrderId ||
                          "—"
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Razorpay Payment
                      </span>

                      <strong>
                        {
                          selectedBooking
                            .razorpayPaymentId ||
                          "—"
                        }
                      </strong>
                    </div>

                  </div>

                </div>

              </div>

            </aside>

          </div>
        )}

    </main>
  );
}

/* ============================================
   DETAIL HELPERS
============================================ */

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="admin-detail-item">

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}

function DetailText({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="admin-detail-text">

      <span>
        {label}
      </span>

      <p>
        {value || "—"}
      </p>

    </div>
  );
}