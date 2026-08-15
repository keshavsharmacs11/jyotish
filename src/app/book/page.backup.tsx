"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

import ServiceSelector from "@/components/booking/ServiceSelector";
import ConsultationModeSelector from "@/components/booking/ConsultationModeSelector";
import DateTimeSelector from "@/components/booking/DateTimeSelector";

import CustomerDetails, {
  CustomerFormData,
} from "@/components/booking/CustomerDetails";

import BookingSummary from "@/components/booking/BookingSummary";

import {
  Booking,
  BookingMode,
  Service,
} from "@/types/booking";

import { availability } from "@/data/availability";

const initialCustomerData: CustomerFormData = {
  fullName: "",
  dob: "",
  birthTime: "",
  birthPlace: "",
  gender: "",
  mobile: "",
  email: "",
  concern: "",
  language: "",
  currentName: "",
  person2Name: "",
  person2Dob: "",
  person2BirthTime: "",
  person2BirthPlace: "",
  tarotQuestion: "",
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookPage() {
  /*
   * ============================================
   * SERVICES FROM MONGODB
   * ============================================
   */

  const [services, setServices] = useState<Service[]>(
    []
  );

  const [servicesLoading, setServicesLoading] =
    useState(true);

  const [servicesError, setServicesError] =
    useState<string | null>(null);

  /*
   * ============================================
   * BOOKING STATE
   * ============================================
   */

  const [selectedServiceId, setSelectedServiceId] =
    useState<string | null>(null);

  const [selectedMode, setSelectedMode] =
    useState<BookingMode | null>(null);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [selectedTime, setSelectedTime] =
    useState<string | null>(null);

  const [customerData, setCustomerData] =
    useState<CustomerFormData>(
      initialCustomerData
    );

  const [showSummary, setShowSummary] =
    useState(false);

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const [paymentDetails, setPaymentDetails] =
    useState<{
      paymentId: string;
      orderId: string;
    } | null>(null);

  /*
   * ============================================
   * DATABASE BOOKING INFORMATION
   * ============================================
   *
   * These values now come from MongoDB.
   *
   * bookingMongoId:
   * MongoDB's internal _id.
   *
   * bookingId:
   * Customer-facing ID such as:
   *
   * AKJ-2026-781971
   */

  const [bookingMongoId, setBookingMongoId] =
    useState<string | null>(null);

  const [bookingId, setBookingId] =
    useState<string | null>(null);

  /*
   * Prevent duplicate booking creation while
   * the request is running.
   */

  const [creatingBooking, setCreatingBooking] =
    useState(false);

  /*
   * ============================================
   * LOAD SERVICES FROM MONGODB
   * ============================================
   */

  useEffect(() => {
    const loadServices = async () => {
      try {
        setServicesLoading(true);
        setServicesError(null);

        const response = await fetch(
          "/api/services",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load services."
          );
        }

        const mappedServices: Service[] =
          data.services.map(
            (service: any) => ({
              id: service.serviceId,

              name: service.name,

              category: service.category,

              description:
                service.description,

              duration:
                service.duration,

              price:
                service.price,

              consultantIds:
                service.consultantIds ?? [],

              availableModes:
                service.availableModes ?? [],

              active:
                service.active,
            })
          );

        setServices(mappedServices);

        console.log(
          "Services loaded from MongoDB:",
          mappedServices
        );
      } catch (error) {
        console.error(
          "SERVICE LOADING ERROR:",
          error
        );

        setServicesError(
          error instanceof Error
            ? error.message
            : "Unable to load services."
        );
      } finally {
        setServicesLoading(false);
      }
    };

    loadServices();
  }, []);

  /*
   * ============================================
   * SELECTED SERVICE
   * ============================================
   */

  const selectedService = services.find(
    (service) =>
      service.id === selectedServiceId
  );

  /*
   * ============================================
   * CUSTOMER DATA UPDATE
   * ============================================
   */

  const updateCustomerData = (
    field: keyof CustomerFormData,
    value: string
  ) => {
    setCustomerData((previous) => ({
      ...previous,
      [field]: value,
    }));

    /*
     * If customer information changes,
     * the current pending booking is no
     * longer guaranteed to represent the
     * current form.
     */

    setShowSummary(false);

    setBookingMongoId(null);
    setBookingId(null);
  };

  /*
   * ============================================
   * SERVICE CHANGE
   * ============================================
   */

  const resetBookingAfterServiceChange = (
    serviceId: string
  ) => {
    setSelectedServiceId(serviceId);

    setSelectedMode(null);
    setSelectedDate(null);
    setSelectedTime(null);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);

    setCustomerData(
      initialCustomerData
    );
  };

  /*
   * ============================================
   * MODE CHANGE
   * ============================================
   */

  const handleModeChange = (
    mode: BookingMode
  ) => {
    setSelectedMode(mode);

    setSelectedDate(null);
    setSelectedTime(null);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);
  };

  /*
   * ============================================
   * DATE CHANGE
   * ============================================
   */

  const handleDateChange = (
    date: string
  ) => {
    setSelectedDate(date);

    setSelectedTime(null);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);
  };

  /*
   * ============================================
   * TIME CHANGE
   * ============================================
   */

  const handleTimeChange = (
    time: string
  ) => {
    setSelectedTime(time);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);
  };

  /*
   * ============================================
   * CREATE BOOKING DATA
   * ============================================
   */

  const bookingData: Booking | null =
    selectedService &&
    selectedMode &&
    selectedDate &&
    selectedTime &&
    customerData.fullName &&
    customerData.mobile &&
    customerData.email
      ? {
          serviceId:
            selectedService.id,

          serviceName:
            selectedService.name,

          category:
            selectedService.category,

          mode:
            selectedMode,

          date:
            selectedDate,

          time:
            selectedTime,

          consultantName:
            "To be assigned",

          customer:
            customerData,

          /*
           * Current service price from MongoDB.
           *
           * The final authoritative price is
           * checked again by the server when
           * the booking is created.
           */

          price:
            selectedService.price ?? 0,

          currency:
            "INR",

          status:
            "payment_pending",

          paymentStatus:
            "pending",
        }
      : null;

  /*
   * ============================================
   * REVIEW BOOKING
   * ============================================
   */

  const handleProceedToSummary = () => {
    if (!bookingData) {
      return;
    }

    setShowSummary(true);

    console.log(
      "Booking Data:",
      bookingData
    );
  };

  /*
   * ============================================
   * CREATE DATABASE BOOKING
   * ============================================
   *
   * This is the new Stage 1B step.
   *
   * It creates the booking BEFORE Razorpay.
   *
   * The server gets the real price from
   * MongoDB.
   */

  const createDatabaseBooking =
    async (): Promise<{
      id: string;
      bookingId: string;
      price: number;
      currency: string;
    } | null> => {
      if (!bookingData) {
        return null;
      }

      /*
       * If a pending booking already exists
       * for this current booking attempt,
       * don't create another one.
       */

      if (
        bookingMongoId &&
        bookingId
      ) {
        return {
          id: bookingMongoId,
          bookingId,
          price: bookingData.price,
          currency: bookingData.currency,
        };
      }

      try {
        setCreatingBooking(true);

        const response =
          await fetch(
            "/api/bookings",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                serviceId:
                  bookingData.serviceId,

                mode:
                  bookingData.mode,

                date:
                  bookingData.date,

                time:
                  bookingData.time,

                customer:
                  bookingData.customer,

                /*
                 * userId is intentionally
                 * omitted for now.
                 *
                 * Guest booking.
                 *
                 * Later the logged-in user's
                 * account ID can be supplied.
                 */
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to create booking."
          );
        }

        if (
          !data.booking?.id ||
          !data.booking?.bookingId
        ) {
          throw new Error(
            "Booking was created but the booking ID was not returned."
          );
        }

        /*
         * Store MongoDB IDs in React state.
         */

        setBookingMongoId(
          data.booking.id
        );

        setBookingId(
          data.booking.bookingId
        );

        console.log(
          "Database booking created:",
          data.booking
        );

        return {
          id:
            data.booking.id,

          bookingId:
            data.booking.bookingId,

          price:
            data.booking.price,

          currency:
            data.booking.currency,
        };
      } catch (error) {
        console.error(
          "DATABASE BOOKING ERROR:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Unable to create booking."
        );

        return null;
      } finally {
        setCreatingBooking(false);
      }
    };

  /*
   * ============================================
   * RAZORPAY PAYMENT
   * ============================================
   */

  const handleProceedToPayment =
    async () => {
      if (!bookingData) {
        return;
      }

      /*
       * Prevent accidental double-click.
       */

      if (creatingBooking) {
        return;
      }

      try {
        /*
         * Make sure Razorpay Checkout
         * script has loaded.
         */

        if (!window.Razorpay) {
          alert(
            "Razorpay is still loading. Please try again."
          );

          return;
        }

        /*
         * ========================================
         * STEP 1
         * CREATE PENDING BOOKING IN MONGODB
         * ========================================
         */

        const databaseBooking =
          await createDatabaseBooking();

        if (!databaseBooking) {
          return;
        }

        /*
         * ========================================
         * STEP 2
         * CHECK PAYMENT AMOUNT
         * ========================================
         *
         * The amount returned here comes from
         * MongoDB through /api/bookings.
         */

        if (
          !databaseBooking.price ||
          databaseBooking.price <= 0
        ) {
          alert(
            "Payment amount is not configured for this service."
          );

          return;
        }

        /*
         * ========================================
         * STEP 3
         * CREATE RAZORPAY ORDER
         * ========================================
         */

        const response =
          await fetch(
            "/api/payment/create-order",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                /*
                 * We now pass the database
                 * customer-facing booking ID.
                 *
                 * The server will use this in
                 * the next payment/database step.
                 */

                bookingId:
                  databaseBooking.bookingId,

                serviceId:
                  bookingData.serviceId,

                serviceName:
                  bookingData.serviceName,

                amount:
                  databaseBooking.price,

                currency:
                  databaseBooking.currency,

                customerName:
                  bookingData.customer
                    .fullName,

                customerEmail:
                  bookingData.customer
                    .email,

                customerPhone:
                  bookingData.customer
                    .mobile,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to create payment order."
          );
        }

        /*
         * ========================================
         * STEP 4
         * RAZORPAY CHECKOUT
         * ========================================
         */

        const options = {
          key: data.keyId,

          amount:
            data.amount,

          currency:
            data.currency,

          name:
            "Akshaanshh Jyotish",

          description:
            bookingData.serviceName,

          order_id:
            data.orderId,

          prefill: {
            name:
              bookingData.customer
                .fullName,

            email:
              bookingData.customer
                .email,

            contact:
              bookingData.customer
                .mobile,
          },

          notes: {
            bookingId:
              databaseBooking.bookingId,

            serviceId:
              bookingData.serviceId,

            date:
              bookingData.date,

            time:
              bookingData.time,

            mode:
              bookingData.mode,
          },

          theme: {
            color: "#d6a63b",
          },

          /*
           * ====================================
           * PAYMENT SUCCESS
           * ====================================
           *
           * IMPORTANT:
           *
           * We are NOT updating MongoDB here yet.
           *
           * That will happen in Stage 2 when
           * /api/payment/verify is updated.
           */

          handler:
            async function (
              razorpayResponse: any
            ) {
              try {
                console.log(
                  "Razorpay payment response:",
                  razorpayResponse
                );

                /*
                 * Verify payment on server.
                 *
                 * Stage 2 will also update:
                 *
                 * Payment
                 * Booking
                 *
                 * in MongoDB.
                 */

                const verifyResponse =
                  await fetch(
                    "/api/payment/verify",
                    {
                      method: "POST",

                      headers: {
                        "Content-Type":
                          "application/json",
                      },

                      body: JSON.stringify({
                        razorpay_order_id:
                          razorpayResponse.razorpay_order_id,

                        razorpay_payment_id:
                          razorpayResponse.razorpay_payment_id,

                        razorpay_signature:
                          razorpayResponse.razorpay_signature,

                        /*
                         * We pass the booking ID
                         * so Stage 2 can connect
                         * payment → booking.
                         */

                        bookingId:
                          databaseBooking.bookingId,
                      }),
                    }
                  );

                const verification =
                  await verifyResponse.json();

                if (
                  !verifyResponse.ok ||
                  !verification.verified
                ) {
                  throw new Error(
                    verification.error ||
                      "Payment verification failed."
                  );
                }

                console.log(
                  "Payment verified successfully:",
                  verification
                );

                /*
                 * Store payment details for
                 * the current confirmation UI.
                 */

                setPaymentDetails({
                  paymentId:
                    verification.paymentId,

                  orderId:
                    verification.orderId,
                });

                /*
                 * IMPORTANT:
                 *
                 * Booking ID now comes from
                 * MongoDB.
                 */

                setBookingId(
                  databaseBooking.bookingId
                );

                /*
                 * Show confirmation screen.
                 *
                 * Stage 2 will make sure the
                 * database itself is also marked
                 * paid/confirmed.
                 */

                setPaymentSuccess(true);

                setShowSummary(false);
              } catch (error) {
                console.error(
                  "Payment verification error:",
                  error
                );

                alert(
                  error instanceof Error
                    ? error.message
                    : "Payment verification failed."
                );
              }
            },
        };

        /*
         * ========================================
         * CREATE RAZORPAY INSTANCE
         * ========================================
         */

        const razorpay =
          new window.Razorpay(
            options
          );

        /*
         * ========================================
         * PAYMENT FAILURE
         * ========================================
         *
         * Stage 2 will update the pending
         * database booking/payment status.
         */

          razorpay.on(
          "payment.failed",
          async function (response: any) {
            console.error(
              "Razorpay payment failed:",
              response
            );

            try {
              const orderId =
                response?.error?.metadata?.order_id;

              const paymentId =
                response?.error?.metadata?.payment_id;

              if (orderId) {
                await fetch(
                  "/api/payment/failed",
                  {
                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body: JSON.stringify({
                      bookingId:
                        databaseBooking.bookingId,

                      razorpayOrderId:
                        orderId,

                      razorpayPaymentId:
                        paymentId || "",
                    }),
                  }
                );
              }
            } catch (error) {
              console.error(
                "Unable to update failed payment:",
                error
              );
            }

            alert(
              response?.error?.description ||
                "Payment failed. Please try again."
            );
          }
          );

        /*
         * ========================================
         * OPEN RAZORPAY
         * ========================================
         */

        razorpay.open();
      } catch (error) {
        console.error(
          "Payment error:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Unable to start payment."
        );
      }
    };

  /*
   * ============================================
   * PAYMENT SUCCESS / CONFIRMATION SCREEN
   * ============================================
   */

  if (
    paymentSuccess &&
    bookingData &&
    paymentDetails &&
    bookingId
  ) {
    const formattedDate =
      new Date(
        `${bookingData.date}T00:00:00`
      ).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );

    const formattedMode =
      bookingData.mode === "video"
        ? "Video Call"
        : "Voice Call";

    return (
      <>
        <PageHero
          eyebrow="BOOKING CONFIRMED"
          title="Your Consultation Is Confirmed"
          description="Your payment has been successfully verified and your consultation booking has been received."
        />

        <section className="section">
          <div className="site-container">
            <div className="booking-summary">
              <div className="booking-summary-card">

                {/* SUCCESS HEADER */}

                <div className="booking-header">
                  <p className="eyebrow">
                    PAYMENT SUCCESSFUL
                  </p>

                  <h2 className="section-heading">
                    Thank You,{" "}
                    {
                      bookingData
                        .customer
                        .fullName
                    }
                  </h2>

                  <p className="section-description">
                    Your consultation has
                    been successfully booked.
                  </p>
                </div>

                <div className="booking-summary-divider" />

                {/* BOOKING INFORMATION */}

                <div className="booking-summary-grid">
                  <div className="booking-summary-item">
                    <span>
                      Booking ID
                    </span>

                    <strong>
                      {bookingId}
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      Booking Status
                    </span>

                    <strong>
                      Confirmed
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      Payment Status
                    </span>

                    <strong>
                      Paid
                    </strong>
                  </div>
                </div>

                <div className="booking-summary-divider" />

                {/* CONSULTATION */}

                <div className="booking-summary-section">
                  <p className="booking-summary-label">
                    Consultation
                  </p>

                  <h3 className="booking-summary-service">
                    {
                      bookingData
                        .serviceName
                    }
                  </h3>
                </div>

                <div className="booking-summary-divider" />

                <div className="booking-summary-grid">
                  <div className="booking-summary-item">
                    <span>
                      Consultation Mode
                    </span>

                    <strong>
                      {formattedMode}
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      Consultant
                    </span>

                    <strong>
                      {
                        bookingData
                          .consultantName ||
                        "To be assigned"
                      }
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      Date
                    </span>

                    <strong>
                      {formattedDate}
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      Time
                    </span>

                    <strong>
                      {bookingData.time}
                    </strong>
                  </div>
                </div>

                <div className="booking-summary-divider" />

                {/* CUSTOMER */}

                <div className="booking-summary-section">
                  <p className="booking-summary-label">
                    Customer
                  </p>

                  <div className="booking-summary-customer">
                    <strong>
                      {
                        bookingData
                          .customer
                          .fullName
                      }
                    </strong>

                    <span>
                      {
                        bookingData
                          .customer
                          .mobile
                      }
                    </span>

                    <span>
                      {
                        bookingData
                          .customer
                          .email
                      }
                    </span>
                  </div>
                </div>

                <div className="booking-summary-divider" />

                {/* PAYMENT */}

                <div className="booking-summary-price">
                  <span>
                    Amount Paid
                  </span>

                  <strong>
                    ₹
                    {bookingData.price.toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <div className="booking-summary-divider" />

                <div className="booking-summary-grid">
                  <div className="booking-summary-item">
                    <span>
                      Razorpay Payment ID
                    </span>

                    <strong>
                      {
                        paymentDetails
                          .paymentId
                      }
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      Razorpay Order ID
                    </span>

                    <strong>
                      {
                        paymentDetails
                          .orderId
                      }
                    </strong>
                  </div>
                </div>

                <div className="booking-summary-divider" />

                {/* ACCOUNT */}

                <div
                  className="booking-header"
                  style={{
                    marginTop: "32px",
                    marginBottom: "20px",
                  }}
                >
                  <p className="eyebrow">
                    MANAGE YOUR BOOKING
                  </p>

                  <h3 className="section-heading">
                    Create your account to
                    manage your booking
                  </h3>

                  <p className="section-description">
                    Create an account using
                    the same email address
                    used for this booking.
                    Your booking will be
                    linked to your account
                    so you can check its
                    status later.
                  </p>
                </div>

                {/* ACCOUNT ACTIONS */}

                <div
                  className="booking-next"
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                    marginTop: "24px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const email =
                        bookingData
                          .customer
                          .email;

                      window.location.href =
                        `/account/create?email=${encodeURIComponent(
                          email
                        )}&bookingId=${encodeURIComponent(
                          bookingId
                        )}`;
                    }}
                  >
                    Create Account →
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      window.location.href =
                        "/";
                    }}
                  >
                    Maybe Later
                  </button>
                </div>

                {/* HOME */}

                <div
                  className="booking-next"
                  style={{
                    marginTop: "32px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      window.location.href =
                        "/";
                    }}
                  >
                    Back to Home
                  </button>
                </div>

              </div>
            </div>
          </div>
        </section>

        <Footer />
      </>
    );
  }

  /*
   * ============================================
   * NORMAL BOOKING PAGE
   * ============================================
   */

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <PageHero
        eyebrow="BOOK CONSULTATION"
        title="Choose Your Consultation"
        description="Select the consultation that best matches your needs. You will be able to choose your consultation mode, date and available time slot in the next steps."
      />

      <section className="section">
        <div className="site-container">

          {/* STEP 1 */}

          <div className="booking-header">
            <p className="eyebrow">
              STEP 1
            </p>

            <h2 className="section-heading">
              Select a Service
            </h2>

            <p className="section-description">
              Choose the consultation you would
              like to book.
            </p>
          </div>

          {/* SERVICE LOADING */}

          {servicesLoading && (
            <div className="booking-header">
              <p className="section-description">
                Loading available consultations...
              </p>
            </div>
          )}

          {/* SERVICE ERROR */}

          {!servicesLoading &&
            servicesError && (
              <div className="booking-header">
                <p className="section-description">
                  Unable to load consultations.
                </p>

                <p className="section-description">
                  {servicesError}
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  Try Again →
                </button>
              </div>
            )}

          {/* SERVICE SELECTOR */}

          {!servicesLoading &&
            !servicesError &&
            services.length > 0 && (
              <ServiceSelector
                services={services}
                selectedServiceId={
                  selectedServiceId
                }
                onSelect={
                  resetBookingAfterServiceChange
                }
              />
            )}

          {/* STEP 2 */}

          {selectedServiceId && (
            <div className="booking-step">
              <div className="booking-header">
                <p className="eyebrow">
                  STEP 2
                </p>

                <h2 className="section-heading">
                  Choose Consultation Mode
                </h2>

                <p className="section-description">
                  Select how you would like
                  to have your consultation.
                </p>
              </div>

              <ConsultationModeSelector
                selectedMode={
                  selectedMode
                }

                availableModes={
                  selectedService
                    ?.availableModes
                    ?.filter(
                      (
                        mode
                      ): mode is BookingMode =>
                        mode === "video" ||
                        mode === "voice"
                    ) ?? []
                }

                onSelect={
                  handleModeChange
                }
              />
            </div>
          )}

          {/* STEP 3 & 4 */}

          {selectedServiceId &&
            selectedMode && (
              <DateTimeSelector
                availability={
                  availability
                }

                selectedDate={
                  selectedDate
                }

                selectedTime={
                  selectedTime
                }

                onDateSelect={
                  handleDateChange
                }

                onTimeSelect={
                  handleTimeChange
                }
              />
            )}

          {/* STEP 5 */}

          {selectedServiceId &&
            selectedMode &&
            selectedDate &&
            selectedTime && (
              <CustomerDetails
                category={
                  selectedService?.category ??
                  "astrology"
                }

                formData={
                  customerData
                }

                onChange={
                  updateCustomerData
                }
              />
            )}

          {/* REVIEW BUTTON */}

          {selectedServiceId &&
            selectedMode &&
            selectedDate &&
            selectedTime &&
            customerData.fullName &&
            customerData.mobile &&
            customerData.email && (
              <div className="booking-next">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    handleProceedToSummary
                  }
                >
                  Review Booking →
                </button>
              </div>
            )}

          {/* STEP 6 */}

          {showSummary &&
            bookingData && (
              <BookingSummary
                booking={
                  bookingData
                }

                onProceedToPayment={
                  handleProceedToPayment
                }
              />
            )}

        </div>
      </section>

      <Footer />
    </>
  );
}