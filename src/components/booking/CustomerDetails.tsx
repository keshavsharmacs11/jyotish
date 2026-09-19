"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export type CustomerFormData = {
  fullName: string;
  dob: string;
  birthTime: string;
  birthPlace: string;
  gender: string;
  mobile: string;
  email: string;
  concern: string;
  language: string;
  currentName: string;
  person2Name: string;
  person2Dob: string;
  person2BirthTime: string;
  person2BirthPlace: string;
  tarotQuestion: string;
};

type CustomerDetailsProps = {
  category: "astrology" | "numerology" | "tarot";
  formData: CustomerFormData;
  onChange: (
    field: keyof CustomerFormData,
    value: string
  ) => void;
  policyAgreed: boolean;
  onPolicyAgree: (agreed: boolean) => void;
  onPolicyLink?: () => void;
};

export type CustomerValidationErrors = Partial<
  Record<keyof CustomerFormData, string>
>;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const INDIAN_MOBILE_PATTERN =
  /^[6-9]\d{9}$/;

function sanitizeMobile(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidName(value: string): boolean {
  const normalized = value.trim();

  return (
    normalized.length >= 2 &&
    normalized.length <= 100 &&
    /^[A-Za-zÀ-ÖØ-öø-ÿ.' -]+$/.test(
      normalized
    )
  );
}

function isValidEmail(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return (
    normalized.length <= 254 &&
    EMAIL_PATTERN.test(normalized)
  );
}

function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_PATTERN.test(
    value.trim()
  );
}

export function validateCustomerForm(
  category: CustomerDetailsProps["category"],
  formData: CustomerFormData,
  language: "en" | "hi" = "en"
): CustomerValidationErrors {
  const isHindi = language === "hi";
  const errors: CustomerValidationErrors = {};

  if (!isValidName(formData.fullName)) {
    errors.fullName =
      (isHindi ? "अपना पूरा नाम दर्ज करें। नाम में अक्षर, स्पेस, अपॉस्ट्रॉफी या हाइफ़न का उपयोग करें।" : "Enter your full name using letters, spaces, apostrophes or hyphens.");
  }

  if (!isValidIndianMobile(formData.mobile)) {
    errors.mobile =
      (isHindi ? "6, 7, 8 या 9 से शुरू होने वाला 10 अंकों का सही भारतीय मोबाइल नंबर दर्ज करें।" : "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.");
  }

  if (!isValidEmail(formData.email)) {
    errors.email =
      (isHindi ? "सही ईमेल पता दर्ज करें, जैसे name@example.com।" : "Enter a valid email address, such as name@example.com.");
  }

  if (category === "astrology") {
    if (!formData.dob) {
      errors.dob = (isHindi ? "जन्म तिथि आवश्यक है।" : "Date of birth is required.");
    }

    if (!formData.birthTime) {
      errors.birthTime =
        (isHindi ? "जन्म का सही समय आवश्यक है।" : "Exact time of birth is required.");
    }

    if (!formData.birthPlace.trim()) {
      errors.birthPlace =
        (isHindi ? "जन्म स्थान आवश्यक है।" : "Place of birth is required.");
    }

    if (!formData.language) {
      errors.language =
        (isHindi ? "अपनी पसंदीदा भाषा चुनें।" : "Please select your preferred language.");
    }

    if (!formData.concern.trim()) {
      errors.concern =
        (isHindi ? "अपना मुख्य विषय या प्रश्न दर्ज करें।" : "Please enter your main concern or question.");
    }

    if (
      formData.person2Name.trim() ||
      formData.person2Dob ||
      formData.person2BirthTime ||
      formData.person2BirthPlace.trim()
    ) {
      if (
        formData.person2Name.trim() &&
        !isValidName(formData.person2Name)
      ) {
        errors.person2Name =
          (isHindi ? "दूसरे व्यक्ति का सही नाम दर्ज करें।" : "Enter a valid second person's name.");
      }
    }
  }

  if (category === "numerology") {
    if (!formData.dob) {
      errors.dob = (isHindi ? "जन्म तिथि आवश्यक है।" : "Date of birth is required.");
    }

    if (!formData.currentName.trim()) {
      errors.currentName =
        (isHindi ? "वर्तमान नाम की स्पेलिंग आवश्यक है।" : "Current name spelling is required.");
    } else if (!isValidName(formData.currentName)) {
      errors.currentName =
        (isHindi ? "वर्तमान नाम की सही स्पेलिंग दर्ज करें।" : "Enter a valid current name spelling.");
    }

    if (!formData.concern.trim()) {
      errors.concern =
        (isHindi ? "अपनी विशेष आवश्यकता दर्ज करें।" : "Please enter your specific requirement.");
    }
  }

  if (category === "tarot") {
    if (!formData.tarotQuestion.trim()) {
      errors.tarotQuestion =
        (isHindi ? "अपना प्रश्न दर्ज करें।" : "Please enter your question.");
    }
  }

  return errors;
}

