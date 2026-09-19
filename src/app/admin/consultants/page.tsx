"use client";

import ConsultantAvailabilityCalendar from "@/components/admin/ConsultantAvailabilityCalendar";
import ConsultantInviteManager from "@/components/admin/ConsultantInviteManager";
import { isSlotInFutureIST } from "@/lib/bookingTime";

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
  availabilityWindows?: {
    date: string;
    startTime: string;
    endTime: string;
  }[];
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

/*
 * The main consultant account is protected from
 * the normal Remove Profile action.
 *
 * This is also enforced by the server-side API.
 */
const PROTECTED_CONSULTANT_EMAIL =
  "info.akshaanshhjyotish@gmail.com";

/*
 * Count only dates that currently contain at least one
 * future availability start time.
 *
 * New availabilityWindows are the primary source of truth.
 * Legacy availability is used only when no new windows exist.
 */
function countFutureAvailabilityDates(
  consultant: Consultant
) {
  const futureDates = new Set<string>();

  for (
    const window of
      consultant.availabilityWindows ?? []
  ) {
    const date =
      String(window?.date ?? "").trim();

    const startTime =
      String(window?.startTime ?? "").trim();

    if (
      date &&
      isSlotInFutureIST(
        date,
        startTime
      )
    ) {
      futureDates.add(date);
    }
  }

  if (
    futureDates.size === 0 &&
    (!consultant.availabilityWindows ||
      consultant.availabilityWindows.length === 0)
  ) {
    for (
      const item of
        consultant.availability ?? []
    ) {
      const date =
        String(item?.date ?? "").trim();

      if (!date) {
        continue;
      }

      const hasFutureTime =
        (item.times ?? []).some(
          (time) =>
            isSlotInFutureIST(
              date,
              String(time).trim()
            )
        );

      if (hasFutureTime) {
        futureDates.add(date);
      }
    }
  }

  return futureDates.size;
}

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

  const [isSuperAdmin, setIsSuperAdmin] =
    useState(false);

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
    loadAdminIdentity();
  }, []);

  async function loadAdminIdentity() {
    try {
      const response = await fetch(
        "/api/admin/me",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (data.success) {
        setIsSuperAdmin(
          Boolean(
            data.admin?.isSuperAdmin
          )
        );
      }
    } catch (identityError) {
      console.error(
        "Admin identity error:",
        identityError
      );
    }
  }

  async function loadConsultants() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/consultants",
        {
          cache: "no-store",
          credentials: "include",
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

    if (
      photoInputRef.current
    ) {
      photoInputRef.current.value =
        "";
    }
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

      if (
        !editingConsultant &&
        !form.photo
      ) {
        throw new Error(
          "Please upload a consultant photo."
        );
      }

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
          editingConsultant?.availability ??
          [],

        active:
          form.active,
      };

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

            credentials:
              "include",

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

      await loadConsultants();

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
   * REMOVE CONSULTANT PROFILE
   * ============================================
   *
   * This is a soft removal.
   *
   * The consultant record remains in MongoDB
   * so historical bookings and references are
   * preserved.
   *
   * The API changes active to false.
   *
   * The protected main consultant cannot be
   * removed.
   */

  async function removeConsultant(
    consultant: Consultant
  ) {
    if (saving) {
      return;
    }

    const consultantEmail =
      consultant.email
        .trim()
        .toLowerCase();

    if (
      consultantEmail ===
      PROTECTED_CONSULTANT_EMAIL
    ) {
      setError(
        "The main consultant account cannot be removed."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${consultant.name} from the consultant profiles?\n\nThe consultant will disappear from the active consultant list. Historical booking records will be preserved.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response =
        await fetch(
          `/api/admin/consultants/${consultant._id}`,
          {
            method: "DELETE",
            credentials: "include",
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
            "Unable to remove consultant profile."
        );
      }

      await loadConsultants();

      if (
        editingConsultant?._id ===
        consultant._id
      ) {
        closeForm();
      }
    } catch (error) {
      console.error(
        "Remove consultant error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to remove consultant profile."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ============================================
   * ACTIVE CONSULTANTS
   * ============================================
   *
   * Removed/inactive consultant records remain
   * in the database but are excluded from the
   * normal active consultant management list.
   */

  const activeConsultants =
    useMemo(() => {
      return consultants.filter(
        (consultant) =>
          consultant.active
      );
    }, [consultants]);

  /*
   * ============================================
   * FILTER ACTIVE CONSULTANTS
   * ============================================
   */

  const filteredConsultants =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return activeConsultants;
      }

      return activeConsultants.filter(
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
      activeConsultants,
      search,
    ]);

  /*
   * ============================================
   * STATISTICS
   * ============================================
   */

  const activeConsultantsCount =
    activeConsultants.length;

  const totalAvailabilityDates =
    activeConsultants.reduce(
      (total, consultant) =>
        total +
        countFutureAvailabilityDates(
          consultant
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
          onClick={() => {
            document
              .getElementById("consultant-invite-manager")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
          }}
          disabled={saving}
        >
          <span>
            +
          </span>

          Invite Consultant
        </button>

      </div>


      <ConsultantInviteManager
        onManualAdd={openAddForm}
      />


      <ConsultantAvailabilityCalendar
        consultants={activeConsultants}
        onEditConsultant={openEditForm}
        onConsultantsRefresh={
          loadConsultants
        }
      />

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
                    Availability is managed above.
                    Changes to the schedule are saved
                    separately from consultant profile
                    details.
                  </small>

                </div>

              </div>

              <div className="admin-consultant-calendar-management-note">

                <strong>
                  Schedule managed in Availability Manager
                </strong>

                <span>
                  Use the manager above for dates,
                  time windows and repeat schedules.
                  Your existing profile save still
                  preserves legacy availability data
                  for compatibility.
                </span>

                <button
                  type="button"
                  onClick={() =>
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    })
                  }
                  disabled={saving}
                >
                  Open Availability Manager ↑
                </button>

              </div>

            </div>


            {/* ==================================
                VISIBILITY
            ================================== */}

            <div className="admin-consultant-form-section">

              <label>
                Visibility
              </label>

              <label
                className={`admin-consultant-checkbox ${
                  !isSuperAdmin &&
                  editingConsultant
                    ? "is-restricted"
                    : ""
                }`}
              >

                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  disabled={
                    Boolean(
                      editingConsultant
                    ) &&
                    !isSuperAdmin
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
                  Make this consultant available to customers
                </span>

              </label>

              {editingConsultant &&
                !isSuperAdmin && (
                  <small className="admin-consultant-visibility-restricted">
                    Only the Super Administrator
                    can deactivate or reactivate
                    a consultant profile.
                  </small>
                )}

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
            disabled={saving}
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
                  activeConsultantsCount
                }
              </strong>

              <small>
                Active consultant profiles
              </small>

            </div>


            <div className="admin-consultants-stat">

              <span>
                ACTIVE
              </span>

              <strong>
                {
                  activeConsultantsCount
                }
              </strong>

              <small>
                Available to customers
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
                Across active consultants
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
              disabled={saving}
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
                  ACTIVE CONSULTANTS
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
                  No active consultants found
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
                      ) => {

                        const isProtectedConsultant =
                          consultant.email
                            .trim()
                            .toLowerCase() ===
                          PROTECTED_CONSULTANT_EMAIL;

                        return (
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
                                  {countFutureAvailabilityDates(
                                    consultant
                                  )}
                                </strong>

                                <span>
                                  date
                                  {countFutureAvailabilityDates(
                                    consultant
                                  ) !== 1
                                    ? "s"
                                    : ""}
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

                              <div className="admin-consultant-actions">

                                <button
                                  type="button"
                                  className="admin-consultant-edit"
                                  onClick={() =>
                                    openEditForm(
                                      consultant
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                >
                                  Edit
                                </button>

                                {consultant.active &&
                                  !isProtectedConsultant && (
                                    <button
                                      type="button"
                                      className="admin-consultant-remove"
                                      onClick={() =>
                                        removeConsultant(
                                          consultant
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                    >
                                      Remove Profile
                                    </button>
                                  )}

                              </div>

                            </td>

                          </tr>
                        );
                      }
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