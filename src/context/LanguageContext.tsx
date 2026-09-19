    "use client";

    import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
    } from "react";

    export type Language = "en" | "hi";

    /*
    * ============================================================
    * GLOBAL TRANSLATION KEYS
    * ============================================================
    *
    * Keep all website UI translations in this single source.
    *
    * IMPORTANT:
    * - These translations are for website UI/content.
    * - Database/API data should continue coming from the existing
    *   backend and should NOT be modified here.
    * - Admin panel language is intentionally kept separate.
    */

    export type TranslationKey =
    // Navigation
    | "nav.home"
    | "nav.about"
    | "nav.services"
    | "nav.consultants"
    | "nav.shop"
    | "nav.contact"
    | "nav.account"
    | "nav.login"
    | "nav.createAccount"
    | "nav.myBookings"
    | "nav.trackBooking"
    | "nav.logout"
    | "nav.loggingOut"
    | "nav.bookConsultation"
    | "nav.trackMyBooking"

    // Common
    | "common.english"
    | "common.hindi"
    | "common.learnMore"
    | "common.readMore"
    | "common.getStarted"
    | "common.bookNow"
    | "common.submit"
    | "common.cancel"
    | "common.close"
    | "common.back"
    | "common.continue"
    | "common.loading"
    | "common.error"
    | "common.tryAgain"
    | "common.required"
    | "common.optional"
    | "common.yes"
    | "common.no"

    // Homepage
    | "home.hero.eyebrow"
    | "home.hero.title"
    | "home.hero.description"
    | "home.hero.primaryCta"
    | "home.hero.secondaryCta"
    | "home.trust.eyebrow"
    | "home.trust.title"
    | "home.trust.description"
    | "home.achievements.eyebrow"
    | "home.achievements.title"
    | "home.achievements.description"
    | "home.services.eyebrow"
    | "home.services.title"
    | "home.services.description"
    | "home.services.viewAll"
    | "home.process.eyebrow"
    | "home.process.title"
    | "home.process.description"
    | "home.testimonials.eyebrow"
    | "home.testimonials.title"
    | "home.testimonials.description"
    | "home.faq.eyebrow"
    | "home.faq.title"
    | "home.faq.description"
    | "home.cta.eyebrow"
    | "home.cta.title"
    | "home.cta.description"
    | "home.cta.primary"
    | "home.cta.secondary"
    // Homepage - additional UI
    | "home.hero.trust.personal"
    | "home.hero.trust.personalDetail"
    | "home.hero.trust.confidential"
    | "home.hero.trust.confidentialDetail"
    | "home.hero.trust.online"
    | "home.hero.trust.onlineDetail"
    | "home.hero.questionLabel"
    | "home.hero.guidanceLabel"
    | "home.hero.guidanceDescription"
    | "home.hero.exploreGuidance"
    | "home.trust.nextStepEyebrow"
    | "home.trust.nextStepTitle"
    | "home.trust.findGuidance"
    | "home.trust.meetConsultants"
    | "home.trust.bookConsultation"
    | "home.achievements.viewRecognition"
    | "home.achievements.previous"
    | "home.achievements.next"
    | "home.achievements.gallery"
    | "home.achievements.galleryHint"
    | "home.achievements.footer"
    | "home.achievements.closeViewer"
    | "home.services.loading"
    | "home.services.loadError"
    | "home.services.viewBookingOptions"
    | "home.services.empty"
    | "home.services.startingFrom"
    | "home.services.contactUs"
    | "home.services.video"
    | "home.services.voice"
    | "home.services.videoVoice"
    | "home.services.bookNow"
    | "home.services.bookService"
    | "home.services.specific"
    | "home.services.specificDescription"
    | "home.services.bookConsultation"
    | "home.process.step1.title"
    | "home.process.step1.description"
    | "home.process.step2.title"
    | "home.process.step2.description"
    | "home.process.step3.title"
    | "home.process.step3.description"
    | "home.process.step4.title"
    | "home.process.step4.description"
    | "home.testimonials.loading"
    | "home.testimonials.verified"
    | "home.testimonials.empty"
    | "home.faq.q1"
    | "home.faq.a1"
    | "home.faq.q2"
    | "home.faq.a2"
    | "home.faq.q3"
    | "home.faq.a3"
    | "home.faq.q4"
    | "home.faq.a4"
    | "home.faq.q5"
    | "home.faq.a5"

    // Services
    | "services.eyebrow"
    | "services.title"
    | "services.description"
    | "services.findGuidance"
    | "services.bookConsultation"
    | "services.personalApproach.eyebrow"
    | "services.personalApproach.title"
    | "services.personalApproach.description"
    | "services.guidance.eyebrow"
    | "services.guidance.title"
    | "services.guidance.description"
    | "services.receive.eyebrow"
    | "services.receive.title"
    | "services.receive.description"
    | "services.live.eyebrow"
    | "services.live.title"
    | "services.live.description"
    | "services.process.eyebrow"
    | "services.process.title"
    | "services.process.description"
    | "services.cta.eyebrow"
    | "services.cta.title"
    | "services.cta.description"
    | "services.cta.button"

    // Service Finder
    | "finder.title"
    | "finder.description"
    | "finder.concernLabel"
    | "finder.questionLabel"
    | "finder.questionPlaceholder"
    | "finder.continue"
    | "finder.back"
    | "finder.recommendation"
    | "finder.recommended"
    | "finder.bookService"
    | "finder.noMatch"
    | "finder.tryAgain"

    // About
    | "about.eyebrow"
    | "about.title"
    | "about.description"
    | "about.story.eyebrow"
    | "about.story.title"
    | "about.story.description"
    | "about.values.eyebrow"
    | "about.values.title"
    | "about.values.description"
    | "about.cta.title"
    | "about.cta.description"
    | "about.cta.button"

    // Consultants
    | "consultants.eyebrow"
    | "consultants.title"
    | "consultants.description"
    | "consultants.personalGuidance"
    | "consultants.meetExperts"
    | "consultants.bookConsultant"
    | "consultants.available"
    | "consultants.unavailable"
    | "consultants.loading"
    | "consultants.noConsultants"
    | "consultants.specialization"
    | "consultants.consultationModes"

    // Booking
    | "booking.title"
    | "booking.description"
    | "booking.selectService"
    | "booking.selectConsultant"
    | "booking.selectDate"
    | "booking.selectTime"
    | "booking.selectMode"
    | "booking.customerDetails"
    | "booking.name"
    | "booking.email"
    | "booking.mobile"
    | "booking.videoCall"
    | "booking.voiceCall"
    | "booking.summary"
    | "booking.payment"
    | "booking.payNow"
    | "booking.confirmBooking"
    | "booking.bookingConfirmed"
    | "booking.bookingId"
    | "booking.loadingServices"
    | "booking.loadingConsultants"
    | "booking.noAvailability"
    | "booking.selectAnotherTime"
    | "booking.paymentError"
    | "booking.bookingError"

    // Contact
    | "contact.eyebrow"
    | "contact.title"
    | "contact.description"
    | "contact.query"
    | "contact.feedback"
    | "contact.queryTitle"
    | "contact.feedbackTitle"
    | "contact.name"
    | "contact.email"
    | "contact.mobile"
    | "contact.category"
    | "contact.subject"
    | "contact.message"
    | "contact.rating"
    | "contact.bookingId"
    | "contact.service"
    | "contact.sendQuery"
    | "contact.submitFeedback"
    | "contact.querySuccess"
    | "contact.feedbackSuccess"
    | "contact.feedbackModeration"
    | "contact.bookingFound"
    | "contact.bookingNotFound"
    | "contact.loadingBooking"
    | "contact.optionalBookingId"

    // Track Booking
    | "track.title"
    | "track.description"
    | "track.bookingId"
    | "track.email"
    | "track.search"
    | "track.bookingDetails"
    | "track.status"
    | "track.service"
    | "track.consultant"
    | "track.date"
    | "track.time"
    | "track.mode"
    | "track.notFound"
    | "track.loading"
    | "track.error"

    // Account
    | "account.loginTitle"
    | "account.loginDescription"
    | "account.email"
    | "account.password"
    | "account.login"
    | "account.forgotPassword"
    | "account.createAccount"
    | "account.createTitle"
    | "account.createDescription"
    | "account.confirmPassword"
    | "account.resetPassword"
    | "account.logout"
    | "account.myBookings"
    | "account.profile"

    // Footer
    | "footer.description"
    | "footer.quickLinks"
    | "footer.services"
    | "footer.company"
    | "footer.support"
    | "footer.privacy"
    | "footer.terms"
    | "footer.refund"
    | "footer.contact"
    | "footer.copyright";

    /*
    * ============================================================
    * LANGUAGE CONTEXT
    * ============================================================
    */

    interface LanguageContextValue {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: TranslationKey) => string;
    }

    const LanguageContext =
    createContext<LanguageContextValue | undefined>(
        undefined
    );

    const translations: Record<
    Language,
    Record<TranslationKey, string>
    > = {
    /*
    * ==========================================================
    * ENGLISH
    * ==========================================================
    */

    en: {
        // Navigation
        "nav.home": "Home",
        "nav.about": "About",
        "nav.services": "Services",
        "nav.consultants": "Consultants",
        "nav.shop": "Shop",
        "nav.contact": "Contact",
        "nav.account": "Account",
        "nav.login": "Login",
        "nav.createAccount": "Create Account",
        "nav.myBookings": "My Bookings",
        "nav.trackBooking": "Track Booking",
        "nav.logout": "Logout",
        "nav.loggingOut": "Logging Out...",
        "nav.bookConsultation": "Book Consultation",
        "nav.trackMyBooking": "Track My Booking",

        // Common
        "common.english": "English",
        "common.hindi": "हिन्दी",
        "common.learnMore": "Learn More",
        "common.readMore": "Read More",
        "common.getStarted": "Get Started",
        "common.bookNow": "Book Now",
        "common.submit": "Submit",
        "common.cancel": "Cancel",
        "common.close": "Close",
        "common.back": "Back",
        "common.continue": "Continue",
        "common.loading": "Loading...",
        "common.error": "Something went wrong.",
        "common.tryAgain": "Try Again",
        "common.required": "Required",
        "common.optional": "Optional",
        "common.yes": "Yes",
        "common.no": "No",

        // Homepage
        "home.hero.eyebrow": "PERSONAL GUIDANCE",
        "home.hero.title": "Clarity for the Questions That Matter.",
        "home.hero.description":
        "Personalized astrology, numerology and tarot guidance to help you understand your situation, explore your options and move forward with clarity.",
        "home.hero.primaryCta": "Book a Consultation",
        "home.hero.secondaryCta": "Explore Services",

        "home.trust.eyebrow": "TRUSTED GUIDANCE",
        "home.trust.title": "Guidance Rooted in Experience",
        "home.trust.description":
        "Thoughtful consultations designed around your questions, your circumstances and your journey.",

        "home.achievements.eyebrow": "OUR EXPERIENCE",
        "home.achievements.title": "Experience You Can Trust",
        "home.achievements.description":
        "Dedicated to providing thoughtful and personalized spiritual guidance.",

        "home.services.eyebrow": "OUR SERVICES",
        "home.services.title": "Guidance for Every Important Question",
        "home.services.description":
        "Explore personalized astrology, numerology and tarot consultations.",
        "home.services.viewAll": "View All Services",

        "home.process.eyebrow": "HOW IT WORKS",
        "home.process.title": "A Simple Path to Clarity",
        "home.process.description":
        "Choose your guidance, select your consultant and begin your consultation.",

        "home.testimonials.eyebrow": "CLIENT EXPERIENCES",
        "home.testimonials.title": "What Our Clients Say",
        "home.testimonials.description":
        "Real experiences from people who have received our guidance.",

        "home.faq.eyebrow": "FAQ",
        "home.faq.title": "Frequently Asked Questions",
        "home.faq.description":
        "Find answers to common questions about our consultations and services.",

        "home.cta.eyebrow": "READY WHEN YOU ARE",
        "home.cta.title": "Find Clarity in What Matters Most",
        "home.cta.description":
        "Begin a personalized consultation designed around your questions.",
        "home.cta.primary": "Book a Consultation",
        "home.cta.secondary": "Explore Services",
        // Homepage - additional UI
        "home.hero.trust.personal": "Personal Guidance",
        "home.hero.trust.personalDetail": "One-to-One Sessions",
        "home.hero.trust.confidential": "Confidential",
        "home.hero.trust.confidentialDetail": "Private Consultation",
        "home.hero.trust.online": "Online",
        "home.hero.trust.onlineDetail": "Anywhere in India",
        "home.hero.questionLabel": "YOUR QUESTION",
        "home.hero.guidanceLabel": "OUR GUIDANCE",
        "home.hero.guidanceDescription": "Understand the possibilities and choose the right path.",
        "home.hero.exploreGuidance": "Explore Guidance →",
        "home.trust.nextStepEyebrow": "WHAT WOULD YOU LIKE TO DO?",
        "home.trust.nextStepTitle": "Start with the path that feels right for you.",
        "home.trust.findGuidance": "Find Your Guidance",
        "home.trust.meetConsultants": "Meet Our Consultants",
        "home.trust.bookConsultation": "Book a Consultation",
        "home.achievements.viewRecognition": "View Recognition",
        "home.achievements.previous": "Previous achievement",
        "home.achievements.next": "Next achievement",
        "home.achievements.gallery": "Achievement gallery",
        "home.achievements.galleryHint": "Click an image to view in full size",
        "home.achievements.footer": "HONOURED · RECOGNISED · TRUSTED",
        "home.achievements.closeViewer": "Close photograph viewer",
        "home.services.loading": "Loading our consultations...",
        "home.services.loadError": "We're unable to load the services right now.",
        "home.services.viewBookingOptions": "View Booking Options",
        "home.services.empty": "Our consultation services will appear here shortly.",
        "home.services.startingFrom": "Starting from",
        "home.services.contactUs": "Contact us",
        "home.services.video": "Video",
        "home.services.voice": "Voice",
        "home.services.videoVoice": "Video • Voice",
        "home.services.bookNow": "Book Now",
        "home.services.bookService": "Book",
        "home.services.specific": "Looking for something specific?",
        "home.services.specificDescription": "View the complete consultation options and choose what feels right for you.",
        "home.services.bookConsultation": "Book a Consultation",
        "home.process.step1.title": "Choose Your Service",
        "home.process.step1.description": "Select the consultation service that best matches your requirements.",
        "home.process.step2.title": "Book Your Slot",
        "home.process.step2.description": "Choose a convenient date and time for your consultation.",
        "home.process.step3.title": "Connect With Our Expert",
        "home.process.step3.description": "Join your consultation through your preferred communication method.",
        "home.process.step4.title": "Receive Personalized Guidance",
        "home.process.step4.description": "Get practical insights and recommendations tailored to your situation.",
        "home.testimonials.loading": "Loading client testimonials",
        "home.testimonials.verified": "✓ Verified Client",
        "home.testimonials.empty": "Our clients' experiences will appear here after they are reviewed and approved.",
        "home.faq.q1": "How do I book a consultation?",
        "home.faq.a1": "Click on the Book Consultation button, select your preferred service, choose an available date and time, and confirm your booking.",
        "home.faq.q2": "Are online consultations available?",
        "home.faq.a2": "Yes. All consultations are available online through Google Meet or your preferred communication platform.",
        "home.faq.q3": "Which services do you provide?",
        "home.faq.a3": "We provide Vedic Astrology, Numerology, Tarot Reading, Career Guidance, Marriage Consultation and Business Consultation.",
        "home.faq.q4": "How long is one consultation?",
        "home.faq.a4": "Most consultations last between 30 and 60 minutes depending on the selected service.",
        "home.faq.q5": "Can I reschedule my booking?",
        "home.faq.a5": "Yes. You can request a reschedule before your appointment time by contacting our support.",

        // Services
        "services.eyebrow": "OUR SERVICES",
        "services.title": "Guidance for the Questions That Matter.",
        "services.description":
        "Every consultation is designed to help you understand your situation, explore your options and move forward with greater clarity.",
        "services.findGuidance": "Find Your Guidance",
        "services.bookConsultation": "Book a Consultation",

        "services.personalApproach.eyebrow": "A PERSONAL APPROACH",
        "services.personalApproach.title": "Guidance Built Around You",
        "services.personalApproach.description":
        "Your questions are unique. Our consultations are designed to understand your situation and provide meaningful guidance.",

        "services.guidance.eyebrow": "PERSONAL GUIDANCE",
        "services.guidance.title": "Choose the Guidance You Need",
        "services.guidance.description":
        "Explore our range of consultation services.",

        "services.receive.eyebrow": "WHAT YOU RECEIVE",
        "services.receive.title": "More Than Just Answers",
        "services.receive.description":
        "A thoughtful consultation focused on clarity, perspective and practical direction.",

        "services.live.eyebrow": "AVAILABLE SERVICES",
        "services.live.title": "Explore Our Consultations",
        "services.live.description":
        "Choose from our currently available consultation services.",

        "services.process.eyebrow": "HOW CONSULTATION WORKS",
        "services.process.title": "A Simple, Personal Process",
        "services.process.description":
        "Select a service, choose your preferred consultant and schedule your consultation.",

        "services.cta.eyebrow": "NOT SURE WHERE TO START?",
        "services.cta.title": "Let Us Help You Find the Right Guidance",
        "services.cta.description":
        "Tell us what you are looking for and discover the consultation that may suit your needs.",
        "services.cta.button": "Find My Guidance",

        // Service Finder
        "finder.title": "Find My Guidance",
        "finder.description":
        "Tell us what you need help with and we will help you find the most relevant consultation.",
        "finder.concernLabel": "What would you like guidance about?",
        "finder.questionLabel": "Tell us a little more",
        "finder.questionPlaceholder":
        "Describe your question or situation...",
        "finder.continue": "Continue",
        "finder.back": "Back",
        "finder.recommendation": "Your Guidance",
        "finder.recommended": "Recommended for You",
        "finder.bookService": "Book This Consultation",
        "finder.noMatch":
        "We could not find a strong match. Try describing your question differently.",
        "finder.tryAgain": "Try Again",

        // About
        "about.eyebrow": "ABOUT US",
        "about.title": "Guidance With Experience, Care and Perspective",
        "about.description":
        "Our approach combines traditional wisdom with a thoughtful understanding of the questions people face today.",
        "about.story.eyebrow": "OUR STORY",
        "about.story.title": "A Personal Approach to Guidance",
        "about.story.description":
        "Every consultation begins with listening, understanding and creating space for meaningful guidance.",
        "about.values.eyebrow": "OUR VALUES",
        "about.values.title": "What Guides Our Work",
        "about.values.description":
        "Integrity, personal attention and respect for every individual's journey.",
        "about.cta.title": "Ready to Begin Your Journey?",
        "about.cta.description":
        "Explore our services and find the right guidance for your questions.",
        "about.cta.button": "Explore Services",

        // Consultants
        "consultants.eyebrow": "OUR CONSULTANTS",
        "consultants.title": "Meet Your Guidance Experts",
        "consultants.description":
        "Experienced consultants offering personalized guidance across astrology, numerology and tarot.",
        "consultants.personalGuidance": "PERSONAL GUIDANCE",
        "consultants.meetExperts": "Meet the People Behind Your Guidance",
        "consultants.bookConsultant": "Book Consultation",
        "consultants.available": "Available",
        "consultants.unavailable": "Currently Unavailable",
        "consultants.loading": "Loading consultants...",
        "consultants.noConsultants":
        "No consultants are currently available.",
        "consultants.specialization": "Specialization",
        "consultants.consultationModes": "Consultation Modes",

        // Booking
        "booking.title": "Book Your Consultation",
        "booking.description":
        "Choose your service, consultant and preferred time.",
        "booking.selectService": "Select a Service",
        "booking.selectConsultant": "Select a Consultant",
        "booking.selectDate": "Select a Date",
        "booking.selectTime": "Select a Time",
        "booking.selectMode": "Select Consultation Mode",
        "booking.customerDetails": "Your Details",
        "booking.name": "Full Name",
        "booking.email": "Email Address",
        "booking.mobile": "Mobile Number",
        "booking.videoCall": "Video Call",
        "booking.voiceCall": "Voice Call",
        "booking.summary": "Booking Summary",
        "booking.payment": "Payment",
        "booking.payNow": "Pay Now",
        "booking.confirmBooking": "Confirm Booking",
        "booking.bookingConfirmed": "Booking Confirmed",
        "booking.bookingId": "Booking ID",
        "booking.loadingServices": "Loading services...",
        "booking.loadingConsultants": "Loading consultants...",
        "booking.noAvailability": "No availability for this selection.",
        "booking.selectAnotherTime": "Please select another time.",
        "booking.paymentError":
        "There was a problem processing your payment.",
        "booking.bookingError":
        "There was a problem creating your booking.",

        // Contact
        "contact.eyebrow": "GET IN TOUCH",
        "contact.title": "How Can We Help?",
        "contact.description":
        "Send us your question or share your experience with us.",
        "contact.query": "Send a Query",
        "contact.feedback": "Share Feedback",
        "contact.queryTitle": "Send Us Your Question",
        "contact.feedbackTitle": "Share Your Experience",
        "contact.name": "Your Name",
        "contact.email": "Email Address",
        "contact.mobile": "Mobile Number",
        "contact.category": "Category",
        "contact.subject": "Subject",
        "contact.message": "Message",
        "contact.rating": "Your Rating",
        "contact.bookingId": "Booking ID",
        "contact.service": "Service",
        "contact.sendQuery": "Send Query",
        "contact.submitFeedback": "Submit Feedback",
        "contact.querySuccess":
        "Your query has been sent successfully.",
        "contact.feedbackSuccess":
        "Thank you for sharing your feedback. It has been submitted for review.",
        "contact.feedbackModeration":
        "Feedback is reviewed before it is published publicly.",
        "contact.bookingFound": "Booking found",
        "contact.bookingNotFound": "Booking ID not found.",
        "contact.loadingBooking": "Checking booking...",
        "contact.optionalBookingId": "Optional",

        // Track Booking
        "track.title": "Track Your Booking",
        "track.description":
        "Enter your booking details to view the latest status.",
        "track.bookingId": "Booking ID",
        "track.email": "Email Address",
        "track.search": "Track Booking",
        "track.bookingDetails": "Booking Details",
        "track.status": "Status",
        "track.service": "Service",
        "track.consultant": "Consultant",
        "track.date": "Date",
        "track.time": "Time",
        "track.mode": "Consultation Mode",
        "track.notFound": "Booking not found.",
        "track.loading": "Loading booking...",
        "track.error":
        "Unable to retrieve your booking right now.",

        // Account
        "account.loginTitle": "Welcome Back",
        "account.loginDescription":
        "Sign in to access your account and bookings.",
        "account.email": "Email Address",
        "account.password": "Password",
        "account.login": "Login",
        "account.forgotPassword": "Forgot Password?",
        "account.createAccount": "Create Account",
        "account.createTitle": "Create Your Account",
        "account.createDescription":
        "Create an account to manage your bookings and consultations.",
        "account.confirmPassword": "Confirm Password",
        "account.resetPassword": "Reset Password",
        "account.logout": "Logout",
        "account.myBookings": "My Bookings",
        "account.profile": "My Profile",

        // Footer
        "footer.description":
        "Personalized astrology, numerology and tarot guidance for clarity and direction.",
        "footer.quickLinks": "Quick Links",
        "footer.services": "Services",
        "footer.company": "Company",
        "footer.support": "Support",
        "footer.privacy": "Privacy Policy",
        "footer.terms": "Terms & Conditions",
        "footer.refund": "Cancellation & Refund Policy",
        "footer.contact": "Contact Us",
        "footer.copyright": "All rights reserved.",

    },

    /*
    * ==========================================================
    * HINDI
    * ==========================================================
    */

    hi: {
        // Navigation
        "nav.home": "होम",
        "nav.about": "हमारे बारे में",
        "nav.services": "सेवाएँ",
        "nav.consultants": "ज्योतिष विशेषज्ञ",
        "nav.shop": "शॉप",
        "nav.contact": "संपर्क",
        "nav.account": "अकाउंट",
        "nav.login": "लॉगिन",
        "nav.createAccount": "अकाउंट बनाएँ",
        "nav.myBookings": "मेरी बुकिंग",
        "nav.trackBooking": "बुकिंग ट्रैक करें",
        "nav.logout": "लॉगआउट",
        "nav.loggingOut": "लॉगआउट हो रहा है...",
        "nav.bookConsultation": "परामर्श बुक करें",
        "nav.trackMyBooking": "मेरी बुकिंग ट्रैक करें",

        // Common
        "common.english": "English",
        "common.hindi": "हिन्दी",
        "common.learnMore": "और जानें",
        "common.readMore": "और पढ़ें",
        "common.getStarted": "शुरू करें",
        "common.bookNow": "अभी बुक करें",
        "common.submit": "सबमिट करें",
        "common.cancel": "रद्द करें",
        "common.close": "बंद करें",
        "common.back": "वापस",
        "common.continue": "आगे बढ़ें",
        "common.loading": "लोड हो रहा है...",
        "common.error": "कुछ गलत हो गया।",
        "common.tryAgain": "पुनः प्रयास करें",
        "common.required": "आवश्यक",
        "common.optional": "वैकल्पिक",
        "common.yes": "हाँ",
        "common.no": "नहीं",

        // Homepage
        "home.hero.eyebrow": "व्यक्तिगत मार्गदर्शन",
        "home.hero.title": "उन सवालों के लिए स्पष्टता जो आपके लिए महत्वपूर्ण हैं।",
        "home.hero.description":
        "ज्योतिष, अंक ज्योतिष और टैरो के माध्यम से व्यक्तिगत मार्गदर्शन प्राप्त करें, ताकि आप अपनी परिस्थिति को बेहतर समझ सकें और सही दिशा में आगे बढ़ सकें।",
        "home.hero.primaryCta": "परामर्श बुक करें",
        "home.hero.secondaryCta": "सेवाएँ देखें",

        "home.trust.eyebrow": "विश्वसनीय मार्गदर्शन",
        "home.trust.title": "अनुभव पर आधारित मार्गदर्शन",
        "home.trust.description":
        "आपके सवालों, परिस्थितियों और जीवन-यात्रा को ध्यान में रखकर व्यक्तिगत परामर्श।",

        "home.achievements.eyebrow": "हमारा अनुभव",
        "home.achievements.title": "ऐसा अनुभव जिस पर आप भरोसा कर सकते हैं",
        "home.achievements.description":
        "सोच-समझकर और व्यक्तिगत रूप से आध्यात्मिक मार्गदर्शन प्रदान करने के लिए समर्पित।",

        "home.services.eyebrow": "हमारी सेवाएँ",
        "home.services.title": "हर महत्वपूर्ण सवाल के लिए मार्गदर्शन",
        "home.services.description":
        "व्यक्तिगत ज्योतिष, अंक ज्योतिष और टैरो परामर्श सेवाएँ देखें।",
        "home.services.viewAll": "सभी सेवाएँ देखें",

        "home.process.eyebrow": "यह कैसे काम करता है",
        "home.process.title": "स्पष्टता की ओर एक सरल मार्ग",
        "home.process.description":
        "अपना मार्गदर्शन चुनें, विशेषज्ञ चुनें और अपना परामर्श शुरू करें।",

        "home.testimonials.eyebrow": "ग्राहकों के अनुभव",
        "home.testimonials.title": "हमारे ग्राहक क्या कहते हैं",
        "home.testimonials.description":
        "उन लोगों के वास्तविक अनुभव जिन्होंने हमारा मार्गदर्शन प्राप्त किया।",

        "home.faq.eyebrow": "सामान्य प्रश्न",
        "home.faq.title": "अक्सर पूछे जाने वाले प्रश्न",
        "home.faq.description":
        "हमारी परामर्श सेवाओं से जुड़े सामान्य प्रश्नों के उत्तर जानें।",

        "home.cta.eyebrow": "जब आप तैयार हों",
        "home.cta.title": "जो सबसे महत्वपूर्ण है उसमें स्पष्टता पाएँ",
        "home.cta.description":
        "अपने सवालों के अनुसार तैयार व्यक्तिगत परामर्श से शुरुआत करें।",
        "home.cta.primary": "परामर्श बुक करें",
        "home.cta.secondary": "सेवाएँ देखें",
        // Homepage - additional UI
        "home.hero.trust.personal": "व्यक्तिगत मार्गदर्शन",
        "home.hero.trust.personalDetail": "वन-टू-वन सत्र",
        "home.hero.trust.confidential": "गोपनीय",
        "home.hero.trust.confidentialDetail": "निजी परामर्श",
        "home.hero.trust.online": "ऑनलाइन",
        "home.hero.trust.onlineDetail": "भारत में कहीं से भी",
        "home.hero.questionLabel": "आपका प्रश्न",
        "home.hero.guidanceLabel": "हमारा मार्गदर्शन",
        "home.hero.guidanceDescription": "संभावनाओं को समझें और अपने लिए सही मार्ग चुनें।",
        "home.hero.exploreGuidance": "मार्गदर्शन देखें →",
        "home.trust.nextStepEyebrow": "आप क्या करना चाहते हैं?",
        "home.trust.nextStepTitle": "अपने लिए सही लगने वाले मार्ग से शुरुआत करें।",
        "home.trust.findGuidance": "अपना मार्गदर्शन खोजें",
        "home.trust.meetConsultants": "हमारे सलाहकारों से मिलें",
        "home.trust.bookConsultation": "परामर्श बुक करें",
        "home.achievements.viewRecognition": "सम्मान देखें",
        "home.achievements.previous": "पिछला सम्मान",
        "home.achievements.next": "अगला सम्मान",
        "home.achievements.gallery": "सम्मान गैलरी",
        "home.achievements.galleryHint": "पूरे आकार में देखने के लिए किसी तस्वीर पर क्लिक करें",
        "home.achievements.footer": "सम्मानित · मान्यताप्राप्त · विश्वसनीय",
        "home.achievements.closeViewer": "फोटो व्यूअर बंद करें",
        "home.services.loading": "हमारी परामर्श सेवाएं लोड हो रही हैं...",
        "home.services.loadError": "अभी सेवाएं लोड करने में समस्या आ रही है।",
        "home.services.viewBookingOptions": "बुकिंग विकल्प देखें",
        "home.services.empty": "हमारी परामर्श सेवाएं जल्द ही यहां दिखाई देंगी।",
        "home.services.startingFrom": "शुरुआत",
        "home.services.contactUs": "संपर्क करें",
        "home.services.video": "वीडियो",
        "home.services.voice": "वॉइस",
        "home.services.videoVoice": "वीडियो • वॉइस",
        "home.services.bookNow": "अभी बुक करें",
        "home.services.bookService": "बुक करें",
        "home.services.specific": "कुछ विशेष खोज रहे हैं?",
        "home.services.specificDescription": "सभी परामर्श विकल्प देखें और अपने लिए सही विकल्प चुनें।",
        "home.services.bookConsultation": "परामर्श बुक करें",
        "home.process.step1.title": "अपनी सेवा चुनें",
        "home.process.step1.description": "वह परामर्श सेवा चुनें जो आपकी आवश्यकता के लिए सबसे उपयुक्त हो।",
        "home.process.step2.title": "अपना समय बुक करें",
        "home.process.step2.description": "अपने परामर्श के लिए सुविधाजनक तारीख और समय चुनें।",
        "home.process.step3.title": "हमारे विशेषज्ञ से जुड़ें",
        "home.process.step3.description": "अपनी पसंदीदा संचार विधि के माध्यम से परामर्श से जुड़ें।",
        "home.process.step4.title": "व्यक्तिगत मार्गदर्शन प्राप्त करें",
        "home.process.step4.description": "अपनी परिस्थिति के अनुसार व्यावहारिक सुझाव और मार्गदर्शन प्राप्त करें।",
        "home.testimonials.loading": "ग्राहकों के अनुभव लोड हो रहे हैं",
        "home.testimonials.verified": "✓ सत्यापित ग्राहक",
        "home.testimonials.empty": "समीक्षा और अनुमोदन के बाद हमारे ग्राहकों के अनुभव यहां दिखाई देंगे।",
        "home.faq.q1": "मैं परामर्श कैसे बुक कर सकता हूं?",
        "home.faq.a1": "परामर्श बुक करें बटन पर क्लिक करें, अपनी पसंदीदा सेवा चुनें, उपलब्ध तारीख और समय चुनें और अपनी बुकिंग की पुष्टि करें।",
        "home.faq.q2": "क्या ऑनलाइन परामर्श उपलब्ध हैं?",
        "home.faq.a2": "हां। सभी परामर्श Google Meet या आपके पसंदीदा संचार प्लेटफॉर्म के माध्यम से ऑनलाइन उपलब्ध हैं।",
        "home.faq.q3": "आप कौन-कौन सी सेवाएं प्रदान करते हैं?",
        "home.faq.a3": "हम वैदिक ज्योतिष, अंक ज्योतिष, टैरो रीडिंग, करियर मार्गदर्शन, विवाह परामर्श और बिजनेस परामर्श प्रदान करते हैं।",
        "home.faq.q4": "एक परामर्श कितने समय का होता है?",
        "home.faq.a4": "चयनित सेवा के आधार पर अधिकांश परामर्श 30 से 60 मिनट तक चलते हैं।",
        "home.faq.q5": "क्या मैं अपनी बुकिंग का समय बदल सकता हूं?",
        "home.faq.a5": "हां। अपॉइंटमेंट के समय से पहले आप हमारी सहायता टीम से संपर्क करके समय बदलने का अनुरोध कर सकते हैं।",

        // Services
        "services.eyebrow": "हमारी सेवाएँ",
        "services.title": "उन सवालों के लिए मार्गदर्शन जो महत्वपूर्ण हैं।",
        "services.description":
        "हर परामर्श आपकी परिस्थिति को समझने, विकल्पों को देखने और अधिक स्पष्टता के साथ आगे बढ़ने में आपकी सहायता करने के लिए तैयार किया गया है।",
        "services.findGuidance": "अपना मार्गदर्शन खोजें",
        "services.bookConsultation": "परामर्श बुक करें",

        "services.personalApproach.eyebrow": "व्यक्तिगत दृष्टिकोण",
        "services.personalApproach.title": "आपके अनुसार तैयार मार्गदर्शन",
        "services.personalApproach.description":
        "आपके सवाल अनोखे हैं। हमारा परामर्श आपकी परिस्थिति को समझने और सार्थक मार्गदर्शन देने के लिए तैयार किया गया है।",

        "services.guidance.eyebrow": "व्यक्तिगत मार्गदर्शन",
        "services.guidance.title": "अपनी आवश्यकता के अनुसार मार्गदर्शन चुनें",
        "services.guidance.description":
        "हमारी विभिन्न परामर्श सेवाओं को देखें।",

        "services.receive.eyebrow": "आपको क्या मिलेगा",
        "services.receive.title": "सिर्फ उत्तरों से कहीं अधिक",
        "services.receive.description":
        "स्पष्टता, दृष्टिकोण और व्यावहारिक दिशा पर केंद्रित एक विचारपूर्ण परामर्श।",

        "services.live.eyebrow": "उपलब्ध सेवाएँ",
        "services.live.title": "हमारे परामर्श देखें",
        "services.live.description":
        "वर्तमान में उपलब्ध परामर्श सेवाओं में से चुनें।",

        "services.process.eyebrow": "परामर्श कैसे होता है",
        "services.process.title": "एक सरल और व्यक्तिगत प्रक्रिया",
        "services.process.description":
        "सेवा चुनें, अपना पसंदीदा विशेषज्ञ चुनें और अपना परामर्श निर्धारित करें।",

        "services.cta.eyebrow": "समझ नहीं आ रहा कहाँ से शुरू करें?",
        "services.cta.title": "सही मार्गदर्शन खोजने में हम आपकी सहायता करेंगे",
        "services.cta.description":
        "हमें बताइए कि आप किस प्रकार का मार्गदर्शन चाहते हैं और अपने लिए उपयुक्त परामर्श खोजें।",
        "services.cta.button": "मेरा मार्गदर्शन खोजें",

        // Service Finder
        "finder.title": "अपना मार्गदर्शन खोजें",
        "finder.description":
        "बताइए कि आपको किस विषय में सहायता चाहिए और हम आपके लिए उपयुक्त परामर्श खोजने में मदद करेंगे।",
        "finder.concernLabel": "आप किस विषय पर मार्गदर्शन चाहते हैं?",
        "finder.questionLabel": "थोड़ा और बताइए",
        "finder.questionPlaceholder":
        "अपना सवाल या परिस्थिति लिखें...",
        "finder.continue": "आगे बढ़ें",
        "finder.back": "वापस",
        "finder.recommendation": "आपके लिए मार्गदर्शन",
        "finder.recommended": "आपके लिए सुझाया गया",
        "finder.bookService": "यह परामर्श बुक करें",
        "finder.noMatch":
        "हमें अभी कोई मजबूत सुझाव नहीं मिला। अपना सवाल दूसरे तरीके से लिखकर देखें।",
        "finder.tryAgain": "पुनः प्रयास करें",

        // About
        "about.eyebrow": "हमारे बारे में",
        "about.title": "अनुभव, संवेदनशीलता और दृष्टिकोण के साथ मार्गदर्शन",
        "about.description":
        "हमारी कार्यशैली पारंपरिक ज्ञान को आज की जीवन-परिस्थितियों और सवालों की समझ के साथ जोड़ती है।",
        "about.story.eyebrow": "हमारी कहानी",
        "about.story.title": "मार्गदर्शन का एक व्यक्तिगत दृष्टिकोण",
        "about.story.description":
        "हर परामर्श सुनने, समझने और सार्थक मार्गदर्शन के लिए एक उपयुक्त स्थान बनाने से शुरू होता है।",
        "about.values.eyebrow": "हमारे मूल्य",
        "about.values.title": "हमारे कार्य को दिशा देने वाले मूल्य",
        "about.values.description":
        "ईमानदारी, व्यक्तिगत ध्यान और हर व्यक्ति की जीवन-यात्रा के प्रति सम्मान।",
        "about.cta.title": "अपनी यात्रा शुरू करने के लिए तैयार हैं?",
        "about.cta.description":
        "अपनी आवश्यकताओं के लिए सही मार्गदर्शन खोजने हेतु हमारी सेवाएँ देखें।",
        "about.cta.button": "सेवाएँ देखें",

        // Consultants
        "consultants.eyebrow": "हमारे विशेषज्ञ",
        "consultants.title": "अपने मार्गदर्शन विशेषज्ञों से मिलें",
        "consultants.description":
        "ज्योतिष, अंक ज्योतिष और टैरो में व्यक्तिगत मार्गदर्शन देने वाले अनुभवी विशेषज्ञ।",
        "consultants.personalGuidance": "व्यक्तिगत मार्गदर्शन",
        "consultants.meetExperts": "आपके मार्गदर्शन के पीछे के विशेषज्ञों से मिलें",
        "consultants.bookConsultant": "परामर्श बुक करें",
        "consultants.available": "उपलब्ध",
        "consultants.unavailable": "अभी उपलब्ध नहीं",
        "consultants.loading": "विशेषज्ञों की जानकारी लोड हो रही है...",
        "consultants.noConsultants":
        "अभी कोई विशेषज्ञ उपलब्ध नहीं है।",
        "consultants.specialization": "विशेषज्ञता",
        "consultants.consultationModes": "परामर्श के माध्यम",

        // Booking
        "booking.title": "अपना परामर्श बुक करें",
        "booking.description":
        "अपनी सेवा, विशेषज्ञ और पसंदीदा समय चुनें।",
        "booking.selectService": "सेवा चुनें",
        "booking.selectConsultant": "विशेषज्ञ चुनें",
        "booking.selectDate": "तारीख चुनें",
        "booking.selectTime": "समय चुनें",
        "booking.selectMode": "परामर्श का माध्यम चुनें",
        "booking.customerDetails": "आपकी जानकारी",
        "booking.name": "पूरा नाम",
        "booking.email": "ईमेल पता",
        "booking.mobile": "मोबाइल नंबर",
        "booking.videoCall": "वीडियो कॉल",
        "booking.voiceCall": "वॉइस कॉल",
        "booking.summary": "बुकिंग का सारांश",
        "booking.payment": "भुगतान",
        "booking.payNow": "अभी भुगतान करें",
        "booking.confirmBooking": "बुकिंग की पुष्टि करें",
        "booking.bookingConfirmed": "बुकिंग की पुष्टि हो गई",
        "booking.bookingId": "बुकिंग आईडी",
        "booking.loadingServices": "सेवाएँ लोड हो रही हैं...",
        "booking.loadingConsultants": "विशेषज्ञों की जानकारी लोड हो रही है...",
        "booking.noAvailability": "इस चयन के लिए कोई उपलब्धता नहीं है।",
        "booking.selectAnotherTime": "कृपया कोई दूसरा समय चुनें।",
        "booking.paymentError":
        "भुगतान प्रक्रिया में समस्या हुई।",
        "booking.bookingError":
        "बुकिंग बनाने में समस्या हुई।",

        // Contact
        "contact.eyebrow": "संपर्क करें",
        "contact.title": "हम आपकी कैसे सहायता कर सकते हैं?",
        "contact.description":
        "अपना सवाल भेजें या हमारे साथ अपना अनुभव साझा करें।",
        "contact.query": "सवाल भेजें",
        "contact.feedback": "फीडबैक दें",
        "contact.queryTitle": "अपना सवाल भेजें",
        "contact.feedbackTitle": "अपना अनुभव साझा करें",
        "contact.name": "आपका नाम",
        "contact.email": "ईमेल पता",
        "contact.mobile": "मोबाइल नंबर",
        "contact.category": "श्रेणी",
        "contact.subject": "विषय",
        "contact.message": "संदेश",
        "contact.rating": "आपकी रेटिंग",
        "contact.bookingId": "बुकिंग आईडी",
        "contact.service": "सेवा",
        "contact.sendQuery": "सवाल भेजें",
        "contact.submitFeedback": "फीडबैक सबमिट करें",
        "contact.querySuccess":
        "आपका सवाल सफलतापूर्वक भेज दिया गया है।",
        "contact.feedbackSuccess":
        "फीडबैक साझा करने के लिए धन्यवाद। आपका फीडबैक समीक्षा के लिए भेज दिया गया है।",
        "contact.feedbackModeration":
        "फीडबैक सार्वजनिक रूप से प्रकाशित होने से पहले उसकी समीक्षा की जाती है।",
        "contact.bookingFound": "बुकिंग मिल गई",
        "contact.bookingNotFound": "बुकिंग आईडी नहीं मिली।",
        "contact.loadingBooking": "बुकिंग की जाँच हो रही है...",
        "contact.optionalBookingId": "वैकल्पिक",

        // Track Booking
        "track.title": "अपनी बुकिंग ट्रैक करें",
        "track.description":
        "अपनी बुकिंग की नवीनतम स्थिति देखने के लिए जानकारी दर्ज करें।",
        "track.bookingId": "बुकिंग आईडी",
        "track.email": "ईमेल पता",
        "track.search": "बुकिंग ट्रैक करें",
        "track.bookingDetails": "बुकिंग विवरण",
        "track.status": "स्थिति",
        "track.service": "सेवा",
        "track.consultant": "विशेषज्ञ",
        "track.date": "तारीख",
        "track.time": "समय",
        "track.mode": "परामर्श का माध्यम",
        "track.notFound": "बुकिंग नहीं मिली।",
        "track.loading": "बुकिंग लोड हो रही है...",
        "track.error":
        "अभी आपकी बुकिंग की जानकारी प्राप्त नहीं हो सकी।",

        // Account
        "account.loginTitle": "वापसी पर स्वागत है",
        "account.loginDescription":
        "अपने अकाउंट और बुकिंग्स तक पहुँचने के लिए लॉगिन करें।",
        "account.email": "ईमेल पता",
        "account.password": "पासवर्ड",
        "account.login": "लॉगिन",
        "account.forgotPassword": "पासवर्ड भूल गए?",
        "account.createAccount": "अकाउंट बनाएँ",
        "account.createTitle": "अपना अकाउंट बनाएँ",
        "account.createDescription":
        "अपनी बुकिंग और परामर्श प्रबंधित करने के लिए अकाउंट बनाएँ।",
        "account.confirmPassword": "पासवर्ड की पुष्टि करें",
        "account.resetPassword": "पासवर्ड रीसेट करें",
        "account.logout": "लॉगआउट",
        "account.myBookings": "मेरी बुकिंग",
        "account.profile": "मेरी प्रोफ़ाइल",

        // Footer
        "footer.description":
        "स्पष्टता और सही दिशा के लिए व्यक्तिगत ज्योतिष, अंक ज्योतिष और टैरो मार्गदर्शन।",
        "footer.quickLinks": "त्वरित लिंक",
        "footer.services": "सेवाएँ",
        "footer.company": "कंपनी",
        "footer.support": "सहायता",
        "footer.privacy": "प्राइवेसी पॉलिसी",
        "footer.terms": "नियम और शर्तें",
        "footer.refund": "रद्दीकरण और रिफंड नीति",
        "footer.contact": "संपर्क करें",
        "footer.copyright": "सर्वाधिकार सुरक्षित।",
    },
    };

    /*
    * ============================================================
    * STORAGE
    * ============================================================
    */

    const LANGUAGE_STORAGE_KEY = "akshaanshh-language";

    /*
    * ============================================================
    * PROVIDER
    * ============================================================
    */

    export function LanguageProvider({
    children,
    }: {
    children: ReactNode;
    }) {
    const [language, setLanguageState] =
        useState<Language>("en");

    /*
    * Load saved language once on the client.
    */

    useEffect(() => {
        try {
        const savedLanguage =
            window.localStorage.getItem(
            LANGUAGE_STORAGE_KEY
            );

        if (
            savedLanguage === "en" ||
            savedLanguage === "hi"
        ) {
            setLanguageState(savedLanguage);
        }
        } catch (error) {
        console.error(
            "LANGUAGE STORAGE READ ERROR:",
            error
        );
        }
    }, []);

    /*
    * Change language globally.
    */

    const setLanguage = (
        nextLanguage: Language
    ) => {
        setLanguageState(nextLanguage);

        try {
        window.localStorage.setItem(
            LANGUAGE_STORAGE_KEY,
            nextLanguage
        );
        } catch (error) {
        console.error(
            "LANGUAGE STORAGE WRITE ERROR:",
            error
        );
        }
    };

    /*
    * Translation helper.
    *
    * English is used as a safe fallback if a key is
    * accidentally missing from Hindi.
    */

    const t = (
        key: TranslationKey
    ): string => {
        return (
        translations[language][key] ??
        translations.en[key] ??
        key
        );
    };

    return (
        <LanguageContext.Provider
        value={{
            language,
            setLanguage,
            t,
        }}
        >
        {children}
        </LanguageContext.Provider>
    );
    }

    /*
    * ============================================================
    * GLOBAL LANGUAGE HOOK
    * ============================================================
    */

    export function useLanguage() {
    const context =
        useContext(LanguageContext);

    if (!context) {
        throw new Error(
        "useLanguage must be used inside LanguageProvider."
        );
    }

    return context;
    }