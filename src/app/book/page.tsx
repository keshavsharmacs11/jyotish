"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Script from "next/script";

import PageHero from "@/components/shared/PageHero";
import { useLanguage } from "@/context/LanguageContext";

import ServiceSelector from "@/components/booking/ServiceSelector";
import ConsultationModeSelector from "@/components/booking/ConsultationModeSelector";
import DateTimeSelector from "@/components/booking/DateTimeSelector";
import { isSlotInFutureIST } from "@/lib/bookingTime";

import CustomerDetails, {
  CustomerFormData,
  validateCustomerForm,
} from "@/components/booking/CustomerDetails";

import BookingSummary from "@/components/booking/BookingSummary";

import {
  Booking,
  BookingMode,
  Service,
} from "@/types/booking";

type ConsultantAvailability = {
  date: string;
  times: string[];
};

type ConsultantAvailabilityWindow = {
  date: string;
  startTime: string;
  endTime: string;
};

type ConsultantBlockedInterval = {
  date: string;
  startTime: string;
  endTime: string;
};

type AppointmentSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

type Consultant = {
  _id: string;
  name: string;
  specialization: string;
  availableModes: (
    | "video"
    | "voice"
  )[];
  availability: ConsultantAvailability[];
  availabilityWindows?: ConsultantAvailabilityWindow[];
  blockedIntervals?: ConsultantBlockedInterval[];
  active: boolean;
};

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

const BOOKING_POLICY_RETURN_KEY =
  "akshaanshh-jyotish:booking-policy-return";

const BOOKING_POLICY_RETURN_MAX_AGE_MS =
  2 * 60 * 60 * 1000;

