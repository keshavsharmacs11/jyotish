/*
 * =========================================================
 * BOOKING TIME / IST
 * =========================================================
 *
 * All consultant availability and booking slots are
 * interpreted in India Standard Time (Asia/Kolkata).
 *
 * Stored format:
 *
 * date = YYYY-MM-DD
 * time = HH:mm
 *
 * We intentionally compare the local IST date/time strings
 * instead of converting the consultant's slot through the
 * server's local timezone.
 */

const IST_TIME_ZONE =
  "Asia/Kolkata";

/*
 * =========================================================
 * GET CURRENT IST DATE/TIME KEY
 * =========================================================
 *
 * Example:
 *
 * 2026-08-21 00:32 IST
 *
 * becomes:
 *
 * 2026-08-21T00:32
 */

function getCurrentISTKey(): string {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          IST_TIME_ZONE,

        year: "numeric",
        month: "2-digit",
        day: "2-digit",

        hour: "2-digit",
        minute: "2-digit",

        hourCycle:
          "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      new Date()
    );

  const values: Record<
    string,
    string
  > = {};

  for (
    const part of parts
  ) {
    if (
      part.type !==
      "literal"
    ) {
      values[part.type] =
        part.value;
    }
  }

  return [
    values.year,
    values.month,
    values.day,
  ].join("-") +
    "T" +
    [
      values.hour,
      values.minute,
    ].join(":");
}

/*
 * =========================================================
 * VALIDATE SLOT FORMAT
 * =========================================================
 */

function isValidSlotFormat(
  date: string,
  time: string
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      date
    )
  ) {
    return false;
  }

  if (
    !/^\d{2}:\d{2}$/.test(
      time
    )
  ) {
    return false;
  }

  const hour =
    Number(
      time.slice(0, 2)
    );

  const minute =
    Number(
      time.slice(3, 5)
    );

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }

  /*
   * Validate the actual calendar date.
   */

  const [
    yearString,
    monthString,
    dayString,
  ] = date.split("-");

  const year =
    Number(yearString);

  const month =
    Number(monthString);

  const day =
    Number(dayString);

  const testDate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  return (
    testDate.getUTCFullYear() ===
      year &&
    testDate.getUTCMonth() ===
      month - 1 &&
    testDate.getUTCDate() ===
      day
  );
}

/*
 * =========================================================
 * IS SLOT IN THE FUTURE IN IST?
 * =========================================================
 *
 * Returns true only when the exact slot minute is still
 * ahead of the current IST minute.
 *
 * Example:
 *
 * Current IST:
 * 2026-08-21 00:32
 *
 * 00:31 → false
 * 00:32 → false
 * 00:33 → true
 */

export function isSlotInFutureIST(
  date: string,
  time: string
): boolean {
  const normalizedDate =
    String(date).trim();

  const normalizedTime =
    String(time).trim();

  if (
    !isValidSlotFormat(
      normalizedDate,
      normalizedTime
    )
  ) {
    return false;
  }

  const slotKey =
    `${normalizedDate}T${normalizedTime}`;

  const currentISTKey =
    getCurrentISTKey();

  return (
    slotKey >
    currentISTKey
  );
}