const CONTACT_QUERY_CATEGORIES = [
  "General",
  "Astrology Consultation",
  "Booking",
  "Payment",
  "Technical Support",
  "Service",
  "Other",
] as const;

export function cleanText(
  value: unknown,
  maxLength = 200
): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

export function cleanMessage(
  value: unknown,
  maxLength = 5000
): string {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .slice(0, maxLength);
}

export function normalizeContactEmail(
  value: unknown
): string {
  return cleanText(value, 320).toLowerCase();
}

export function isValidEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidContactEmail(
  email: string
): boolean {
  return isValidEmail(email);
}

export function cleanMobile(
  value: unknown
): string {
  return cleanText(value, 30);
}

export function isValidMobile(
  mobile: string
): boolean {
  return (
    mobile === "" ||
    /^[+\d][\d\s()-]{6,24}$/.test(mobile)
  );
}

export function isValidRating(
  rating: unknown
): boolean {
  return (
    typeof rating === "number" &&
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5
  );
}

export function isContactQueryCategory(
  category: string
): boolean {
  return (
    CONTACT_QUERY_CATEGORIES as readonly string[]
  ).includes(category);
}

export function makePublicId(
  prefix: string
): string {
  const now = Date.now()
    .toString(36)
    .toUpperCase();

  const random = Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase();

  return `${prefix}-${now}-${random}`;
}