type BookingPolicyReturnSnapshot = {
  version: 1;
  savedAt: number;
  selectedConsultantId: string | null;
  selectedServiceId: string | null;
  selectedMode: BookingMode | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customerData: CustomerFormData;
  policyAgreed: boolean;
  showSummary: boolean;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  /*
   * =========================================================
   * DATA
   * =========================================================
   */

  const [services, setServices] =
    useState<Service[]>([]);

  const [servicesLoading, setServicesLoading] =
    useState(true);

  const [servicesError, setServicesError] =
    useState<string | null>(null);

  const [consultants, setConsultants] =
    useState<Consultant[]>([]);

  const [consultantsLoading, setConsultantsLoading] =
    useState(false);

  const [consultantsError, setConsultantsError] =
    useState<string | null>(null);

  /*
   * =========================================================
   * BOOKING SELECTION
   * =========================================================
   */

  const [selectedConsultantId, setSelectedConsultantId] =
    useState<string | null>(null);

  const [selectedServiceId, setSelectedServiceId] =
    useState<string | null>(null);

  const [selectedMode, setSelectedMode] =
    useState<BookingMode | null>(null);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [selectedTime, setSelectedTime] =
    useState<string | null>(null);

  /*
   * Refresh the derived customer-facing slots as IST time moves forward.
   * This is intentionally separate from the consultant API refresh so an
   * already-open booking page also stops showing slots that have just passed.
   */
  const [bookingClockTick, setBookingClockTick] =
    useState(0);

  const [customerData, setCustomerData] =
    useState<CustomerFormData>(
      initialCustomerData
    );

  /*
   * =========================================================
   * UI FLOW
   * =========================================================
   */

  const [showSummary, setShowSummary] =
    useState(false);

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const [paymentStarting, setPaymentStarting] =
    useState(false);

  /*
   * Required policy consent.
   *
   * Keep the version explicit so future policy
   * updates can require a new agreement.
   */
  const POLICY_VERSION =
    "2026-08-21";

  const [policyAgreed, setPolicyAgreed] =
    useState(false);

  const [policyReturnRestoring, setPolicyReturnRestoring] =
    useState(true);

  const [policyReturnScrollPending, setPolicyReturnScrollPending] =
    useState(false);

  /*
   * =========================================================
   * POLICY RETURN STATE
   * =========================================================
   *
   * The legal links are part of the booking form. Save the current booking
   * selections before opening a policy page so the customer can come back
   * to the same booking stage instead of restarting from step 1.
   */

  const saveBookingStateForPolicyReturn = useCallback(
    () => {
      if (typeof window === "undefined") {
        return;
      }

      const snapshot: BookingPolicyReturnSnapshot = {
        version: 1,
        savedAt: Date.now(),
        selectedConsultantId,
        selectedServiceId,
        selectedMode,
        selectedDate,
        selectedTime,
        customerData,
        policyAgreed,
        showSummary,
      };

      try {
        window.sessionStorage.setItem(
          BOOKING_POLICY_RETURN_KEY,
          JSON.stringify(snapshot),
        );
      } catch (error) {
        console.warn(
          "BOOKING POLICY RETURN STATE COULD NOT BE SAVED",
          error,
        );
      }
    },
    [
      customerData,
      policyAgreed,
      selectedConsultantId,
      selectedDate,
      selectedMode,
      selectedServiceId,
      selectedTime,
      showSummary,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const shouldRestore =
      new URLSearchParams(window.location.search).get("return") ===
      "policy";

    if (!shouldRestore) {
      setPolicyReturnRestoring(false);
      setPolicyReturnScrollPending(false);
      return;
    }

    try {
      const raw = window.sessionStorage.getItem(
        BOOKING_POLICY_RETURN_KEY,
      );

      if (!raw) {
        setPolicyReturnRestoring(false);
        setPolicyReturnScrollPending(false);
        return;
      }

      const snapshot =
        JSON.parse(raw) as Partial<BookingPolicyReturnSnapshot>;

      if (snapshot.version !== 1) {
        window.sessionStorage.removeItem(BOOKING_POLICY_RETURN_KEY);
        setPolicyReturnRestoring(false);
        setPolicyReturnScrollPending(false);
        return;
      }

      if (
        typeof snapshot.savedAt !== "number" ||
        Date.now() - snapshot.savedAt >
          BOOKING_POLICY_RETURN_MAX_AGE_MS
      ) {
        window.sessionStorage.removeItem(BOOKING_POLICY_RETURN_KEY);
        setPolicyReturnRestoring(false);
        setPolicyReturnScrollPending(false);
        return;
      }

      // Keep the snapshot available until the restored booking has rendered
      // and passed the availability checks below.
      setSelectedConsultantId(
        snapshot.selectedConsultantId ?? null,
      );
      setSelectedServiceId(
        snapshot.selectedServiceId ?? null,
      );
      setSelectedMode(
        snapshot.selectedMode ?? null,
      );
      setSelectedDate(
        snapshot.selectedDate ?? null,
      );
      setSelectedTime(
        snapshot.selectedTime ?? null,
      );

      if (snapshot.customerData) {
        setCustomerData({
          ...initialCustomerData,
          ...snapshot.customerData,
        });
      }

      setPolicyAgreed(Boolean(snapshot.policyAgreed));
      setShowSummary(Boolean(snapshot.showSummary));

      // Payment state is intentionally not restored. The customer must review
      // the booking again before another payment attempt.
      setPaymentSuccess(false);
      setPaymentStarting(false);
      setPaymentDetails(null);
      setBookingMongoId(null);
      setBookingId(null);

      // Keep the restore guard active until the services/consultants have
      // loaded and the customer-details section is mounted. That prevents the
      // normal stale-selection checks from clearing the restored values too
      // early and lets us scroll directly to the details section.
      setPolicyReturnScrollPending(true);

      // Remove only the query flag now; the snapshot itself is consumed after
      // the booking data has been restored and validated.
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.hash}`
      );
    } catch (error) {
      try {
        window.sessionStorage.removeItem(
          BOOKING_POLICY_RETURN_KEY,
        );
      } catch {
        // Ignore cleanup failures.
      }

      setPolicyReturnRestoring(false);
      setPolicyReturnScrollPending(false);
      console.warn(
        "BOOKING POLICY RETURN STATE COULD NOT BE RESTORED",
        error,
      );
    }
  }, []);

  /*
   * =========================================================
   * CUSTOMER ACCOUNT STATUS
   * =========================================================
   *
   * This controls the post-payment experience.
   *
   * checking:
   *   We are still verifying the current session.
   *
   * authenticated:
   *   The customer already has a valid account session.
   *
   * guest:
   *   No customer session is active.
   *
   * unknown:
   *   The session endpoint failed unexpectedly.
   */

  const [
    accountStatus,
    setAccountStatus,
  ] = useState<
    "checking" |
    "authenticated" |
    "guest" |
    "unknown"
  >("checking");

  /*
   * Interaction locks.
   *
   * These prevent rapid repeated clicks from
   * starting multiple async operations.
   */

  const paymentLockRef =
    useRef(false);

  /*
   * =========================================================
   * PAYMENT DETAILS
   * =========================================================
   */

  const [paymentDetails, setPaymentDetails] =
    useState<{
      paymentId: string;
      orderId: string;
    } | null>(null);

  /*
   * =========================================================
   * DATABASE BOOKING INFORMATION
   * =========================================================
   */

  const [bookingMongoId, setBookingMongoId] =
    useState<string | null>(null);

  const [bookingId, setBookingId] =
    useState<string | null>(null);

  const [creatingBooking, setCreatingBooking] =
    useState(false);

  /*
   * =========================================================
   * SECTION REFS
   * =========================================================
   *
   * These control the guided booking experience.
   */

  const servicesRef =
    useRef<HTMLDivElement | null>(null);

  const modeRef =
    useRef<HTMLDivElement | null>(null);

  const consultantRef =
    useRef<HTMLDivElement | null>(null);

  const dateTimeRef =
    useRef<HTMLDivElement | null>(null);

  const customerRef =
    useRef<HTMLDivElement | null>(null);

  const summaryRef =
    useRef<HTMLDivElement | null>(null);

  const successRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * =========================================================
   * SCROLL HELPER
   * =========================================================
   */

  const scrollToSection = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }

      const headerOffset = 96;

      const targetTop =
        element.getBoundingClientRect().top +
        window.scrollY -
        headerOffset;

      window.scrollTo({
        top: Math.max(
          0,
          targetTop
        ),
        behavior: "smooth",
      });
    },
    []
  );

  /*
   * =========================================================
   * GUIDED BOOKING SCROLL
   * =========================================================
   *
   * Scroll only AFTER React has rendered the newly
   * unlocked step. This avoids trying to scroll to a
   * section before its DOM node exists.
   */

  useEffect(() => {
    if (
      policyReturnRestoring ||
      !selectedServiceId ||
      selectedMode
    ) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        scrollToSection(modeRef.current);
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    policyReturnRestoring,
    selectedServiceId,
    selectedMode,
    scrollToSection,
  ]);

  useEffect(() => {
    if (
      policyReturnRestoring ||
      !selectedMode ||
      selectedConsultantId
    ) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        scrollToSection(
          consultantRef.current
        );
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    policyReturnRestoring,
    selectedMode,
    selectedConsultantId,
    scrollToSection,
  ]);

  useEffect(() => {
    if (
      policyReturnRestoring ||
      !selectedConsultantId ||
      selectedDate
    ) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        scrollToSection(
          dateTimeRef.current
        );
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    policyReturnRestoring,
    selectedConsultantId,
    selectedDate,
    scrollToSection,
  ]);

  useEffect(() => {
    if (
      policyReturnRestoring ||
      !selectedTime ||
      !selectedConsultantId
    ) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        scrollToSection(
          customerRef.current
        );
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    policyReturnRestoring,
    selectedTime,
    selectedConsultantId,
    scrollToSection,
  ]);

  useEffect(() => {
    if (
      !policyReturnRestoring ||
      !policyReturnScrollPending
    ) {
      return;
    }

    if (
      servicesLoading ||
      consultantsLoading ||
      consultantsError
    ) {
      return;
    }

    if (
      !selectedServiceId ||
      !selectedMode ||
      !selectedConsultantId ||
      !selectedDate ||
      !selectedTime
    ) {
      return;
    }

    // During a policy return, suppress the normal guided-scroll effects above.
    // Then wait until the restored booking UI is fully mounted and perform one
    // deterministic scroll to STEP 5 / Your Details. This prevents the
    // consultant-card scroll from winning the race on the return navigation.
    let innerFrame = 0;
    let scrollTimer = 0;

    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        scrollTimer = window.setTimeout(() => {
          const target =
            customerRef.current ||
            document.getElementById(
              "booking-customer-details-heading",
            )?.parentElement;

          if (!target) {
            return;
          }

          const headerOffset = 104;
          const targetTop =
            target.getBoundingClientRect().top +
            window.scrollY -
            headerOffset;

          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: "smooth",
          });

          try {
            window.sessionStorage.removeItem(
              BOOKING_POLICY_RETURN_KEY,
            );
          } catch {
            // Ignore cleanup failures.
          }

          setPolicyReturnScrollPending(false);
          setPolicyReturnRestoring(false);
        }, 150);
      });
    });

    return () => {
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame) {
        window.cancelAnimationFrame(innerFrame);
      }
      if (scrollTimer) {
        window.clearTimeout(scrollTimer);
      }
    };
  }, [
    consultantsError,
    consultantsLoading,
    policyReturnRestoring,
    policyReturnScrollPending,
    scrollToSection,
    selectedConsultantId,
    selectedDate,
    selectedMode,
    selectedServiceId,
    selectedTime,
    servicesLoading,
  ]);

  /*
   * =========================================================
   * BOOKING STEP
   * =========================================================
   */

  const currentStep =
    paymentSuccess
      ? 7
      : showSummary
      ? 6
      : customerData.fullName &&
        customerData.mobile &&
        customerData.email &&
        selectedConsultantId &&
        selectedDate &&
        selectedTime
      ? 5
      : selectedTime &&
        selectedDate &&
        selectedConsultantId
      ? 4
      : selectedConsultantId
      ? 3
      : selectedServiceId &&
        selectedMode
      ? 2
      : 1;

  /*
   * =========================================================
   * LOAD CONSULTANTS
   * =========================================================
   */

  const consultantsRefreshInFlightRef =
    useRef(false);

  const loadConsultants = useCallback(
    async (silent = false) => {
      if (consultantsRefreshInFlightRef.current) {
        return;
      }

      consultantsRefreshInFlightRef.current = true;

      try {
        if (!silent) {
          setConsultantsLoading(true);
        }

        /*
         * A development server can temporarily drop a browser request while
         * Next.js is compiling/reloading. Treat that as a retryable transport
         * error instead of immediately showing an empty consultant state.
         *
         * This is safe because the request is a read-only GET.
         */
        let lastError: unknown = null;
        let loaded = false;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const response = await fetch(
              "/api/consultants",
              {
                method: "GET",
                cache: "no-store",
                credentials: "same-origin",
                headers: {
                  "Cache-Control": "no-cache",
                },
              }
            );

            const data = await response.json().catch(() => null);

            if (
              !response.ok ||
              !data?.success ||
              !Array.isArray(data.consultants)
            ) {
              throw new Error(
                data?.error ||
                  `Unable to load consultant availability (HTTP ${response.status}).`
              );
            }

            setConsultants(data.consultants);
            setConsultantsError(null);
            loaded = true;
            break;
          } catch (error) {
            lastError = error;

            if (attempt < 2) {
              await new Promise((resolve) =>
                window.setTimeout(
                  resolve,
                  400 * (attempt + 1)
                )
              );
            }
          }
        }

        if (!loaded) {
          /*
           * Never erase the last known-good consultant/availability state.
           * A refresh can fail temporarily while the server is compiling,
           * reconnecting, or the browser is changing visibility.
           */
          if (!silent) {
            setConsultantsError(
              lastError instanceof Error
                ? lastError.message
                : "Unable to load consultant availability."
            );
          } else if (process.env.NODE_ENV !== "production") {
            console.warn(
              "CONSULTANT AVAILABILITY REFRESH RETRY FAILED; KEEPING LAST KNOWN STATE.",
              lastError
            );
          }
        }
      } finally {
        consultantsRefreshInFlightRef.current = false;
        if (!silent) {
          setConsultantsLoading(false);
        }
      }
    },
    []
  );

  /*
   * =========================================================
   * LOAD SERVICES
   * =========================================================
   */

  useEffect(() => {
    const loadServices =
      async () => {
        try {
          setServicesLoading(true);
          setServicesError(null);

          const response =
            await fetch(
              "/api/services",
              {
                method: "GET",
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
                "Unable to load services."
            );
          }

          const mappedServices: Service[] =
            data.services.map(
              (service: any) => ({
                id:
                  service.serviceId,

                name:
                  service.name,

                category:
                  service.category,

                description:
                  service.description,

                duration:
                  service.duration,

                price:
                  service.price,

                consultantIds:
                  service.consultantIds ??
                  [],

                availableModes:
                  service.availableModes ??
                  [],

                active:
                  service.active,
              })
            );

          setServices(
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
   * =========================================================
   * LOAD CONSULTANTS ON PAGE LOAD
   * =========================================================
   *
   * IMPORTANT:
   * Keep consultant availability loading separate from
   * account-session checking. The booking page depends on
   * /api/consultants to populate the consultant list.
   */

  useEffect(() => {
    void loadConsultants(false);

    const refreshSilently = () => {
      void loadConsultants(true);
    };

    const intervalId = window.setInterval(
      refreshSilently,
      30_000
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSilently();
      }
    };

    window.addEventListener(
      "focus",
      refreshSilently
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "focus",
        refreshSilently
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadConsultants]);

  /*
   * Keep the local slot calculation time-aware while this page remains open.
   * The shared helper always compares against the current IST minute; this
   * timer only causes React to re-run the memoized calculation.
   */
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBookingClockTick((value) => value + 1);
    }, 15_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  /*
   * =========================================================
   * CHECK CUSTOMER ACCOUNT SESSION
   * =========================================================
   */

  useEffect(() => {
    let active = true;

    const checkCustomerSession =
      async () => {
        try {
          const response =
            await fetch(
              "/api/account/session",
              {
                method: "GET",
                cache: "no-store",
              }
            );

          /*
           * A 401 is an expected guest state.
           * Other non-OK responses are treated as
           * unknown so we never incorrectly show
           * "Create Account" because of a server error.
           */
          if (
            response.status ===
            401
          ) {
            if (active) {
              setAccountStatus(
                "guest"
              );
            }

            return;
          }

          const data =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            !response.ok
          ) {
            if (active) {
              setAccountStatus(
                "unknown"
              );
            }

            return;
          }

          /*
           * Support the current account/session
           * response shape without coupling the
           * booking page to one specific user object.
           */
          const authenticated =
            Boolean(
              data?.user?.id ||
              data?.user?._id ||
              data?.authenticated ===
                true ||
              data?.loggedIn ===
                true
            );

          if (active) {
            setAccountStatus(
              authenticated
                ? "authenticated"
                : "guest"
            );
          }
        } catch {
          if (active) {
            setAccountStatus(
              "unknown"
            );
          }
        }
      };

    checkCustomerSession();

    return () => {
      active = false;
    };
  }, []);

  /*
   * =========================================================
   * SELECTED SERVICE
   * =========================================================
   */

  const selectedService =
    services.find(
      (service) =>
        service.id ===
        selectedServiceId
    );

  /*
   * =========================================================
   * AVAILABLE CONSULTANTS
   * =========================================================
   */



  if (process.env.NODE_ENV !== "production") {
    console.debug(
      "BOOKING CONSULTANTS RESPONSE STATE:",
      {
        consultantsLoaded:
          consultants.length,
        consultantNames:
          consultants.map(
            (consultant) =>
              consultant.name
          ),
        consultantIds:
          consultants.map(
            (consultant) =>
              consultant._id
          ),
        consultantActiveStates:
          consultants.map(
            (consultant) =>
              consultant.active
          ),
        selectedMode,
        availableConsultants:
          consultants.filter(
            (consultant) => {
              if (!consultant.active) {
                return false;
              }

              if (selectedMode) {
                const normalizedSelectedMode =
                  String(selectedMode)
                    .trim()
                    .toLowerCase();

                const consultantSupportsMode =
                  (
                    consultant.availableModes ??
                    []
                  ).some(
                    (mode) =>
                      String(mode)
                        .trim()
                        .toLowerCase() ===
                      normalizedSelectedMode
                  );

                if (
                  !consultantSupportsMode
                ) {
                  return false;
                }
              }

              const configuredConsultantIds =
                selectedService
                  ?.consultantIds ?? [];

              if (
                configuredConsultantIds.length >
                0
              ) {
                return configuredConsultantIds
                  .map((id) =>
                    String(id).trim()
                  )
                  .includes(
                    String(
                      consultant._id
                    ).trim()
                  );
              }

              return true;
            }
          ).length,
      }
    );
  }

  const availableConsultants =
  consultants.filter(
    (consultant) => {
      /*
       * ============================================
       * ACTIVE CONSULTANT
       * ============================================
       */

      if (!consultant.active) {
        return false;
      }

      /*
       * ============================================
       * MODE MATCH
       * ============================================
       *
       * Normalize both values so accidental
       * capitalization/whitespace cannot make an
       * otherwise valid consultant disappear.
       */

      if (selectedMode) {
        const normalizedSelectedMode =
          String(
            selectedMode
          )
            .trim()
            .toLowerCase();

        const consultantSupportsMode =
          (
            consultant.availableModes ??
            []
          ).some(
            (mode) =>
              String(mode)
                .trim()
                .toLowerCase() ===
              normalizedSelectedMode
          );

        if (
          !consultantSupportsMode
        ) {
          return false;
        }
      }

      /*
       * ============================================
       * SERVICE → CONSULTANT RELATIONSHIP
       * ============================================
       *
       * Empty consultantIds means:
       * all active consultants are eligible.
       *
       * If IDs are configured, only those
       * consultants are eligible.
       */

      const configuredConsultantIds =
        selectedService
          ?.consultantIds ?? [];

      if (
        configuredConsultantIds.length >
        0
      ) {
        const normalizedConsultantId =
          consultant._id
            .toString()
            .trim();

        return configuredConsultantIds
          .map((id) =>
            String(id)
              .trim()
          )
          .includes(
            normalizedConsultantId
          );
      }

      return true;
    }
  );

  /*
   * =========================================================
   * CUSTOMER BOOKABLE SLOTS
   * =========================================================
   *
   * Availability windows are the source of truth for the
   * customer-facing calendar. Legacy availability remains a
   * compatibility fallback for older consultant records.
   *
   * Slots are generated in 15-minute increments, while the
   * selected service duration determines how much time each
   * appointment consumes.
   */

  const serviceDuration =
    selectedService?.duration &&
    selectedService.duration > 0
      ? selectedService.duration
      : 30;

  function toMinutes(time: string) {
    const [hour, minute] = String(time).split(":").map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }
    return hour * 60 + minute;
  }

  function toTime(minutes: number) {
    if (minutes >= 1440) return "24:00";
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }

  function overlaps(
    startA: number,
    endA: number,
    startB: number,
    endB: number,
  ) {
    return startA < endB && endA > startB;
  }

  const appointmentSlots =
    useMemo<AppointmentSlot[]>(
      () => {
        const slotMap = new Map<string, AppointmentSlot>();

        const consultantsForSlots = selectedConsultantId
          ? availableConsultants.filter(
              (consultant) =>
                consultant._id === selectedConsultantId
            )
          : [];

        for (const consultant of consultantsForSlots) {
          const rawWindows =
            Array.isArray(consultant.availabilityWindows) &&
            consultant.availabilityWindows.length > 0
              ? consultant.availabilityWindows
              : (consultant.availability ?? []).flatMap((item) =>
                  (item.times ?? []).map((time) => ({
                    date: item.date,
                    startTime: String(time),
                    endTime: (() => {
                      const start = toMinutes(String(time));
                      return start === null
                        ? String(time)
                        : toTime(Math.min(start + 15, 1440));
                    })(),
                  })),
                );

          const blocked = consultant.blockedIntervals ?? [];

          for (const window of rawWindows) {
            const windowStart = toMinutes(window.startTime);
            const windowEnd = toMinutes(window.endTime);
            if (
              windowStart === null ||
              windowEnd === null ||
              windowEnd <= windowStart
            ) {
              continue;
            }

            const latestStart = windowEnd - serviceDuration;
            for (
              let start = windowStart;
              start <= latestStart;
              start += serviceDuration
            ) {
              const startTime = toTime(start);
              const endTime = toTime(start + serviceDuration);

              if (!isSlotInFutureIST(window.date, startTime)) {
                continue;
              }

              const hasConflict = blocked.some((interval) => {
                if (String(interval.date) !== String(window.date)) {
                  return false;
                }

                const blockedStart = toMinutes(interval.startTime);
                const blockedEnd = toMinutes(interval.endTime);
                if (blockedStart === null || blockedEnd === null) {
                  return false;
                }

                return overlaps(
                  start,
                  start + serviceDuration,
                  blockedStart,
                  blockedEnd,
                );
              });

              if (hasConflict) {
                continue;
              }

              const key = `${window.date}|${startTime}`;
              if (!slotMap.has(key)) {
                slotMap.set(key, {
                  date: window.date,
                  startTime,
                  endTime,
                });
              }
            }
          }
        }

        return Array.from(slotMap.values()).sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.startTime.localeCompare(b.startTime),
        );
      },
      [
        availableConsultants,
        selectedConsultantId,
        serviceDuration,
        bookingClockTick,
      ],
    );

  const availableDates = useMemo(
    () => Array.from(new Set(appointmentSlots.map((slot) => slot.date))).sort(),
    [appointmentSlots],
  );

  const occupiedDates = useMemo(
    () => {
      if (!selectedConsultantId) {
        return [] as string[];
      }

      const consultant = consultants.find(
        (item) => item._id === selectedConsultantId
      );

      return Array.from(
        new Set(
          (consultant?.blockedIntervals ?? [])
            .map((interval) => String(interval.date).trim())
            .filter(Boolean)
        )
      ).sort();
    },
    [consultants, selectedConsultantId],
  );

  /*
   * A booking can remain on screen while another tab/admin session changes
   * the consultant or availability. Never allow stale client state to reach
   * payment; the API remains authoritative, and this effect provides an
   * immediate UX correction after the public consultant feed refreshes.
   */
  useEffect(() => {
    if (
      policyReturnRestoring ||
      servicesLoading ||
      consultantsLoading ||
      consultantsError
    ) {
      return;
    }

    if (
      selectedConsultantId &&
      !availableConsultants.some(
        (consultant) =>
          consultant._id === selectedConsultantId
      )
    ) {
      setSelectedConsultantId(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setShowSummary(false);
      setPaymentSuccess(false);
      setPaymentDetails(null);
      setBookingMongoId(null);
      setBookingId(null);
      setPolicyAgreed(false);
      return;
    }

    if (
      selectedDate &&
      selectedTime &&
      !appointmentSlots.some(
        (slot) =>
          slot.date === selectedDate &&
          slot.startTime === selectedTime
      )
    ) {
      setSelectedDate(null);
      setSelectedTime(null);
      setShowSummary(false);
      setPaymentSuccess(false);
      setPaymentDetails(null);
      setBookingMongoId(null);
      setBookingId(null);
      setPolicyAgreed(false);
    }
  }, [
    appointmentSlots,
    availableConsultants,
    consultantsError,
    consultantsLoading,
    policyReturnRestoring,
    selectedConsultantId,
    selectedDate,
    selectedTime,
    servicesLoading,
  ]);

  /*
   * =========================================================
   * FIND CONSULTANT FOR EXACT SLOT
   * =========================================================
   */

  const findConsultantForSlot = (
    date: string,
    time: string,
  ): Consultant | null => {
    return (
      availableConsultants.find((consultant) => {
        const windows =
          Array.isArray(consultant.availabilityWindows) &&
          consultant.availabilityWindows.length > 0
            ? consultant.availabilityWindows
            : [];

        const matchingWindow = windows.find((window) => {
          if (String(window.date) !== String(date)) return false;
          const start = toMinutes(window.startTime);
          const end = toMinutes(window.endTime);
          const selectedStart = toMinutes(time);
          if (
            start === null ||
            end === null ||
            selectedStart === null
          ) {
            return false;
          }
          return (
            selectedStart >= start &&
            selectedStart + serviceDuration <= end
          );
        });

        if (!matchingWindow) {
          // Legacy fallback for older consultant records.
          const legacy = consultant.availability?.find(
            (item) => item.date === date,
          );
          return legacy?.times?.includes(time) ?? false;
        }

        const blocked = consultant.blockedIntervals ?? [];
        const selectedStart = toMinutes(time);
        if (selectedStart === null) return false;

        return !blocked.some((interval) => {
          if (String(interval.date) !== String(date)) return false;
          const blockedStart = toMinutes(interval.startTime);
          const blockedEnd = toMinutes(interval.endTime);
          if (blockedStart === null || blockedEnd === null) return false;
          return overlaps(
            selectedStart,
            selectedStart + serviceDuration,
            blockedStart,
            blockedEnd,
          );
        });
      }) ?? null
    );
  };

  /*
   * =========================================================
   * SELECTED CONSULTANT
   * =========================================================
   */

  const selectedConsultant =
    selectedConsultantId
      ? consultants.find(
          (consultant) =>
            consultant._id ===
            selectedConsultantId
        ) ?? null
      : null;

  /*
   * =========================================================
   * CONSULTANT CHANGE
   * =========================================================
   */

  const handleConsultantChange = (
    consultantId: string
  ) => {
    const consultantIsEligible =
      availableConsultants.some(
        (consultant) =>
          consultant._id === consultantId
      );

    if (!consultantIsEligible) {
      return;
    }

    setSelectedConsultantId(
      consultantId
    );
    setSelectedDate(null);
    setSelectedTime(null);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);
    setPolicyAgreed(false);
  };

  /*
   * =========================================================
   * CUSTOMER DATA UPDATE
   * =========================================================
   */

  const updateCustomerData = (
    field: keyof CustomerFormData,
    value: string
  ) => {
    setCustomerData(
      (previous) => ({
        ...previous,
        [field]:
          value,
      })
    );

    setShowSummary(
      false
    );

    setBookingMongoId(
      null
    );

    setBookingId(
      null
    );

    setPaymentSuccess(
      false
    );

    setPaymentDetails(
      null
    );
  };

  /*
   * =========================================================
   * SERVICE CHANGE
   * =========================================================
   */

  const resetBookingAfterServiceChange = (
    serviceId: string
  ) => {
    setSelectedServiceId(
      serviceId
    );

    setSelectedMode(null);
    setSelectedConsultantId(null);
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
    setPolicyAgreed(false);
  };

  /*
   * =========================================================
   * MODE CHANGE
   * =========================================================
   */

  const handleModeChange = (
    mode: BookingMode
  ) => {
    setSelectedMode(mode);

    setSelectedConsultantId(null);
    setSelectedDate(null);
    setSelectedTime(null);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);
  };

  /*
   * =========================================================
   * DATE CHANGE
   * =========================================================
   */

  const handleDateChange = (
    date: string
  ) => {
    setSelectedDate(date);

    // Keep the consultant selected while the customer
    // changes dates. Availability is already scoped to
    // the selected consultant.
    setSelectedTime(null);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);
  };

  /*
   * =========================================================
   * TIME CHANGE
   * =========================================================
   */

  const handleTimeChange = (
    time: string
  ) => {
    if (!selectedDate || !selectedConsultantId) {
      return;
    }

    const consultant =
      consultants.find(
        (item) =>
          item._id ===
          selectedConsultantId
      );

    if (!consultant) {
      setSelectedTime(null);
      return;
    }

    const slotBelongsToSelectedConsultant =
      appointmentSlots.some(
        (slot) =>
          slot.date === selectedDate &&
          slot.startTime === time
      );

    if (!slotBelongsToSelectedConsultant) {
      setSelectedTime(null);
      return;
    }

    setSelectedTime(time);

    setShowSummary(false);
    setPaymentSuccess(false);
    setPaymentDetails(null);

    setBookingMongoId(null);
    setBookingId(null);

    setPolicyAgreed(false);
  };

  /*
   * =========================================================
   * BOOKING DATA
   * =========================================================
   */

  const bookingData:
    | Booking
    | null =
    selectedService &&
    selectedMode &&
    selectedDate &&
    selectedTime &&
    selectedConsultant &&
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
            selectedConsultant.name,

          customer:
            customerData,

          price:
            selectedService.price ??
            0,

          currency:
            "INR",

          status:
            "payment_pending",

          paymentStatus:
            "pending",
        }
      : null;

  /*
   * =========================================================
   * REVIEW
   * =========================================================
   */

  const handleProceedToSummary =
    () => {
      if (
        !bookingData ||
        !selectedConsultantId
      ) {
        return;
      }

      const category =
        (selectedService?.category ??
          "astrology") as
          | "astrology"
          | "numerology"
          | "tarot";

      const customerErrors =
        validateCustomerForm(
          category,
          customerData
        );

      if (
        Object.keys(
          customerErrors
        ).length > 0
      ) {
        return;
      }

      if (!policyAgreed) {
        return;
      }

      setShowSummary(true);
    };

  /*
   * =========================================================
   * CREATE DATABASE BOOKING
   * =========================================================
   */

  const createDatabaseBooking =
    async (): Promise<{
      id: string;
      bookingId: string;
      price: number;
      currency: string;
    } | null> => {
      if (
        !bookingData ||
        !selectedConsultantId ||
        !selectedConsultant
      ) {
        return null;
      }

      /*
       * Reuse the already-created booking
       * for the current attempt.
       */

      if (
        bookingMongoId &&
        bookingId
      ) {
        return {
          id:
            bookingMongoId,

          bookingId,

          price:
            bookingData.price,

          currency:
            bookingData.currency,
        };
      }

      try {
        setCreatingBooking(
          true
        );

        const currentConsultant =
          findConsultantForSlot(
            bookingData.date,
            bookingData.time
          );

        if (
          !currentConsultant ||
          currentConsultant._id !==
            selectedConsultantId
        ) {
          throw new Error(
            "The selected consultant is no longer available for this time slot. Please select another time."
          );
        }

        const response =
          await fetch(
            "/api/bookings",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  serviceId:
                    bookingData.serviceId,

                  mode:
                    bookingData.mode,

                  consultantId:
                    selectedConsultantId,

                  consultant:
                    selectedConsultant.name,

                  date:
                    bookingData.date,

                  time:
                    bookingData.time,

                  customer:
                    bookingData.customer,

                  policyConsent: {
                    agreed:
                      policyAgreed,

                    agreedAt:
                      policyAgreed
                        ? new Date().toISOString()
                        : null,

                    version:
                      POLICY_VERSION,
                  },
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

        setBookingMongoId(
          data.booking.id
        );

        setBookingId(
          data.booking.bookingId
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
        setCreatingBooking(
          false
        );
      }
    };

  /*
   * =========================================================
   * START PAYMENT
   * =========================================================
   */

  const handleProceedToPayment =
    async () => {
      if (
        !bookingData ||
        !selectedConsultantId ||
        !selectedConsultant
      ) {
        return;
      }

      /*
       * Strong duplicate-action lock.
       */

      if (
        creatingBooking ||
        paymentLockRef.current ||
        paymentStarting
      ) {
        return;
      }

      paymentLockRef.current =
        true;

      setPaymentStarting(
        true
      );

      try {
        if (
          !window.Razorpay
        ) {
          throw new Error(
            "Razorpay is still loading. Please try again."
          );
        }

        /*
         * =====================================
         * STEP 1
         * =====================================
         */

        const databaseBooking =
          await createDatabaseBooking();

        if (
          !databaseBooking
        ) {
          return;
        }

        /*
         * =====================================
         * STEP 2
         * =====================================
         */

        if (
          !databaseBooking.price ||
          databaseBooking.price <=
            0
        ) {
          throw new Error(
            "Payment amount is not configured for this service."
          );
        }

        /*
         * =====================================
         * STEP 3
         * =====================================
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

              body:
                JSON.stringify({
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

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Unable to create payment order."
          );
        }

        /*
         * =====================================
         * RAZORPAY CHECKOUT
         * =====================================
         */

        const options = {
          key:
            data.keyId,

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
              bookingData
                .customer
                .fullName,

            email:
              bookingData
                .customer
                .email,

            contact:
              bookingData
                .customer
                .mobile,
          },

          notes: {
            bookingId:
              databaseBooking.bookingId,

            serviceId:
              bookingData.serviceId,

            consultantId:
              selectedConsultantId,

            consultant:
              selectedConsultant.name,

            date:
              bookingData.date,

            time:
              bookingData.time,

            mode:
              bookingData.mode,
          },

          theme: {
            color:
              "#d6a63b",
          },

          /*
           * ===================================
           * SUCCESS
           * ===================================
           */

          handler:
            async function (
              razorpayResponse: any
            ) {
              try {
                const verifyResponse =
                  await fetch(
                    "/api/payment/verify",
                    {
                      method: "POST",

                      headers: {
                        "Content-Type":
                          "application/json",
                      },

                      body:
                        JSON.stringify({
                          razorpay_order_id:
                            razorpayResponse.razorpay_order_id,

                          razorpay_payment_id:
                            razorpayResponse.razorpay_payment_id,

                          razorpay_signature:
                            razorpayResponse.razorpay_signature,

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

                setPaymentDetails({
                  paymentId:
                    verification.paymentId,

                  orderId:
                    verification.orderId,
                });

                setBookingId(
                  databaseBooking.bookingId
                );

                setPaymentStarting(
                  false
                );

                paymentLockRef.current =
                  false;

                /*
                 * Send the customer a confirmation email
                 * containing the booking ID and tracking link.
                 * keepalive allows the request to continue while
                 * the browser navigates to the next page.
                 * Email delivery must never block or undo a
                 * successful payment.
                 */
                void fetch(
                  "/api/guest/booking/send-confirmation",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body: JSON.stringify({
                      bookingId:
                        databaseBooking.bookingId,
                    }),
                    keepalive: true,
                  }
                ).catch(() => {
                  console.warn(
                    "BOOKING CONFIRMATION EMAIL COULD NOT BE SENT"
                  );
                });

                /*
                 * ===================================
                 * POST-PAYMENT SUCCESS SCREEN
                 * ===================================
                 *
                 * Stay on the booking page after successful
                 * verification. The success screen below gives
                 * the customer explicit next-step choices instead
                 * of forcing an automatic redirect.
                 */
                setPaymentSuccess(true);

                return;
              } catch (error) {
                console.error(
                  "PAYMENT VERIFICATION ERROR:",
                  error
                );

                setPaymentStarting(
                  false
                );

                paymentLockRef.current =
                  false;

                alert(
                  error instanceof Error
                    ? error.message
                    : "Payment verification failed."
                );
              }
            },
        };

        const razorpay =
          new window.Razorpay(
            options
          );

        /*
         * ===================================
         * PAYMENT FAILURE
         * ===================================
         */

        razorpay.on(
          "payment.failed",
          async function (
            failureResponse: any
          ) {
            setPaymentStarting(
              false
            );

            paymentLockRef.current =
              false;

            console.error(
              "RAZORPAY PAYMENT FAILED:",
              failureResponse
            );

            try {
              const orderId =
                failureResponse
                  ?.error
                  ?.metadata
                  ?.order_id;

              const paymentId =
                failureResponse
                  ?.error
                  ?.metadata
                  ?.payment_id;

              if (
                orderId
              ) {
                await fetch(
                  "/api/payment/failed",
                  {
                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json",
                    },

                    body:
                      JSON.stringify({
                        bookingId:
                          databaseBooking.bookingId,

                        razorpayOrderId:
                          orderId,

                        razorpayPaymentId:
                          paymentId ||
                          "",
                      }),
                  }
                );
              }
            } catch (
              error
            ) {
              console.error(
                "FAILED PAYMENT UPDATE ERROR:",
                error
              );
            }

            alert(
              failureResponse
                ?.error
                ?.description ||
                "Payment failed. Your slot will become available again after the payment attempt is released."
            );
          }
        );

        /*
         * ===================================
         * CHECKOUT DISMISS
         * ===================================
         *
         * Closing Checkout is NOT treated as
         * a successful payment or a fake failure.
         *
         * The server-side SlotHold remains valid
         * until payment failure is reported or the
         * 15-minute hold expires.
         */

        razorpay.on(
          "modal.dismiss",
          () => {
            setPaymentStarting(
              false
            );

            paymentLockRef.current =
              false;
          }
        );

        razorpay.open();
      } catch (error) {
        console.error(
          "PAYMENT START ERROR:",
          error
        );

        setPaymentStarting(
          false
        );

        paymentLockRef.current =
          false;

        alert(
          error instanceof Error
            ? error.message
            : "Unable to start payment."
        );
      }
    };

  /*
   * =========================================================
   * SUCCESS SCROLL
   * =========================================================
   */

  useEffect(() => {
    if (!paymentSuccess) {
      return;
    }

    const frame =
      window.requestAnimationFrame(() => {
        scrollToSection(
          successRef.current
        );
      });

    return () =>
      window.cancelAnimationFrame(frame);
  }, [
    paymentSuccess,
    scrollToSection,
  ]);

  /*
   * =========================================================
   * SUCCESS SCREEN
   * =========================================================
   */

  if (
    paymentSuccess &&
    bookingData &&
    paymentDetails &&
    bookingId
  ) {
    const formattedDate =
      (() => {
        const [
          year,
          month,
          day,
        ] = bookingData.date
          .split("-")
          .map(Number);

        if (
          !year ||
          !month ||
          !day
        ) {
          return bookingData.date;
        }

        return new Intl.DateTimeFormat(
          "en-IN",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone:
              "Asia/Kolkata",
          }
        ).format(
          new Date(
            Date.UTC(
              year,
              month - 1,
              day,
              6
            )
          )
        );
      })();

    const formattedMode =
      bookingData.mode ===
      "video"
        ? (isHindi ? "वीडियो कॉल" : "Video Call")
        : (isHindi ? "वॉइस कॉल" : "Voice Call");

    return (
      <>
        <PageHero
          eyebrow={isHindi ? "बुकिंग की पुष्टि" : "BOOKING CONFIRMED"}
          title={isHindi ? "आपका परामर्श बुक हो गया है" : "Your Consultation Is Confirmed"}
          description={isHindi ? "आपका भुगतान सफलतापूर्वक सत्यापित हो गया है और आपका परामर्श बुकिंग अनुरोध प्राप्त हो गया है।" : "Your payment has been successfully verified and your consultation booking has been received."}
        />

        <section
          className="section"
          ref={
            successRef
          }
        >
          <div className="site-container">
            <div className="booking-summary">
              <div className="booking-summary-card">
                <div className="booking-header">
                  <p className="eyebrow">
                    {isHindi ? "भुगतान सफल" : "PAYMENT SUCCESSFUL"}
                  </p>

                  <h2 className="section-heading">
                    {isHindi ? "धन्यवाद," : "Thank You,"}{" "}
                    {
                      bookingData
                        .customer
                        .fullName
                    }
                  </h2>

                  <p className="section-description">
                    {isHindi ? "आपका परामर्श सफलतापूर्वक बुक हो गया है।" : "Your consultation has been successfully booked."}
                  </p>
                </div>

                <div className="booking-summary-divider" />

                <div className="booking-summary-grid">
                  <div className="booking-summary-item">
                    <span>
                      {isHindi ? "बुकिंग आईडी" : "Booking ID"}
                    </span>

                    <strong>
                      {bookingId}
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      {isHindi ? "बुकिंग स्थिति" : "Booking Status"}
                    </span>

                    <strong>
                      {isHindi ? "पुष्टि हो गई" : "Confirmed"}
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      {isHindi ? "भुगतान स्थिति" : "Payment Status"}
                    </span>

                    <strong>
                      {isHindi ? "भुगतान हो चुका है" : "Paid"}
                    </strong>
                  </div>
                </div>

                <div className="booking-summary-divider" />

                <div className="booking-summary-section">
                  <p className="booking-summary-label">
                    {isHindi ? "परामर्श" : "Consultation"}
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
                      {isHindi ? "परामर्श माध्यम" : "Consultation Mode"}
                    </span>

                    <strong>
                      {
                        formattedMode
                      }
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      {isHindi ? "विशेषज्ञ" : "Consultant"}
                    </span>

                    <strong>
                      {
                        bookingData
                          .consultantName
                      }
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      {isHindi ? "तारीख" : "Date"}
                    </span>

                    <strong>
                      {
                        formattedDate
                      }
                    </strong>
                  </div>

                  <div className="booking-summary-item">
                    <span>
                      {isHindi ? "समय (IST)" : "Time (IST)"}
                    </span>

                    <strong>
                      {
                        bookingData
                          .time
                      }
                    </strong>
                  </div>
                </div>

                <div className="booking-summary-divider" />

                <div className="booking-summary-section">
                  <p className="booking-summary-label">
                    {isHindi ? "ग्राहक" : "Customer"}
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

                <div className="booking-summary-price">
                  <span>
                    {isHindi ? "भुगतान की गई राशि" : "Amount Paid"}
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
                      {isHindi ? "Razorpay भुगतान आईडी" : "Razorpay Payment ID"}
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
                      {isHindi ? "Razorpay ऑर्डर आईडी" : "Razorpay Order ID"}
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

                <div className="booking-header">
                  <p className="eyebrow">
                    {isHindi ? "अगला कदम" : "NEXT STEP"}
                  </p>

                  <h3 className="section-heading">
                    {accountStatus ===
                    "authenticated"
                      ? (isHindi ? "आपकी बुकिंग तैयार है" : "Your Booking Is Ready")
                      : (isHindi ? "अपनी बुकिंग प्रबंधित करें" : "Manage Your Booking")}
                  </h3>

                  <p className="section-description">
                    {accountStatus ===
                    "authenticated"
                      ? (isHindi ? "आप पहले से साइन इन हैं। आपका पुष्टि किया गया परामर्श मेरी बुकिंग में उपलब्ध है।" : "You are already signed in. Your confirmed consultation is available in My Bookings.")
                      : accountStatus ===
                        "guest"
                      ? (isHindi ? "इस बुकिंग को बाद में प्रबंधित करने के लिए इसी ईमेल पते से खाता बनाएं।" : "Create an account using the same email address to manage this booking later.")
                      : accountStatus ===
                        "checking"
                      ? (isHindi ? "आपके खाते की स्थिति जांची जा रही है..." : "Checking your account status...")
                      : (isHindi ? "हम अभी आपके खाते की स्थिति सत्यापित नहीं कर सके। खाता बनाने से पहले आप फिर से जांच कर सकते हैं।" : "We could not verify your account status right now. You can retry the check before creating an account.")}
                  </p>
                </div>

                <div className="booking-next">
                  {accountStatus ===
                    "authenticated" && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        window.location.href =
                          "/my-bookings";
                      }}
                    >
                      {isHindi ? "मेरी बुकिंग देखें →" : "View My Bookings →"}
                    </button>
                  )}

                  {accountStatus ===
                    "guest" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          window.location.href =
                            `/account/create?email=${encodeURIComponent(
                              bookingData.customer.email
                            )}&bookingId=${encodeURIComponent(
                              bookingId || ""
                            )}`;
                        }}
                      >
                        {isHindi ? "खाता बनाएं" : "Create Account"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          window.location.href = "/";
                        }}
                      >
                        {isHindi ? "होम पर वापस जाएं" : "Back to Home"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          const query =
                            new URLSearchParams({
                              bookingId:
                                bookingId || "",
                              email:
                                bookingData.customer.email.trim(),
                            });

                          window.location.href =
                            `/track-booking?${query.toString()}`;
                        }}
                      >
                        {isHindi ? "मेरी बुकिंग ट्रैक करें →" : "Track My Booking →"}
                      </button>
                    </>
                  )}

                  {accountStatus ===
                    "checking" && (
                    <span
                      className="booking-form-help"
                      role="status"
                      aria-live="polite"
                    >
                      {isHindi ? "आपके खाते की पुष्टि की जा रही है..." : "Verifying your account..."}
                    </span>
                  )}

                  {accountStatus ===
                    "unknown" && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        window.location.reload();
                      }}
                    >
                      {isHindi ? "खाता जांचें" : "Retry Account Check"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      window.location.href =
                        "/";
                    }}
                  >
                    {isHindi ? "होम पर वापस जाएं" : "Back to Home"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  /*
   * =========================================================
   * NORMAL BOOKING PAGE
   * =========================================================
   */

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <PageHero
        eyebrow={isHindi ? "परामर्श बुक करें" : "BOOK CONSULTATION"}
        title={isHindi ? "अपना परामर्श चुनें" : "Choose Your Consultation"}
        description={isHindi ? "नीचे दिए गए चरणों का पालन करके अपनी सेवा, परामर्श माध्यम, तारीख, समय और विवरण चुनें।" : "Follow the guided steps below to choose your service, consultation mode, date, time and details."}
      />

      <section className="section">
        <div className="site-container">

          {/* =================================================
              STEP PROGRESS
          ================================================= */}

          <nav
            className="booking-flow-progress"
            aria-label={isHindi ? "बुकिंग प्रगति" : "Booking progress"}
          >
            {[
              ...(isHindi
                ? ["सेवा", "माध्यम", "विशेषज्ञ", "तारीख और समय", "विवरण", "समीक्षा", "भुगतान"]
                : ["Service", "Mode", "Consultant", "Date & Time", "Details", "Review", "Payment"]),
            ].map(
              (
                label,
                index
              ) => {
                const step =
                  index + 1;

                const active =
                  currentStep >=
                  step;

                return (
                  <div
                    key={label}
                    className={`booking-flow-progress-item ${
                      active
                        ? "is-active"
                        : ""
                    }`}
                  >
                    <span>
                      {step}
                    </span>

                    <small>
                      {label}
                    </small>
                  </div>
                );
              }
            )}
          </nav>

          {/* =================================================
              STEP 1 — SERVICES
          ================================================= */}

          <div
            ref={
              servicesRef
            }
            className="booking-flow-section"
            id="booking-services"
          >
            <div className="booking-header">
              <p className="eyebrow">
                {isHindi ? "चरण 1" : "STEP 1"}
              </p>

              <h2 className="section-heading">
                {isHindi ? "सेवा चुनें" : "Select a Service"}
              </h2>

              <p className="section-description">
                {isHindi ? "वह परामर्श चुनें जिसे आप बुक करना चाहते हैं।" : "Choose the consultation you would like to book."}
              </p>
            </div>

            {servicesLoading && (
              <div
                className="booking-loading"
                role="status"
                aria-live="polite"
              >
                {isHindi ? "उपलब्ध परामर्श लोड हो रहे हैं..." : "Loading available consultations..."}
              </div>
            )}

            {!servicesLoading &&
              servicesError && (
                <div
                  className="booking-error"
                  role="alert"
                >
                  <p>
                    {isHindi ? "परामर्श लोड नहीं हो सके।" : "Unable to load consultations."}
                  </p>

                  <p>
                    {servicesError}
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      window.location.reload()
                    }
                  >
                    {isHindi ? "फिर से प्रयास करें →" : "Try Again →"}
                  </button>
                </div>
              )}

            {!servicesLoading &&
              !servicesError &&
              services.length >
                0 && (
                <ServiceSelector
                  services={
                    services
                  }
                  selectedServiceId={
                    selectedServiceId
                  }
                  onSelect={
                    resetBookingAfterServiceChange
                  }
                />
              )}
          </div>

          {/* =================================================
              STEP 2 — MODE
          ================================================= */}

          {selectedServiceId && (
            <div
              ref={
                modeRef
              }
              className="booking-flow-section"
              id="booking-mode"
            >
              <div className="booking-header">
                <p className="eyebrow">
                  {isHindi ? "चरण 2" : "STEP 2"}
                </p>

                <h2 className="section-heading">
                  {isHindi ? "परामर्श का माध्यम चुनें" : "Choose Consultation Mode"}
                </h2>

                <p className="section-description">
                  {isHindi ? "चुनें कि आप अपना परामर्श किस माध्यम से लेना चाहते हैं।" : "Select how you would like to have your consultation."}
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
                        mode ===
                          "video" ||
                        mode ===
                          "voice"
                    ) ?? []
                }
                onSelect={
                  handleModeChange
                }
              />
            </div>
          )}

          {/* =================================================
              {isHindi ? "चरण 3 — विशेषज्ञ" : "STEP 3 — CONSULTANT"}
          ================================================= */}

          {selectedServiceId &&
            selectedMode && (
              <div
                ref={consultantRef}
                className="booking-flow-section"
                id="booking-consultant"
              >
                <div className="booking-header">
                  <p className="eyebrow">
                    {isHindi ? "चरण 3" : "STEP 3"}
                  </p>

                  <h2 className="section-heading">
                    {isHindi ? "अपना विशेषज्ञ चुनें" : "Choose Your Consultant"}
                  </h2>

                  <p className="section-description">
                    {isHindi ? "उस विशेषज्ञ को चुनें जिसके साथ आप अपना परामर्श लेना चाहते हैं।" : "Select the consultant you would like to have your consultation with."}
                  </p>
                </div>

                {consultantsLoading && (
                  <div
                    className="booking-loading"
                    role="status"
                    aria-live="polite"
                  >
                    {isHindi ? "विशेषज्ञ लोड हो रहे हैं..." : "Loading consultants..."}
                  </div>
                )}

                {!consultantsLoading &&
                  consultantsError && (
                    <div
                      className="booking-error"
                      role="alert"
                    >
                      <p>
                        {isHindi ? "विशेषज्ञ लोड नहीं हो सके।" : "Unable to load consultants."}
                      </p>

                      <p>
                        {consultantsError}
                      </p>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void loadConsultants(false)}
                      >
                        {isHindi ? "फिर से प्रयास करें →" : "Try Again →"}
                      </button>
                    </div>
                  )}

                {!consultantsLoading &&
                  !consultantsError &&
                  availableConsultants.length === 0 && (
                    <div className="booking-empty-state">
                      <h3>{isHindi ? "फिलहाल कोई विशेषज्ञ उपलब्ध नहीं है" : "No consultants currently available"}</h3>
                      <p>
                        {isHindi ? "इस सेवा और परामर्श माध्यम के लिए फिलहाल कोई विशेषज्ञ उपलब्ध नहीं है।" : "No consultant is currently available for this service and consultation mode."}
                      </p>
                    </div>
                  )}

                {!consultantsLoading &&
                  !consultantsError &&
                  availableConsultants.length > 0 && (
                    <div
                      className="booking-consultant-grid"
                      role="radiogroup"
                      aria-label={isHindi ? "उपलब्ध विशेषज्ञ" : "Available consultants"}
                    >
                      {availableConsultants.map(
                        (consultant) => {
                          const selected =
                            consultant._id ===
                            selectedConsultantId;

                          return (
                            <button
                              key={consultant._id}
                              type="button"
                              className={`booking-consultant-card ${
                                selected
                                  ? "is-selected"
                                  : ""
                              }`}
                              onClick={() =>
                                handleConsultantChange(
                                  consultant._id
                                )
                              }
                              role="radio"
                              aria-checked={selected}
                            >
                              <span className="booking-consultant-card-check" aria-hidden="true">
                                {selected ? "✓" : ""}
                              </span>

                              <span className="booking-consultant-card-content">
                                <strong>
                                  {consultant.name}
                                </strong>

                                <span>
                                  {consultant.specialization}
                                </span>
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
              </div>
            )}

          {/* =================================================
              {isHindi ? "चरण 4 — तारीख और समय" : "STEP 4 — DATE & TIME"}
          ================================================= */}

          {selectedServiceId &&
            selectedMode &&
            selectedConsultantId && (
              <div
                ref={dateTimeRef}
                className="booking-flow-section"
                id="booking-date-time"
              >
                <div className="booking-header">
                  <p className="eyebrow">
                    {isHindi ? "चरण 4" : "STEP 4"}
                  </p>

                  <h2 className="section-heading">
                    {isHindi ? "तारीख और समय चुनें" : "Choose Date & Time"}
                  </h2>

                  <p className="section-description">
                    {isHindi ? `उपलब्ध समय में से ${selectedConsultant?.name ?? "आपके विशेषज्ञ"} के लिए समय चुनें।` : `Select from the available appointment times for ${selectedConsultant?.name ?? "your consultant"}.`}
                  </p>
                </div>

                {consultantsLoading && (
                  <div
                    className="booking-loading"
                    role="status"
                    aria-live="polite"
                  >
                    {isHindi ? "उपलब्ध समय लोड हो रहे हैं..." : "Loading availability..."}
                  </div>
                )}

                {!consultantsLoading &&
                  !consultantsError &&
                  availableDates.length === 0 && (
                    <div className="booking-empty-state">
                      <h3>{isHindi ? "कोई तारीख उपलब्ध नहीं है" : "No available dates"}</h3>
                      <p>
                        {isHindi ? "इस विशेषज्ञ और सेवा के लिए अभी कोई बुक करने योग्य समय उपलब्ध नहीं है। कृपया कोई दूसरा विशेषज्ञ चुनें या बाद में फिर प्रयास करें।" : "There are no bookable times for this consultant and service right now. Please choose another consultant or try again later."}
                      </p>
                    </div>
                  )}

                {!consultantsLoading &&
                  !consultantsError &&
                  availableDates.length > 0 && (
                    <DateTimeSelector
                      availability={appointmentSlots}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      serviceDuration={serviceDuration}
                      mode={selectedMode}
                      onDateSelect={handleDateChange}
                      onTimeSelect={handleTimeChange}
                      occupiedDates={occupiedDates}
                    />
                  )}
              </div>
            )}

          {/* =================================================
              {isHindi ? "चरण 5 — ग्राहक विवरण" : "STEP 5 — CUSTOMER DETAILS"}
          ================================================= */}

          {selectedServiceId &&
            selectedMode &&
            selectedDate &&
            selectedTime &&
            selectedConsultantId && (
              <div
                ref={
                  customerRef
                }
                className="booking-flow-section"
                id="booking-customer-details"
              >
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
                  policyAgreed={
                    policyAgreed
                  }
                  onPolicyAgree={(
                    agreed
                  ) => {
                    setPolicyAgreed(
                      agreed
                    );
                  }}
                  onPolicyLink={
                    saveBookingStateForPolicyReturn
                  }

                />

                <div className="booking-next">
                  {(() => {
                    const category =
                      (selectedService?.category ??
                        "astrology") as
                        | "astrology"
                        | "numerology"
                        | "tarot";

                    const customerErrors =
                      validateCustomerForm(
                        category,
                        customerData
                      );

                    const customerFormValid =
                      Object.keys(
                        customerErrors
                      ).length === 0;

                    const canReview =
                      customerFormValid &&
                      policyAgreed;

                    return (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={
                            handleProceedToSummary
                          }
                          disabled={
                            !canReview
                          }
                          aria-disabled={
                            !canReview
                          }
                        >
                          {canReview
                            ? (isHindi ? "बुकिंग की समीक्षा करें →" : "Review Booking →")
                            : !customerFormValid
                            ? (isHindi ? "आवश्यक विवरण पूरा करें" : "Complete Required Details")
                            : (isHindi ? "जारी रखने के लिए नीतियां स्वीकार करें" : "Accept Policies to Continue")}
                        </button>

                        {(!customerFormValid ||
                          !policyAgreed) && (
                          <p
                            className="booking-form-help"
                            role="status"
                            aria-live="polite"
                          >
                            {!customerFormValid
                              ? "Please complete the required details and correct any highlighted fields."
                              : "Please accept the required policies before continuing."}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

          {/* =================================================
              {isHindi ? "चरण 6 — समीक्षा" : "STEP 6 — SUMMARY"}
          ================================================= */}

          {showSummary &&
            bookingData && (
              <div
                ref={
                  summaryRef
                }
                className="booking-flow-section"
                id="booking-summary"
              >
                <BookingSummary
                  booking={
                    bookingData
                  }
                  onProceedToPayment={
                    handleProceedToPayment
                  }
                />
              </div>
            )}

          {/* =================================================
              {isHindi ? "भुगतान प्रक्रिया ओवरले" : "PAYMENT PROCESSING OVERLAY"}
          ================================================= */}

          {paymentStarting && (
            <div
              className="booking-payment-status"
              role="status"
              aria-live="polite"
            >
              <div className="booking-payment-status-card">
                <span
                  className="booking-payment-spinner"
                  aria-hidden="true"
                />

                <strong>
                  {isHindi ? "सुरक्षित भुगतान तैयार किया जा रहा है..." : "Preparing secure payment..."}
                </strong>

                <p>
                  Please wait. Do not close
                  this page while we prepare
                  your payment.
                </p>
              </div>
            </div>
          )}

          <style jsx>{`
            .booking-consultant-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 18px;
              max-width: 1180px;
              margin: 0 auto;
            }

            .booking-consultant-card {
              position: relative;
              display: flex;
              align-items: flex-start;
              gap: 16px;
              width: 100%;
              min-height: 132px;
              padding: 24px;
              border: 1px solid var(--color-border);
              border-radius: 20px;
              background: #fff;
              color: var(--color-midnight);
              text-align: left;
              box-shadow: var(--shadow-soft);
              cursor: pointer;
              transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease;
            }

            .booking-consultant-card:hover {
              transform: translateY(-3px);
              border-color: var(--color-gold-light);
              box-shadow: 0 16px 34px rgba(7, 24, 42, 0.11);
            }

            .booking-consultant-card.is-selected {
              border-color: var(--color-gold);
              background: linear-gradient(135deg, #fff, rgba(255, 249, 228, 0.98));
              box-shadow: 0 0 0 2px rgba(214, 166, 59, 0.22), 0 16px 34px rgba(7, 24, 42, 0.11);
            }

            .booking-consultant-card:focus-visible {
              outline: 3px solid rgba(214, 166, 59, 0.28);
              outline-offset: 3px;
            }

            .booking-consultant-card-check {
              display: flex;
              align-items: center;
              justify-content: center;
              flex: 0 0 28px;
              width: 28px;
              height: 28px;
              margin-top: 1px;
              border: 1px solid rgba(164, 154, 139, 0.45);
              border-radius: 50%;
              background: #f7f2e8;
              color: var(--color-midnight);
              font-size: 0.82rem;
              font-weight: 800;
            }

            .booking-consultant-card.is-selected .booking-consultant-card-check {
              border-color: var(--color-gold);
              background: var(--color-gold-light);
            }

            .booking-consultant-card-content {
              display: flex;
              flex-direction: column;
              gap: 7px;
              min-width: 0;
            }

            .booking-consultant-card-content strong {
              font-family: var(--font-heading), Georgia, serif;
              font-size: 1.18rem;
              line-height: 1.25;
            }

            .booking-consultant-card-content span {
              color: var(--color-muted);
              font-size: 0.86rem;
              line-height: 1.5;
            }

            @media (max-width: 900px) {
              .booking-consultant-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }

            @media (max-width: 640px) {
              .booking-consultant-grid {
                grid-template-columns: 1fr;
                gap: 12px;
              }

              .booking-consultant-card {
                min-height: 104px;
                padding: 18px;
                border-radius: 16px;
              }
            }
          `}</style>
        </div>
      </section>
    </>
  );
}