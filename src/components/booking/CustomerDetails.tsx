"use client";

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
};

export default function CustomerDetails({
  category,
  formData,
  onChange,
}: CustomerDetailsProps) {
  return (
    <div className="booking-customer-details">

      <div className="booking-header">
        <p className="eyebrow">STEP 5</p>

        <h2 className="section-heading">
          Your Details
        </h2>

        <p className="section-description">
          Please provide the information required
          for your consultation.
        </p>
      </div>

      <div className="booking-form">

        {/* COMMON DETAILS */}

        <div className="booking-form-group">
          <label htmlFor="fullName">
            Full Name *
          </label>

          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) =>
              onChange("fullName", e.target.value)
            }
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="booking-form-row">

          <div className="booking-form-group">
            <label htmlFor="mobile">
              Mobile Number *
            </label>

            <input
              id="mobile"
              type="tel"
              value={formData.mobile}
              onChange={(e) =>
                onChange("mobile", e.target.value)
              }
              placeholder="Enter mobile number"
              required
            />
          </div>

          <div className="booking-form-group">
            <label htmlFor="email">
              Email ID *
            </label>

            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                onChange("email", e.target.value)
              }
              placeholder="Enter email address"
              required
            />
          </div>

        </div>

        {/* ASTROLOGY */}

        {category === "astrology" && (
          <>
            <div className="booking-form-row">

              <div className="booking-form-group">
                <label htmlFor="dob">
                  Date of Birth *
                </label>

                <input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    onChange("dob", e.target.value)
                  }
                  required
                />
              </div>

              <div className="booking-form-group">
                <label htmlFor="birthTime">
                  Exact Time of Birth *
                </label>

                <input
                  id="birthTime"
                  type="time"
                  value={formData.birthTime}
                  onChange={(e) =>
                    onChange(
                      "birthTime",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

            </div>

            <div className="booking-form-row">

              <div className="booking-form-group">
                <label htmlFor="birthPlace">
                  Place of Birth *
                </label>

                <input
                  id="birthPlace"
                  type="text"
                  value={formData.birthPlace}
                  onChange={(e) =>
                    onChange(
                      "birthPlace",
                      e.target.value
                    )
                  }
                  placeholder="City / Place of birth"
                  required
                />
              </div>

              <div className="booking-form-group">
                <label htmlFor="gender">
                  Gender
                </label>

                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) =>
                    onChange("gender", e.target.value)
                  }
                >
                  <option value="">
                    Prefer not to say
                  </option>

                  <option value="male">
                    Male
                  </option>

                  <option value="female">
                    Female
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

            </div>

            <div className="booking-form-group">
              <label htmlFor="language">
                Preferred Language *
              </label>

              <select
                id="language"
                value={formData.language}
                onChange={(e) =>
                  onChange(
                    "language",
                    e.target.value
                  )
                }
                required
              >
                <option value="">
                  Select language
                </option>

                <option value="hindi">
                  Hindi
                </option>

                <option value="english">
                  English
                </option>

                <option value="hinglish">
                  Hinglish
                </option>
              </select>
            </div>

            <div className="booking-form-group">
              <label htmlFor="concern">
                Main Concern / Question *
              </label>

              <textarea
                id="concern"
                value={formData.concern}
                onChange={(e) =>
                  onChange(
                    "concern",
                    e.target.value
                  )
                }
                placeholder="Tell us briefly what you would like guidance about..."
                rows={5}
                required
              />
            </div>

            {/* KUNDALI MATCHING */}

            <div className="booking-matching">

              <p className="booking-form-title">
                Kundali Matching — Second Person
              </p>

              <p className="booking-form-note">
                If this service is Kundali Matching,
                enter the details of the second person.
              </p>

              <div className="booking-form-group">
                <label htmlFor="person2Name">
                  Second Person's Full Name
                </label>

                <input
                  id="person2Name"
                  type="text"
                  value={formData.person2Name}
                  onChange={(e) =>
                    onChange(
                      "person2Name",
                      e.target.value
                    )
                  }
                  placeholder="Enter full name"
                />
              </div>

              <div className="booking-form-row">

                <div className="booking-form-group">
                  <label htmlFor="person2Dob">
                    Date of Birth
                  </label>

                  <input
                    id="person2Dob"
                    type="date"
                    value={formData.person2Dob}
                    onChange={(e) =>
                      onChange(
                        "person2Dob",
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="booking-form-group">
                  <label htmlFor="person2BirthTime">
                    Exact Time of Birth
                  </label>

                  <input
                    id="person2BirthTime"
                    type="time"
                    value={formData.person2BirthTime}
                    onChange={(e) =>
                      onChange(
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
                  type="text"
                  value={formData.person2BirthPlace}
                  onChange={(e) =>
                    onChange(
                      "person2BirthPlace",
                      e.target.value
                    )
                  }
                  placeholder="City / Place of birth"
                />
              </div>

            </div>
          </>
        )}

        {/* NUMEROLOGY */}

        {category === "numerology" && (
          <>
            <div className="booking-form-row">

              <div className="booking-form-group">
                <label htmlFor="numerologyDob">
                  Date of Birth *
                </label>

                <input
                  id="numerologyDob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) =>
                    onChange("dob", e.target.value)
                  }
                  required
                />
              </div>

              <div className="booking-form-group">
                <label htmlFor="currentName">
                  Current Name Spelling *
                </label>

                <input
                  id="currentName"
                  type="text"
                  value={formData.currentName}
                  onChange={(e) =>
                    onChange(
                      "currentName",
                      e.target.value
                    )
                  }
                  placeholder="Enter current name spelling"
                  required
                />
              </div>

            </div>

            <div className="booking-form-group">
              <label htmlFor="numerologyConcern">
                Specific Requirement *
              </label>

              <textarea
                id="numerologyConcern"
                value={formData.concern}
                onChange={(e) =>
                  onChange(
                    "concern",
                    e.target.value
                  )
                }
                placeholder="What would you like to understand or analyse?"
                rows={5}
                required
              />
            </div>
          </>
        )}

        {/* TAROT */}

        {category === "tarot" && (
          <div className="booking-form-group">

            <label htmlFor="tarotQuestion">
              Your Question *
            </label>

            <textarea
              id="tarotQuestion"
              value={formData.tarotQuestion}
              onChange={(e) =>
                onChange(
                  "tarotQuestion",
                  e.target.value
                )
              }
              placeholder="Enter your question..."
              rows={6}
              required
            />

          </div>
        )}

      </div>
    </div>
  );
}