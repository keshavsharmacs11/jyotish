export type ConsultationMode =
  | "video"
  | "voice"
  | "chat";

export type BookingMode = "video" | "voice";

export type ServiceCategory =
  | "astrology"
  | "numerology"
  | "tarot";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;

  // Controlled by Admin Panel later
  duration: number | null;
  price: number | null;

  // Consultants will be assigned by Admin
  consultantIds: string[];

  // Available consultation modes
  // Admin will control these later
  availableModes: ConsultationMode[];

  active: boolean;
};