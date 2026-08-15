"use client";

type Availability = {
  date: string;
  times: string[];
};

type DateTimeSelectorProps = {
  availability: Availability[];
  selectedDate: string | null;
  selectedTime: string | null;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
};

export default function DateTimeSelector({
  availability,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
}: DateTimeSelectorProps) {
  /*
   * ============================================
   * TODAY
   * ============================================
   *
   * Use the browser's local date rather than
   * UTC so the date behaves correctly for users
   * in India and other time zones.
   */

  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  /*
   * ============================================
   * NORMALIZE AVAILABILITY
   * ============================================
   *
   * Availability now comes from consultants.
   *
   * The page.tsx combines the availability of
   * all eligible consultants before sending it
   * here.
   *
   * Example:
   *
   * Consultant A:
   * 2026-08-17 -> 10:00, 11:00
   *
   * Consultant B:
   * 2026-08-17 -> 12:00
   *
   * This component receives:
   *
   * 2026-08-17 -> 10:00, 11:00, 12:00
   *
   * We still normalize it here so duplicate
   * dates/times cannot accidentally appear.
   */

  const normalizedAvailability =
    availability
      .filter(
        (item) =>
          item &&
          item.date &&
          Array.isArray(item.times)
      )
      .map((item) => ({
        date: item.date,
        times: Array.from(
          new Set(
            item.times
              .filter(Boolean)
              .map((time) => String(time))
          )
        ).sort(),
      }))
      .filter(
        (item) =>
          item.times.length > 0
      );

  /*
   * ============================================
   * AVAILABLE DATES
   * ============================================
   *
   * Only show:
   *
   * - Today or future dates
   * - Dates with at least one time slot
   */

  const availableDates =
    normalizedAvailability
      .filter(
        (item) =>
          item.date >= today &&
          item.times.length > 0
      )
      .sort((a, b) =>
        a.date.localeCompare(b.date)
      );

  /*
   * ============================================
   * SELECTED DATE
   * ============================================
   */

  const selectedAvailability =
    availableDates.find(
      (item) =>
        item.date === selectedDate
    );

  /*
   * ============================================
   * FORMAT DATE
   * ============================================
   */

  function formatDate(
    date: string
  ) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  }

  /*
   * ============================================
   * FORMAT SHORT DATE
   * ============================================
   */

  function formatShortDate(
    date: string
  ) {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
      }
    );
  }

  /*
   * ============================================
   * DATE CHANGE
   * ============================================
   *
   * Selecting a different date should always
   * clear the previously selected time.
   *
   * The parent page already handles this too,
   * but we deliberately keep the component
   * responsible for selecting only a date here.
   */

  function handleDateSelect(
    date: string
  ) {
    onDateSelect(date);
  }

  /*
   * ============================================
   * TIME CHANGE
   * ============================================
   */

  function handleTimeSelect(
    time: string
  ) {
    if (!selectedDate) {
      return;
    }

    onTimeSelect(time);
  }

  /*
   * ============================================
   * NO AVAILABILITY
   * ============================================
   */

  if (availableDates.length === 0) {
    return (
      <div className="booking-step">

        <div className="booking-header">
          <p className="eyebrow">
            STEP 3
          </p>

          <h2 className="section-heading">
            Choose Date & Time
          </h2>

          <p className="section-description">
            No consultation slots are
            currently available.
          </p>
        </div>

        <div className="booking-date-empty">

          <div className="booking-date-empty-icon">
            ○
          </div>

          <h3>
            No available dates
          </h3>

          <p>
            There are currently no
            available consultation
            dates for this selection.
            Please check again later.
          </p>

        </div>
      </div>
    );
  }

  /*
   * ============================================
   * UI
   * ============================================
   */

  return (
    <div className="booking-step">

      {/* ======================================
          DATE
      ====================================== */}

      <div className="booking-header">

        <p className="eyebrow">
          STEP 3
        </p>

        <h2 className="section-heading">
          Choose a Date
        </h2>

        <p className="section-description">
          Select a date when a consultant
          is available.
        </p>

      </div>

      {/* ======================================
          AVAILABLE DATE LIST
      ====================================== */}

      <div className="booking-date-list">

        {availableDates.map(
          (item) => (
            <button
              key={item.date}
              type="button"
              className={`booking-date-option ${
                selectedDate === item.date
                  ? "booking-date-option-selected"
                  : ""
              }`}
              onClick={() =>
                handleDateSelect(
                  item.date
                )
              }
            >

              <span className="booking-date-option-day">
                {formatShortDate(
                  item.date
                )}
              </span>

              <span className="booking-date-option-full">
                {formatDate(
                  item.date
                )}
              </span>

              <span className="booking-date-option-slots">
                {item.times.length}{" "}
                {item.times.length === 1
                  ? "slot"
                  : "slots"}{" "}
                available
              </span>

            </button>
          )
        )}

      </div>

      {/* ======================================
          TIME
      ====================================== */}

      {selectedDate &&
        selectedAvailability && (
          <div className="booking-time-section">

            <div className="booking-header">

              <p className="eyebrow">
                STEP 4
              </p>

              <h2 className="section-heading">
                Choose a Time
              </h2>

              <p className="section-description">
                Select an available time
                slot for{" "}
                <strong>
                  {formatDate(
                    selectedDate
                  )}
                </strong>
                .
              </p>

            </div>

            {/* ==============================
                TIME SLOTS
            ============================== */}

            <div className="booking-time-list">

              {selectedAvailability.times
                .slice()
                .sort()
                .map(
                  (time) => (
                    <button
                      key={time}
                      type="button"
                      className={`booking-time-option ${
                        selectedTime === time
                          ? "booking-time-option-selected"
                          : ""
                      }`}
                      onClick={() =>
                        handleTimeSelect(
                          time
                        )
                      }
                    >

                      <span>
                        {time}
                      </span>

                      {selectedTime ===
                        time && (
                        <span>
                          ✓
                        </span>
                      )}

                    </button>
                  )
                )}

            </div>

          </div>
        )}

    </div>
  );
}