function FieldMessage({
  id,
  error,
}: {
  id: string;
  error?: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <p
      id={`${id}-error`}
      className="booking-field-error"
      role="alert"
    >
      {error}
    </p>
  );
}

function fieldHasError(
  errors: CustomerValidationErrors,
  field: keyof CustomerFormData
) {
  return Boolean(errors[field]);
}

export default function CustomerDetails({
  category,
  formData,
  onChange,
  policyAgreed,
  onPolicyAgree,
  onPolicyLink,
}: CustomerDetailsProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [showValidation, setShowValidation] =
    useState(false);

  const errors = useMemo(
    () =>
      validateCustomerForm(
        category,
        formData,
        language
      ),
    [category, formData, language]
  );

  const handleChange = (
    field: keyof CustomerFormData,
    value: string
  ) => {
    let nextValue = value;

    if (field === "mobile") {
      nextValue = sanitizeMobile(value);
    }

    onChange(field, nextValue);

    if (showValidation) {
      setShowValidation(true);
    }
  };

  const handleBlur = () => {
    setShowValidation(true);
  };

  const inputClass = (
    field: keyof CustomerFormData
  ) =>
    fieldHasError(errors, field) &&
    showValidation
      ? "booking-input-invalid"
      : "";

  return (
    <section
      className="booking-customer-details"
      aria-labelledby="booking-customer-details-heading"
    >
      <div className="booking-header">
        <p className="eyebrow">{isHindi ? "चरण 5" : "STEP 5"}</p>

        <h2
          id="booking-customer-details-heading"
          className="section-heading"
        >
          {isHindi ? "आपकी जानकारी" : "Your Details"}</h2>

        <p className="section-description">
          {isHindi ? "अपनी परामर्श जानकारी सही-सही दर्ज करें। * वाले फ़ील्ड आवश्यक हैं।" : `Please provide accurate details for your
          consultation. Fields marked with * are
          required.`}
        </p>
      </div>

      <div className="booking-form">
        <div className="booking-form-section">
          <p className="booking-form-title">
            {isHindi ? "संपर्क जानकारी" : "Contact Information"}</p>

          <p className="booking-form-note">
            {isHindi ? "आपके मोबाइल नंबर और ईमेल का उपयोग बुकिंग से जुड़ी जानकारी और भुगतान की पुष्टि के लिए किया जाता है।" : `Your mobile number and email are used
            for booking communication and payment
            confirmation.`}
          </p>

          <div className="booking-form-group">
            <label htmlFor="fullName">
              {isHindi ? "पूरा नाम *" : "Full Name *"}</label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                handleChange(
                  "fullName",
                  e.target.value
                )
              }
              onBlur={handleBlur}
              placeholder={isHindi ? "अपना पूरा नाम दर्ज करें" : "Enter your full name"}
              autoComplete="name"
              maxLength={100}
              className={inputClass("fullName")}
              aria-invalid={
                showValidation &&
                !!errors.fullName
              }
              aria-describedby={
                showValidation &&
                errors.fullName
                  ? "fullName-error"
                  : undefined
              }
            />

            {showValidation && (
              <FieldMessage
                id="fullName"
                error={errors.fullName}
              />
            )}
          </div>

          <div className="booking-form-row">
            <div className="booking-form-group">
              <label htmlFor="mobile">
                {isHindi ? "मोबाइल नंबर *" : "Mobile Number *"}</label>

              <input
                id="mobile"
                name="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) =>
                  handleChange(
                    "mobile",
                    e.target.value
                  )
                }
                onBlur={handleBlur}
                placeholder={isHindi ? "10 अंकों का मोबाइल नंबर" : "10-digit mobile number"}
                autoComplete="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                className={inputClass("mobile")}
                aria-invalid={
                  showValidation &&
                  !!errors.mobile
                }
                aria-describedby={
                  showValidation &&
                  errors.mobile
                    ? "mobile-error"
                    : undefined
                }
              />

              {showValidation && (
                <FieldMessage
                  id="mobile"
                  error={errors.mobile}
                />
              )}

              <span className="booking-form-help">
                {isHindi
                  ? "ठीक 10 अंक दर्ज करें। भारतीय मोबाइल नंबर 6–9 से शुरू होना चाहिए।"
                  : "Enter exactly 10 digits. Indian mobile numbers must start with 6–9."}
              </span>
            </div>

            <div className="booking-form-group">
              <label htmlFor="email">
                {isHindi ? "ईमेल आईडी *" : "Email ID *"}</label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  handleChange(
                    "email",
                    e.target.value
                  )
                }
                onBlur={handleBlur}
                placeholder="name@example.com"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                className={inputClass("email")}
                aria-invalid={
                  showValidation &&
                  !!errors.email
                }
                aria-describedby={
                  showValidation &&
                  errors.email
                    ? "email-error"
                    : undefined
                }
              />

              {showValidation && (
                <FieldMessage
                  id="email"
                  error={errors.email}
                />
              )}

              <span className="booking-form-help">
                {isHindi
                  ? "Gmail, Outlook, Yahoo और अन्य कस्टम डोमेन स्वीकार किए जाते हैं।"
                  : "Gmail, Outlook, Yahoo and custom domains are accepted."}
              </span>
            </div>
          </div>
        </div>

        {category === "astrology" && (
          <>
            <div className="booking-form-section">
              <p className="booking-form-title">
                {isHindi ? "जन्म विवरण" : "Birth Details"}</p>

              <p className="booking-form-note">
                {isHindi ? "सही जन्म जानकारी से सलाहकार आपके सत्र की बेहतर तैयारी कर सकते हैं।" : `Accurate birth information helps the
                consultant prepare for your session.`}
              </p>

              <div className="booking-form-row">
                <div className="booking-form-group">
                  <label htmlFor="dob">
                    {isHindi ? "जन्म तिथि *" : "Date of Birth *"}</label>

                  <input
                    id="dob"
                    name="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      handleChange(
                        "dob",
                        e.target.value
                      )
                    }
                    onBlur={handleBlur}
                    className={inputClass("dob")}
                  />

                  {showValidation && (
                    <FieldMessage
                      id="dob"
                      error={errors.dob}
                    />
                  )}
                </div>

                <div className="booking-form-group">
                  <label htmlFor="birthTime">
                    {isHindi ? "जन्म का सही समय *" : "Exact Time of Birth *"}</label>

                  <input
                    id="birthTime"
                    name="birthTime"
                    type="time"
                    value={formData.birthTime}
                    onChange={(e) =>
                      handleChange(
                        "birthTime",
                        e.target.value
                      )
                    }
                    onBlur={handleBlur}
                    className={inputClass(
                      "birthTime"
                    )}
                  />

                  {showValidation && (
                    <FieldMessage
                      id="birthTime"
                      error={errors.birthTime}
                    />
                  )}
                </div>
              </div>

              <div className="booking-form-row">
                <div className="booking-form-group">
                  <label htmlFor="birthPlace">
                    {isHindi ? "जन्म स्थान *" : "Place of Birth *"}</label>

                  <input
                    id="birthPlace"
                    name="birthPlace"
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) =>
                      handleChange(
                        "birthPlace",
                        e.target.value
                      )
                    }
                    onBlur={handleBlur}
                    placeholder={isHindi ? "शहर / जन्म स्थान" : "City / Place of birth"}
                    maxLength={150}
                    className={inputClass(
                      "birthPlace"
                    )}
                  />

                  {showValidation && (
                    <FieldMessage
                      id="birthPlace"
                      error={errors.birthPlace}
                    />
                  )}
                </div>

                <div className="booking-form-group">
                  <label htmlFor="gender">
                    {isHindi ? "लिंग" : "Gender"}</label>

                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={(e) =>
                      handleChange(
                        "gender",
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      {isHindi ? "बताना पसंद नहीं" : "Prefer not to say"}</option>
                    <option value="male">
                      {isHindi ? "पुरुष" : "Male"}</option>
                    <option value="female">
                      {isHindi ? "महिला" : "Female"}</option>
                    <option value="other">
                      {isHindi ? "अन्य" : "Other"}</option>
                  </select>
                </div>
              </div>

              <div className="booking-form-group">
                <label htmlFor="language">
                  {isHindi ? "पसंदीदा भाषा *" : "Preferred Language *"}</label>

                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={(e) =>
                    handleChange(
                      "language",
                      e.target.value
                    )
                  }
                  onBlur={handleBlur}
                  className={inputClass(
                    "language"
                  )}
                >
                  <option value="">
                    {isHindi ? "भाषा चुनें" : "Select language"}</option>
                  <option value="hindi">
                    {isHindi ? "हिन्दी" : "Hindi"}</option>
                  <option value="english">
                    {isHindi ? "English" : "English"}</option>
                  <option value="hinglish">
                    {isHindi ? "Hinglish" : "Hinglish"}</option>
                </select>

                {showValidation && (
                  <FieldMessage
                    id="language"
                    error={errors.language}
                  />
                )}
              </div>

              <div className="booking-form-group">
                <label htmlFor="concern">
                  {isHindi ? "मुख्य विषय / प्रश्न *" : "Main Concern / Question *"}</label>

                <textarea
                  id="concern"
                  name="concern"
                  value={formData.concern}
                  onChange={(e) =>
                    handleChange(
                      "concern",
                      e.target.value
                    )
                  }
                  onBlur={handleBlur}
                  placeholder="Tell us briefly what you would like guidance about..."
                  rows={5}
                  maxLength={2000}
                  className={inputClass(
                    "concern"
                  )}
                />

                {showValidation && (
                  <FieldMessage
                    id="concern"
                    error={errors.concern}
                  />
                )}
              </div>
            </div>

            <div className="booking-matching">
              <p className="booking-form-title">
                {isHindi ? "कुंडली मिलान — दूसरे व्यक्ति का विवरण" : "Kundali Matching — Second Person"}</p>

              <p className="booking-form-note">
                {isHindi ? "यदि यह कुंडली मिलान सेवा है, तो दूसरे व्यक्ति का विवरण दर्ज करें।" : `If this service is Kundali Matching,
                enter the details of the second person.`}
              </p>

              <div className="booking-form-group">
                <label htmlFor="person2Name">
                  {isHindi ? "दूसरे व्यक्ति का पूरा नाम" : "Second Person's Full Name"}</label>

                <input
                  id="person2Name"
                  name="person2Name"
                  type="text"
                  value={formData.person2Name}
                  onChange={(e) =>
                    handleChange(
                      "person2Name",
                      e.target.value
                    )
                  }
                  onBlur={handleBlur}
                  placeholder={isHindi ? "पूरा नाम दर्ज करें" : "Enter full name"}
                  maxLength={100}
                  className={inputClass(
                    "person2Name"
                  )}
                />

                {showValidation && (
                  <FieldMessage
                    id="person2Name"
                    error={errors.person2Name}
                  />
                )}
              </div>

              <div className="booking-form-row">
                <div className="booking-form-group">
                  <label htmlFor="person2Dob">
                    {isHindi ? "जन्म तिथि" : "Date of Birth"}
                  </label>

                  <input
                    id="person2Dob"
                    name="person2Dob"
                    type="date"
                    value={formData.person2Dob}
                    onChange={(e) =>
                      handleChange(
                        "person2Dob",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="booking-form-group">
                  <label htmlFor="person2BirthTime">
                    {isHindi ? "जन्म का सही समय" : "Exact Time of Birth"}
                  </label>

                  <input
                    id="person2BirthTime"
                    name="person2BirthTime"
                    type="time"
                    value={formData.person2BirthTime}
                    onChange={(e) =>
                      handleChange(
                        "person2BirthTime",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="booking-form-group">
                <label htmlFor="person2BirthPlace">
                  Place of Birth
                </label>

                <input
                  id="person2BirthPlace"
                  name="person2BirthPlace"
                  type="text"
                  value={formData.person2BirthPlace}
                  onChange={(e) =>
                    handleChange(
                      "person2BirthPlace",
                      e.target.value
                    )
                  }
                  placeholder={isHindi ? "शहर / जन्म स्थान" : "City / Place of birth"}
                  maxLength={150}
                />
              </div>
            </div>
          </>
        )}

        {category === "numerology" && (
          <div className="booking-form-section">
            <p className="booking-form-title">
              {isHindi ? "अंक ज्योतिष विवरण" : "Numerology Details"}</p>

            <div className="booking-form-row">
              <div className="booking-form-group">
                <label htmlFor="numerologyDob">
                  {isHindi ? "जन्म तिथि *" : "Date of Birth *"}</label>

                <input
                  id="numerologyDob"
                  name="numerologyDob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    handleChange(
                      "dob",
                      e.target.value
                    )
                  }
                  onBlur={handleBlur}
                  className={inputClass("dob")}
                />

                {showValidation && (
                  <FieldMessage
                    id="dob"
                    error={errors.dob}
                  />
                )}
              </div>

              <div className="booking-form-group">
                <label htmlFor="currentName">
                  {isHindi ? "वर्तमान नाम की स्पेलिंग *" : "Current Name Spelling *"}</label>

                <input
                  id="currentName"
                  name="currentName"
                  type="text"
                  value={formData.currentName}
                  onChange={(e) =>
                    handleChange(
                      "currentName",
                      e.target.value
                    )
                  }
                  onBlur={handleBlur}
                  placeholder={isHindi ? "वर्तमान नाम की स्पेलिंग दर्ज करें" : "Enter current name spelling"}
                  maxLength={100}
                  className={inputClass(
                    "currentName"
                  )}
                />

                {showValidation && (
                  <FieldMessage
                    id="currentName"
                    error={errors.currentName}
                  />
                )}
              </div>
            </div>

            <div className="booking-form-group">
              <label htmlFor="numerologyConcern">
                {isHindi ? "विशेष आवश्यकता *" : "Specific Requirement *"}</label>

              <textarea
                id="numerologyConcern"
                name="numerologyConcern"
                value={formData.concern}
                onChange={(e) =>
                  handleChange(
                    "concern",
                    e.target.value
                  )
                }
                onBlur={handleBlur}
                placeholder={isHindi ? "आप क्या समझना या विश्लेषण करना चाहते हैं?" : "What would you like to understand or analyse?"}
                rows={5}
                maxLength={2000}
                className={inputClass("concern")}
              />

              {showValidation && (
                <FieldMessage
                  id="concern"
                  error={errors.concern}
                />
              )}
            </div>
          </div>
        )}

        {category === "tarot" && (
          <div className="booking-form-section">
            <p className="booking-form-title">
              {isHindi ? "टैरो प्रश्न" : "Tarot Question"}</p>

            <div className="booking-form-group">
              <label htmlFor="tarotQuestion">
                {isHindi ? "आपका प्रश्न *" : "Your Question *"}</label>

              <textarea
                id="tarotQuestion"
                name="tarotQuestion"
                value={formData.tarotQuestion}
                onChange={(e) =>
                  handleChange(
                    "tarotQuestion",
                    e.target.value
                  )
                }
                onBlur={handleBlur}
                placeholder={isHindi ? "अपना प्रश्न दर्ज करें..." : "Enter your question..."}
                rows={6}
                maxLength={2000}
                className={inputClass(
                  "tarotQuestion"
                )}
              />

              {showValidation && (
                <FieldMessage
                  id="tarotQuestion"
                  error={errors.tarotQuestion}
                />
              )}

              <span className="booking-form-help">
                {isHindi ? "अपना प्रश्न स्पष्ट और विशिष्ट रखें।" : `Keep your question clear and specific.`}
              </span>
            </div>
          </div>
        )}

        {/* =================================================
            POLICY CONSENT
        ================================================= */}

        <div className="booking-policy-consent">
          <label
            htmlFor="policyAgreement"
            className={`booking-policy-consent-label ${
              showValidation && !policyAgreed
                ? "booking-policy-consent-invalid"
                : ""
            }`}
          >
            <input
              id="policyAgreement"
              name="policyAgreement"
              type="checkbox"
              checked={policyAgreed}
              onChange={(e) =>
                onPolicyAgree(
                  e.target.checked
                )
              }
              onBlur={() =>
                setShowValidation(true)
              }
              aria-required="true"
              aria-invalid={
                showValidation &&
                !policyAgreed
              }
              aria-describedby="policyAgreement-help"
            />

            <span className="booking-policy-consent-text">
              {isHindi ? "मैंने पढ़ लिया है और सहमत हूँ: " : "I have read and agree to the "}
              <a
                href="/terms-and-conditions"
                onClick={() =>
                  onPolicyLink?.()
                }
              >
                {isHindi ? "नियम और शर्तें" : "Terms & Conditions"}
              </a>
              ,{" "}
              <a
                href="/privacy-policy"
                onClick={() =>
                  onPolicyLink?.()
                }
              >
                {isHindi ? "प्राइवेसी पॉलिसी" : "Privacy Policy"}
              </a>
              , and{" "}
              <a
                href="/cancellation-refund-policy"
                onClick={() =>
                  onPolicyLink?.()
                }
              >
                {isHindi
                  ? "रद्दीकरण और रिफंड नीति"
                  : "Cancellation & Refund Policy"}
              </a>
              .
            </span>
          </label>

          <span
            id="policyAgreement-help"
            className="booking-form-help"
          >
            This agreement is required before your booking can be
            reviewed and payment can begin.
          </span>

          {showValidation && !policyAgreed && (
            <p
              className="booking-field-error"
              role="alert"
            >
              {isHindi ? "जारी रखने से पहले आवश्यक नीतियों को स्वीकार करें।" : `Please accept the required policies before continuing.`}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
