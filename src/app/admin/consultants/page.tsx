"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Availability = {
  date: string;
  times: string[];
};

type Consultant = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  photo?: string;
  availableModes: ("video" | "voice")[];
  availability: Availability[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ConsultantForm = {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  video: boolean;
  voice: boolean;
  active: boolean;
  photo: string;
};

const initialForm: ConsultantForm = {
  name: "",
  email: "",
  phone: "",
  specialization: "",
  video: true,
  voice: true,
  active: true,
  photo: "",
};

export default function AdminConsultantsPage() {
  /*
   * ============================================
   * CONSULTANTS
   * ============================================
   */

  const [consultants, setConsultants] =
    useState<Consultant[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  /*
   * ============================================
   * FORM
   * ============================================
   */

  const [showForm, setShowForm] =
    useState(false);

  const [editingConsultant, setEditingConsultant] =
    useState<Consultant | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [form, setForm] =
    useState<ConsultantForm>({
      ...initialForm,
    });

  /*
   * ============================================
   * PHOTO
   * ============================================
   */

  const photoInputRef =
    useRef<HTMLInputElement | null>(null);

  const [photoPreview, setPhotoPreview] =
    useState("");

  /*
   * ============================================
   * AVAILABILITY
   * ============================================
   */

  const [availability, setAvailability] =
    useState<Availability[]>([]);

  const [newDate, setNewDate] =
    useState("");

  const [timeInputs, setTimeInputs] =
    useState<Record<string, string>>({});

  /*
   * ============================================
   * FORM SCROLL REF
   * ============================================
   */

  const formCardRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * ============================================
   * LOAD CONSULTANTS
   * ============================================
   */

  useEffect(() => {
    loadConsultants();
  }, []);

  async function loadConsultants() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/consultants",
        {
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
            "Unable to load consultants."
        );
      }

      setConsultants(
        data.consultants || []
      );
    } catch (error) {
      console.error(
        "Admin consultants error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load consultants."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================
   * COMPRESS PHOTO
   * ============================================
   *
   * We resize the uploaded image before
   * storing it in the request.
   */

  function compressPhoto(
    file: File
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          const image =
            new Image();

          image.onload = () => {
            const maxSize = 800;

            let width =
              image.width;

            let height =
              image.height;

            if (
              width > maxSize ||
              height > maxSize
            ) {
              if (
                width > height
              ) {
                height =
                  Math.round(
                    (height /
                      width) *
                      maxSize
                  );

                width =
                  maxSize;
              } else {
                width =
                  Math.round(
                    (width /
                      height) *
                      maxSize
                  );

                height =
                  maxSize;
              }
            }

            const canvas =
              document.createElement(
                "canvas"
              );

            canvas.width =
              width;

            canvas.height =
              height;

            const context =
              canvas.getContext(
                "2d"
              );

            if (!context) {
              reject(
                new Error(
                  "Unable to process image."
                )
              );

              return;
            }

            context.drawImage(
              image,
              0,
              0,
              width,
              height
            );

            resolve(
              canvas.toDataURL(
                "image/jpeg",
                0.82
              )
            );
          };

          image.onerror = () => {
            reject(
              new Error(
                "Unable to read image."
              )
            );
          };

          image.src =
            String(
              reader.result
            );
        };

        reader.onerror = () => {
          reject(
            new Error(
              "Unable to read selected image."
            )
          );
        };

        reader.readAsDataURL(
          file
        );
      }
    );
  }

  /*
   * ============================================
   * SELECT PHOTO
   * ============================================
   */

  async function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Only images
     */

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setFormError(
        "Please select a valid image file."
      );

      return;
    }

    /*
     * Limit original upload size
     */

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setFormError(
        "Please select an image smaller than 5 MB."
      );

      return;
    }

    try {
      setFormError("");

      const compressed =
        await compressPhoto(
          file
        );

      setPhotoPreview(
        compressed
      );

      setForm(
        (current) => ({
          ...current,
          photo:
            compressed,
        })
      );
    } catch (error) {
      console.error(
        "Photo processing error:",
        error
      );

      setFormError(
        "Unable to process the selected photo."
      );
    }
  }

  /*
   * ============================================
   * REMOVE PHOTO
   * ============================================
   */

  function removePhoto() {
    setPhotoPreview("");

    setForm(
      (current) => ({
        ...current,
        photo: "",
      })
    );

    if (
      photoInputRef.current
    ) {
      photoInputRef.current.value =
        "";
    }
  }

  /*
   * ============================================
   * OPEN ADD FORM
   * ============================================
   */

  function openAddForm() {
    if (saving) {
      return;
    }

    setEditingConsultant(null);

    setForm({
      ...initialForm,
    });

    setPhotoPreview("");

    setAvailability([]);

    setNewDate("");

    setTimeInputs({});

    setFormError("");

    setShowForm(true);

    setTimeout(() => {
      formCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  /*
   * ============================================
   * OPEN EDIT FORM
   * ============================================
   */

  function openEditForm(
    consultant: Consultant
  ) {
    if (saving) {
      return;
    }

    setEditingConsultant(
      consultant
    );

    setForm({
      name:
        consultant.name,

      email:
        consultant.email,

      phone:
        consultant.phone,

      specialization:
        consultant.specialization,

      video:
        consultant.availableModes.includes(
          "video"
        ),

      voice:
        consultant.availableModes.includes(
          "voice"
        ),

      active:
        consultant.active,

      photo:
        consultant.photo || "",
    });

    setPhotoPreview(
      consultant.photo || ""
    );

    setAvailability(
      consultant.availability
        ? consultant.availability.map(
            (item) => ({
              date: item.date,
              times: [
                ...(item.times || []),
              ],
            })
          )
        : []
    );

    setNewDate("");

    setTimeInputs({});

    setFormError("");

    setShowForm(true);

    setTimeout(() => {
      formCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  /*
   * ============================================
   * CLOSE FORM
   * ============================================
   */

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingConsultant(null);

    setFormError("");

    setForm({
      ...initialForm,
    });

    setPhotoPreview("");

    setAvailability([]);

    setNewDate("");

    setTimeInputs({});

    if (
      photoInputRef.current
    ) {
      photoInputRef.current.value =
        "";
    }
  }

  /*
   * ============================================
   * ADD AVAILABILITY DATE
   * ============================================
   */

  function addAvailabilityDate() {
    if (!newDate) {
      setFormError(
        "Please select an availability date."
      );

      return;
    }

    const alreadyExists =
      availability.some(
        (item) =>
          item.date ===
          newDate
      );

    if (alreadyExists) {
      setFormError(
        "This date has already been added."
      );

      return;
    }

    setAvailability(
      [
        ...availability,
        {
          date: newDate,
          times: [],
        },
      ].sort((a, b) =>
        a.date.localeCompare(
          b.date
        )
      )
    );

    setNewDate("");

    setFormError("");
  }

  /*
   * ============================================
   * REMOVE AVAILABILITY DATE
   * ============================================
   */

  function removeAvailabilityDate(
    date: string
  ) {
    setAvailability(
      availability.filter(
        (item) =>
          item.date !== date
      )
    );

    setTimeInputs(
      (current) => {
        const updated = {
          ...current,
        };

        delete updated[date];

        return updated;
      }
    );
  }

  /*
   * ============================================
   * CHANGE TIME INPUT
   * ============================================
   */

  function updateTimeInput(
    date: string,
    time: string
  ) {
    setTimeInputs(
      (current) => ({
        ...current,
        [date]: time,
      })
    );
  }

  /*
   * ============================================
   * ADD TIME SLOT
   * ============================================
   */

  function addTimeSlot(
    date: string
  ) {
    const time =
      timeInputs[date] || "";

    if (!time) {
      setFormError(
        "Please select a time."
      );

      return;
    }

    setAvailability(
      availability.map(
        (item) => {
          if (
            item.date !==
            date
          ) {
            return item;
          }

          if (
            item.times.includes(
              time
            )
          ) {
            return item;
          }

          return {
            ...item,

            times: [
              ...item.times,
              time,
            ].sort(),
          };
        }
      )
    );

    setTimeInputs(
      (current) => ({
        ...current,
        [date]: "",
      })
    );

    setFormError("");
  }

  /*
   * ============================================
   * REMOVE TIME SLOT
   * ============================================
   */

  function removeTimeSlot(
    date: string,
    time: string
  ) {
    setAvailability(
      availability.map(
        (item) => {
          if (
            item.date !==
            date
          ) {
            return item;
          }

          return {
            ...item,

            times:
              item.times.filter(
                (itemTime) =>
                  itemTime !==
                  time
              ),
          };
        }
      )
    );
  }

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
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  /*
   * ============================================
   * SAVE CONSULTANT
   * ============================================
   */

  async function saveConsultant(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      setFormError("");

      /*
       * FRONTEND VALIDATION
       */

      if (
        !form.name.trim() ||
        !form.email.trim() ||
        !form.phone.trim() ||
        !form.specialization.trim()
      ) {
        throw new Error(
          "Name, email, phone and specialization are required."
        );
      }

      if (
        !form.video &&
        !form.voice
      ) {
        throw new Error(
          "Select at least one consultation mode."
        );
      }

      /*
       * PHOTO REQUIRED FOR NEW CONSULTANT
       */

      if (
        !editingConsultant &&
        !form.photo
      ) {
        throw new Error(
          "Please upload a consultant photo."
        );
      }

      /*
       * NORMALIZE AVAILABILITY
       */

      const cleanedAvailability =
        availability
          .map(
            (item) => ({
              date:
                item.date,

              times: [
                ...new Set(
                  item.times
                ),
              ].sort(),
            })
          )
          .sort((a, b) =>
            a.date.localeCompare(
              b.date
            )
          );

      /*
       * BUILD REQUEST
       */

      const payload = {
        name:
          form.name.trim(),

        email:
          form.email.trim(),

        phone:
          form.phone.trim(),

        specialization:
          form.specialization.trim(),

        photo:
          form.photo,

        availableModes: [
          ...(form.video
            ? ["video"]
            : []),

          ...(form.voice
            ? ["voice"]
            : []),
        ],

        availability:
          cleanedAvailability,

        active:
          form.active,
      };

      /*
       * CREATE / UPDATE
       */

      const url =
        editingConsultant
          ? `/api/admin/consultants/${editingConsultant._id}`
          : "/api/admin/consultants";

      const method =
        editingConsultant
          ? "PUT"
          : "POST";

      const response =
        await fetch(
          url,
          {
            method,

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
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
            `Unable to ${
              editingConsultant
                ? "update"
                : "create"
            } consultant.`
        );
      }

      /*
       * REFRESH
       */

      await loadConsultants();

      /*
       * CLOSE
       */

      closeForm();
    } catch (error) {
      console.error(
        "Save consultant error:",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save consultant."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================
   * FILTER CONSULTANTS
   * ============================================
   */

  const filteredConsultants =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return consultants;
      }

      return consultants.filter(
        (consultant) =>
          consultant.name
            .toLowerCase()
            .includes(value) ||
          consultant.email
            .toLowerCase()
            .includes(value) ||
          consultant.phone
            .toLowerCase()
            .includes(value) ||
          consultant.specialization
            .toLowerCase()
            .includes(value)
      );
    }, [
      consultants,
      search,
    ]);

  /*
   * ============================================
   * STATISTICS
   * ============================================
   */

  const activeCount =
    consultants.filter(
      (consultant) =>
        consultant.active
    ).length;

  const totalAvailabilityDates =
    consultants.reduce(
      (
        total,
        consultant
      ) =>
        total +
        (
          consultant
            .availability
            ?.length || 0
        ),
      0
    );

  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <div className="admin-consultants-page">

        <div className="admin-consultants-loading">

          <span className="admin-consultants-spinner" />

          <p>
            Loading consultants...
          </p>

        </div>

      </div>
    );
  }

  /*
   * ============================================
   * PAGE
   * ============================================
   */

  return (
    <div className="admin-consultants-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="admin-consultants-header">

        <div>

          <div className="admin-consultants-eyebrow">
            CONSULTANT MANAGEMENT
          </div>

          <h1>
            Consultants
          </h1>

          <p>
            Manage astrologers,
            consultation modes and
            availability.
          </p>

        </div>

        <button
          type="button"
          className="admin-consultants-add"
          onClick={
            openAddForm
          }
        >
          <span>
            +
          </span>

          Add Consultant
        </button>

      </div>


      {/* ======================================
          FORM
      ====================================== */}

      {showForm && (
        <div
          ref={formCardRef}
          className="admin-consultant-form-card"
        >

          <div className="admin-consultant-form-header">

            <div>

              <div className="admin-consultants-eyebrow">
                {editingConsultant
                  ? "EDIT CONSULTANT"
                  : "NEW CONSULTANT"}
              </div>

              <h2>
                {editingConsultant
                  ? "Edit Consultant"
                  : "Add Consultant"}
              </h2>

              <p>
                {editingConsultant
                  ? "Update consultant details and availability."
                  : "Create a consultant profile for your consultation services."}
              </p>

            </div>

            <button
              type="button"
              className="admin-consultant-form-close"
              onClick={
                closeForm
              }
              disabled={
                saving
              }
              aria-label="Close form"
            >
              ×
            </button>

          </div>


          {/* FORM ERROR */}

          {formError && (
            <div className="admin-consultant-form-error">
              {formError}
            </div>
          )}


          <form
            className="admin-consultant-form"
            onSubmit={
              saveConsultant
            }
          >

            {/* ==================================
                PHOTO
            ================================== */}

            <div className="admin-consultant-form-section">

              <label>
                Consultant Photo
              </label>

              <small
                style={{
                  display:
                    "block",
                  marginTop:
                    "6px",
                  marginBottom:
                    "14px",
                  opacity:
                    0.7,
                }}
              >
                Upload a professional
                photo for the consultant
                profile.
              </small>

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "20px",
                  flexWrap:
                    "wrap",
                }}
              >

                {photoPreview ? (
                  <div
                    style={{
                      position:
                        "relative",
                      width:
                        "130px",
                      height:
                        "130px",
                    }}
                  >

                    <img
                      src={
                        photoPreview
                      }
                      alt={
                        form.name ||
                        "Consultant"
                      }
                      style={{
                        width:
                          "130px",
                        height:
                          "130px",
                        objectFit:
                          "cover",
                        borderRadius:
                          "50%",
                        border:
                          "3px solid #eee",
                      }}
                    />

                    <button
                      type="button"
                      onClick={
                        removePhoto
                      }
                      disabled={
                        saving
                      }
                      style={{
                        position:
                          "absolute",
                        top:
                          "-8px",
                        right:
                          "-8px",
                        width:
                          "30px",
                        height:
                          "30px",
                        borderRadius:
                          "50%",
                        border:
                          "none",
                        background:
                          "#111",
                        color:
                          "#fff",
                        cursor:
                          "pointer",
                        fontSize:
                          "18px",
                      }}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>

                  </div>
                ) : (
                  <div
                    style={{
                      width:
                        "130px",
                      height:
                        "130px",
                      borderRadius:
                        "50%",
                      border:
                        "2px dashed #ccc",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      textAlign:
                        "center",
                      fontSize:
                        "13px",
                      opacity:
                        0.65,
                    }}
                  >
                    No photo
                  </div>
                )}

                <div>

                  <input
                    ref={
                      photoInputRef
                    }
                    type="file"
                    accept="image/*"
                    onChange={
                      handlePhotoChange
                    }
                    disabled={
                      saving
                    }
                  />

                  <p
                    style={{
                      marginTop:
                        "8px",
                      fontSize:
                        "13px",
                      opacity:
                        0.65,
                    }}
                  >
                    JPG, PNG or WebP.
                    Maximum 5 MB.
                  </p>

                </div>

              </div>

            </div>


            {/* ==================================
                BASIC INFORMATION
            ================================== */}

            <div className="admin-consultant-form-grid">

              <div className="admin-consultant-field">

                <label>
                  Consultant Name
                </label>

                <input
                  type="text"
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      name:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="Akshaanshh"
                  required
                />

              </div>


              <div className="admin-consultant-field">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      email:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="consultant@example.com"
                  required
                />

              </div>


              <div className="admin-consultant-field">

                <label>
                  Phone
                </label>

                <input
                  type="tel"
                  value={
                    form.phone
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      phone:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="+91 9876543210"
                  required
                />

              </div>


              <div className="admin-consultant-field">

                <label>
                  Specialization
                </label>

                <input
                  type="text"
                  value={
                    form.specialization
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      specialization:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="Vedic Astrology"
                  required
                />

              </div>

            </div>


            {/* ==================================
                CONSULTATION MODES
            ================================== */}

            <div className="admin-consultant-form-section">

              <label>
                Consultation Modes
              </label>

              <div className="admin-consultant-checkboxes">

                <label className="admin-consultant-checkbox">

                  <input
                    type="checkbox"
                    checked={
                      form.video
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        video:
                          event
                            .target
                            .checked,
                      })
                    }
                  />

                  <span>
                    Video Consultation
                  </span>

                </label>


                <label className="admin-consultant-checkbox">

                  <input
                    type="checkbox"
                    checked={
                      form.voice
                    }
                    onChange={(
                      event
                    ) =>
                      setForm({
                        ...form,
                        voice:
                          event
                            .target
                            .checked,
                      })
                    }
                  />

                  <span>
                    Voice Consultation
                  </span>

                </label>

              </div>

            </div>


            {/* ==================================
                AVAILABILITY
            ================================== */}

            <div className="admin-consultant-form-section">

              <div className="admin-consultant-section-heading">

                <div>

                  <label>
                    Availability
                  </label>

                  <small>
                    Availability belongs
                    to this consultant
                    and can be used
                    across services.
                  </small>

                </div>

              </div>


              <div className="admin-consultant-availability-add">

                <input
                  type="date"
                  value={
                    newDate
                  }
                  onChange={(
                    event
                  ) =>
                    setNewDate(
                      event
                        .target
                        .value
                    )
                  }
                />

                <button
                  type="button"
                  onClick={
                    addAvailabilityDate
                  }
                >
                  + Add Date
                </button>

              </div>


              {availability.length ===
              0 ? (
                <div className="admin-consultant-availability-empty">
                  No availability
                  dates added yet.
                </div>
              ) : (

                <div className="admin-consultant-availability-list">

                  {availability.map(
                    (
                      item
                    ) => (

                      <div
                        key={
                          item.date
                        }
                        className="admin-consultant-availability-item"
                      >

                        <div className="admin-consultant-availability-date">

                          <strong>
                            {formatDate(
                              item.date
                            )}
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              removeAvailabilityDate(
                                item.date
                              )
                            }
                          >
                            Remove Date
                          </button>

                        </div>


                        <div className="admin-consultant-time-add">

                          <input
                            type="time"
                            value={
                              timeInputs[
                                item.date
                              ] ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateTimeInput(
                                item.date,
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              addTimeSlot(
                                item.date
                              )
                            }
                          >
                            + Add Time
                          </button>

                        </div>


                        <div className="admin-consultant-time-slots">

                          {item.times.length ===
                          0 ? (

                            <span>
                              No time slots
                              added yet.
                            </span>

                          ) : (

                            item.times.map(
                              (
                                time
                              ) => (

                                <button
                                  key={
                                    time
                                  }
                                  type="button"
                                  onClick={() =>
                                    removeTimeSlot(
                                      item.date,
                                      time
                                    )
                                  }
                                  title="Remove time"
                                >

                                  {time}

                                  <b>
                                    ×
                                  </b>

                                </button>

                              )
                            )

                          )}

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>


            {/* ==================================
                VISIBILITY
            ================================== */}

            <div className="admin-consultant-form-section">

              <label>
                Visibility
              </label>

              <label className="admin-consultant-checkbox">

                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      active:
                        event
                          .target
                          .checked,
                    })
                  }
                />

                <span>
                  Make this consultant
                  available to
                  customers
                </span>

              </label>

            </div>


            {/* ==================================
                ACTIONS
            ================================== */}

            <div className="admin-consultant-form-actions">

              <button
                type="button"
                className="admin-consultant-cancel"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="admin-consultant-submit"
                disabled={
                  saving
                }
              >

                {saving
                  ? "Saving..."
                  : editingConsultant
                  ? "Save Changes"
                  : "Create Consultant"}

              </button>

            </div>

          </form>

        </div>
      )}


      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div className="admin-consultants-error">

          <strong>
            Unable to load consultants
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={
              loadConsultants
            }
          >
            Try Again
          </button>

        </div>
      )}


      {/* ======================================
          STATISTICS
      ====================================== */}

      {!error && (
        <>

          <div className="admin-consultants-stats">

            <div className="admin-consultants-stat">

              <span>
                TOTAL CONSULTANTS
              </span>

              <strong>
                {
                  consultants.length
                }
              </strong>

              <small>
                All configured
                consultants
              </small>

            </div>


            <div className="admin-consultants-stat">

              <span>
                ACTIVE
              </span>

              <strong>
                {
                  activeCount
                }
              </strong>

              <small>
                Available to
                customers
              </small>

            </div>


            <div className="admin-consultants-stat">

              <span>
                AVAILABILITY DATES
              </span>

              <strong>
                {
                  totalAvailabilityDates
                }
              </strong>

              <small>
                Across all consultants
              </small>

            </div>

          </div>


          {/* ==================================
              CONTROLS
          ================================== */}

          <div className="admin-consultants-controls">

            <div className="admin-consultants-search">

              <span>
                ⌕
              </span>

              <input
                type="text"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Search consultants..."
              />

            </div>


            <button
              type="button"
              className="admin-consultants-refresh"
              onClick={
                loadConsultants
              }
            >
              ↻ Refresh
            </button>

          </div>


          {/* ==================================
              TABLE
          ================================== */}

          <div className="admin-consultants-table-card">

            <div className="admin-consultants-table-header">

              <div>

                <span>
                  CONSULTANTS
                </span>

                <strong>
                  {
                    filteredConsultants.length
                  }{" "}
                  consultant
                  {
                    filteredConsultants.length !==
                    1
                      ? "s"
                      : ""
                  }
                </strong>

              </div>

            </div>


            {filteredConsultants.length ===
            0 ? (

              <div className="admin-consultants-empty">

                <div>
                  ♙
                </div>

                <h3>
                  No consultants found
                </h3>

                <p>
                  Add a consultant or
                  change your search.
                </p>

              </div>

            ) : (

              <div className="admin-consultants-table-wrapper">

                <table className="admin-consultants-table">

                  <thead>

                    <tr>

                      <th>
                        CONSULTANT
                      </th>

                      <th>
                        SPECIALIZATION
                      </th>

                      <th>
                        CONTACT
                      </th>

                      <th>
                        MODES
                      </th>

                      <th>
                        AVAILABILITY
                      </th>

                      <th>
                        STATUS
                      </th>

                      <th>
                        ACTION
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredConsultants.map(
                      (
                        consultant
                      ) => (

                        <tr
                          key={
                            consultant._id
                          }
                        >

                          {/* CONSULTANT + PHOTO */}

                          <td>

                            <div
                              className="admin-consultant-name"
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap:
                                  "12px",
                              }}
                            >

                              {consultant.photo ? (
                                <img
                                  src={
                                    consultant.photo
                                  }
                                  alt={
                                    consultant.name
                                  }
                                  style={{
                                    width:
                                      "48px",
                                    height:
                                      "48px",
                                    borderRadius:
                                      "50%",
                                    objectFit:
                                      "cover",
                                    flexShrink:
                                      0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width:
                                      "48px",
                                    height:
                                      "48px",
                                    borderRadius:
                                      "50%",
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                    background:
                                      "#f1f1f1",
                                    flexShrink:
                                      0,
                                  }}
                                >
                                  ♙
                                </div>
                              )}

                              <div
                                style={{
                                  display:
                                    "flex",
                                  flexDirection:
                                    "column",
                                }}
                              >

                                <strong>
                                  {
                                    consultant.name
                                  }
                                </strong>

                                <span>
                                  {
                                    consultant.email
                                  }
                                </span>

                              </div>

                            </div>

                          </td>


                          <td>
                            {
                              consultant.specialization
                            }
                          </td>


                          <td>

                            <div className="admin-consultant-contact">

                              <span>
                                {
                                  consultant.phone
                                }
                              </span>

                              <small>
                                {
                                  consultant.email
                                }
                              </small>

                            </div>

                          </td>


                          <td>

                            <div className="admin-consultant-modes">

                              {consultant.availableModes.includes(
                                "video"
                              ) && (
                                <span>
                                  Video
                                </span>
                              )}

                              {consultant.availableModes.includes(
                                "voice"
                              ) && (
                                <span>
                                  Voice
                                </span>
                              )}

                            </div>

                          </td>


                          <td>

                            <div className="admin-consultant-availability-summary">

                              <strong>
                                {
                                  consultant
                                    .availability
                                    ?.length ||
                                  0
                                }
                              </strong>

                              <span>
                                date
                                {
                                  (
                                    consultant
                                      .availability
                                      ?.length ||
                                    0
                                  ) !==
                                  1
                                    ? "s"
                                    : ""
                                }
                              </span>

                            </div>

                          </td>


                          <td>

                            <span
                              className={`admin-consultant-status ${
                                consultant.active
                                  ? "admin-consultant-status-active"
                                  : "admin-consultant-status-inactive"
                              }`}
                            >

                              <i />

                              {
                                consultant.active
                                  ? "Active"
                                  : "Inactive"
                              }

                            </span>

                          </td>


                          <td>

                            <button
                              type="button"
                              className="admin-consultant-edit"
                              onClick={() =>
                                openEditForm(
                                  consultant
                                )
                              }
                            >
                              Edit
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </>
      )}

    </div>
  );
}