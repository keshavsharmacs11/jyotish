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

export type CustomerDetails = {
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


export type BookingStatus =
  | "pending"
  | "payment_pending"
  | "confirmed"
  | "completed"
  | "cancelled";


export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";


export type Booking = {
  id?: string;

  serviceId: string;
  serviceName: string;
  category: ServiceCategory;

  mode: BookingMode;

  date: string;
  time: string;

  consultantId?: string;
  consultantName?: string;

  customer: CustomerDetails;

  price: number;
  currency: "INR";

  status: BookingStatus;
  paymentStatus: PaymentStatus;

  paymentId?: string;

  createdAt?: string;
  updatedAt?: string;
};