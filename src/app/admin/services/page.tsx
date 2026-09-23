"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Service = {
  _id: string;
  serviceId: string;
  name: string;
  category: string;
  description?: string;
  duration?: number | null;
  price: number;
  currency: string;
  consultantIds: string[];
  availableModes: ("video" | "voice")[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type ServiceForm = {
  serviceId: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  price: string;
  currency: string;
  video: boolean;
  voice: boolean;
  active: boolean;
};

const initialForm: ServiceForm = {
  serviceId: "",
  name: "",
  category: "",
  description: "",
  duration: "",
  price: "",
  currency: "INR",
  video: true,
  voice: true,
  active: true,
};

export default function AdminServicesPage() {
  const [services, setServices] =
    useState<Service[]>([]);

    const formCardRef =
  useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  /* ============================================
     ADD / EDIT SERVICE
  ============================================ */

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [creating, setCreating] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [form, setForm] =
    useState<ServiceForm>({
      ...initialForm,
    });

  /*
   * ============================================
   * LOAD SERVICES
   * ============================================
   */

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/services",
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
            "Unable to load services."
        );
      }

      setServices(
        data.services || []
      );
    } catch (error) {
      console.error(
        "Admin services error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load services."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================
   * OPEN ADD FORM
   * ============================================
   */

  function openAddForm() {
    if (creating) {
      return;
    }

    setEditingService(null);

    setForm({
      ...initialForm,
    });

    setCreateError("");

    setShowAddForm(true);
  }

  /*
   * ============================================
   * OPEN EDIT FORM
   * ============================================
   */

  function openEditForm(
  service: Service
) {
  if (creating) {
    return;
  }

  setEditingService(service);

  setForm({
    serviceId: service.serviceId,
    name: service.name,
    category: service.category,
    description: service.description || "",
    duration:
      service.duration !== null &&
      service.duration !== undefined
        ? String(service.duration)
        : "",
    price: String(service.price),
    currency: service.currency || "INR",
    video:
      service.availableModes.includes("video"),
    voice:
      service.availableModes.includes("voice"),
    active: service.active,
  });

  setCreateError("");
  setShowAddForm(true);

  /*
   * Wait for the form to render,
   * then scroll to it.
   */
  setTimeout(() => {
    formCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 50);
}
  /*
   * ============================================
   * VALIDATE FORM
   * ============================================
   */

  function validateForm() {
    if (
      !form.serviceId.trim() ||
      !form.name.trim() ||
      !form.category.trim()
    ) {
      throw new Error(
        "Service ID, name and category are required."
      );
    }

    if (
      form.price === "" ||
      Number.isNaN(
        Number(form.price)
      ) ||
      Number(form.price) < 0
    ) {
      throw new Error(
        "Please enter a valid price."
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
      form.duration !== "" &&
      (
        Number.isNaN(
          Number(form.duration)
        ) ||
        Number(form.duration) <= 0
      )
    ) {
      throw new Error(
        "Duration must be greater than 0."
      );
    }
  }

  /*
   * ============================================
   * CREATE SERVICE
   * ============================================
   */

  async function createService(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      validateForm();

      const response = await fetch(
        "/api/admin/services",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            serviceId:
              form.serviceId
                .trim()
                .toLowerCase(),

            name:
              form.name.trim(),

            category:
              form.category.trim(),

            description:
              form.description.trim(),

            duration:
              form.duration === ""
                ? null
                : Number(
                    form.duration
                  ),

            price:
              Number(form.price),

            currency:
              form.currency,

            availableModes: [
              ...(form.video
                ? ["video"]
                : []),

              ...(form.voice
                ? ["voice"]
                : []),
            ],

            active:
              form.active,
          }),
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
            "Unable to create service."
        );
      }

      await loadServices();

      setForm({
        ...initialForm,
      });

      setEditingService(null);

      setShowAddForm(false);

      setCreateError("");
    } catch (error) {
      console.error(
        "Create service error:",
        error
      );

      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to create service."
      );
    } finally {
      setCreating(false);
    }
  }

  /*
   * ============================================
   * UPDATE SERVICE
   * ============================================
   */

  async function updateService(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      creating ||
      !editingService
    ) {
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      validateForm();

      const response = await fetch(
        "/api/admin/services",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            serviceId:
              editingService.serviceId,

            name:
              form.name.trim(),

            category:
              form.category.trim(),

            description:
              form.description.trim(),

            duration:
              form.duration === ""
                ? null
                : Number(
                    form.duration
                  ),

            price:
              Number(form.price),

            currency:
              form.currency,

            availableModes: [
              ...(form.video
                ? ["video"]
                : []),

              ...(form.voice
                ? ["voice"]
                : []),
            ],

            active:
              form.active,
          }),
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
            "Unable to update service."
        );
      }

      /*
       * Refresh the list so the
       * updated price/details appear
       * immediately.
       */

      await loadServices();

      /*
       * Close form
       */

      setForm({
        ...initialForm,
      });

      setEditingService(null);

      setShowAddForm(false);

      setCreateError("");
    } catch (error) {
      console.error(
        "Update service error:",
        error
      );

      setCreateError(
        error instanceof Error
          ? error.message
          : "Unable to update service."
      );
    } finally {
      setCreating(false);
    }
  }

  /*
   * ============================================
   * CLOSE FORM
   * ============================================
   */

  function closeAddForm() {
    if (creating) {
      return;
    }

    setShowAddForm(false);

    setEditingService(null);

    setCreateError("");

    setForm({
      ...initialForm,
    });
  }

  /*
   * ============================================
   * FILTER SERVICES
   * ============================================
   */

  const filteredServices =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return services;
      }

      return services.filter(
        (service) =>
          service.name
            .toLowerCase()
            .includes(value) ||
          service.category
            .toLowerCase()
            .includes(value) ||
          service.serviceId
            .toLowerCase()
            .includes(value)
      );
    }, [services, search]);

  /*
   * ============================================
   * STATISTICS
   * ============================================
   */

  const activeCount =
    services.filter(
      (service) =>
        service.active
    ).length;

  const inactiveCount =
    services.length -
    activeCount;

  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <div className="admin-services-page">
        <div className="admin-services-loading">
          <span className="admin-services-spinner" />

          <p>
            Loading services...
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
    <div className="admin-services-page">

      {/* ======================================
          HEADER
      ====================================== */}

      <div className="admin-services-header">

        <div>
          <div className="admin-services-eyebrow">
            SERVICE MANAGEMENT
          </div>

          <h1>
            Services
          </h1>

          <p>
            Manage consultation
            services, pricing and
            availability.
          </p>
        </div>

        <button
          type="button"
          className="admin-services-add"
          onClick={openAddForm}
        >
          <span>+</span>

          Add Service
        </button>

      </div>

      {/* ======================================
          ADD / EDIT SERVICE FORM
      ====================================== */}

            {showAddForm && (
            <div
                ref={formCardRef}
                className="admin-service-form-card"
            >

          <div className="admin-service-form-header">

            <div>

              <div className="admin-services-eyebrow">
                {editingService
                  ? "EDIT SERVICE"
                  : "NEW SERVICE"}
              </div>

              <h2>
                {editingService
                  ? "Edit Service"
                  : "Add Service"}
              </h2>

              <p>
                {editingService
                  ? "Update consultation service details, pricing and availability."
                  : "Create a new consultation service."}
              </p>

            </div>

            <button
              type="button"
              className="admin-service-form-close"
              onClick={closeAddForm}
              disabled={creating}
              aria-label="Close form"
            >
              ×
            </button>

          </div>

          {/* ==================================
              FORM ERROR
          ================================== */}

          {createError && (
            <div className="admin-service-form-error">
              {createError}
            </div>
          )}

          <form
            className="admin-service-form"
            onSubmit={
              editingService
                ? updateService
                : createService
            }
          >

            {/* ==================================
                BASIC INFORMATION
            ================================== */}

            <div className="admin-service-form-grid">

              {/* SERVICE NAME */}

              <div className="admin-service-field">

                <label>
                  Service Name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Basic Astrology"
                  required
                />

              </div>

              {/* SERVICE ID */}

              <div className="admin-service-field">

                <label>
                  Service ID
                </label>

                <input
                  type="text"
                  value={
                    form.serviceId
                  }
                  readOnly={
                    Boolean(
                      editingService
                    )
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      serviceId:
                        event.target
                          .value
                          .toLowerCase()
                          .replace(
                            /\s+/g,
                            "-"
                          ),
                    })
                  }
                  placeholder="basic-astrology"
                  required
                />

                <small>
                  {editingService
                    ? "Service ID cannot be changed."
                    : "Use a unique ID such as basic-astrology."}
                </small>

              </div>

              {/* CATEGORY */}

              <div className="admin-service-field">

                <label>
                  Category
                </label>

                <input
                  type="text"
                  value={
                    form.category
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Astrology"
                  required
                />

              </div>

              {/* DURATION */}

              <div className="admin-service-field">

                <label>
                  Duration
                </label>

                <div className="admin-service-input-with-suffix">

                  <input
                    type="number"
                    min="1"
                    value={
                      form.duration
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        duration:
                          event.target
                            .value,
                      })
                    }
                    placeholder="30"
                  />

                  <span>
                    minutes
                  </span>

                </div>

              </div>

              {/* PRICE */}

              <div className="admin-service-field">

                <label>
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    form.price
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      price:
                        event.target
                          .value,
                    })
                  }
                  placeholder="2000"
                  required
                />

              </div>

              {/* CURRENCY */}

              <div className="admin-service-field">

                <label>
                  Currency
                </label>

                <select
                  value={
                    form.currency
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      currency:
                        event.target
                          .value,
                    })
                  }
                >

                  <option value="INR">
                    INR — Indian Rupee
                  </option>

                </select>

              </div>

            </div>

            {/* ==================================
                DESCRIPTION
            ================================== */}

            <div className="admin-service-field">

              <label>
                Description
              </label>

              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    description:
                      event.target
                        .value,
                  })
                }
                placeholder="Describe what this consultation includes..."
                rows={4}
              />

            </div>

            {/* ==================================
                CONSULTATION MODES
            ================================== */}

            <div className="admin-service-form-section">

              <label>
                Consultation Modes
              </label>

              <div className="admin-service-checkboxes">

                <label className="admin-service-checkbox">

                  <input
                    type="checkbox"
                    checked={
                      form.video
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        video:
                          event.target
                            .checked,
                      })
                    }
                  />

                  <span>
                    Video Consultation
                  </span>

                </label>

                <label className="admin-service-checkbox">

                  <input
                    type="checkbox"
                    checked={
                      form.voice
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        voice:
                          event.target
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
                VISIBILITY
            ================================== */}

            <div className="admin-service-form-section">

              <label>
                Visibility
              </label>

              <label className="admin-service-checkbox">

                <input
                  type="checkbox"
                  checked={
                    form.active
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      active:
                        event.target
                          .checked,
                    })
                  }
                />

                <span>
                  Make this service
                  visible to
                  customers
                </span>

              </label>

            </div>

            {/* ==================================
                ACTIONS
            ================================== */}

            <div className="admin-service-form-actions">

              <button
                type="button"
                className="admin-service-cancel"
                onClick={
                  closeAddForm
                }
                disabled={creating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-service-submit"
                disabled={creating}
              >
                {creating
                  ? editingService
                    ? "Saving..."
                    : "Creating..."
                  : editingService
                    ? "Save Changes"
                    : "Create Service"}
              </button>

            </div>

          </form>

        </div>
      )}

      {/* ======================================
          ERROR
      ====================================== */}

      {error && (
        <div className="admin-services-error">

          <strong>
            Unable to load services
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={
              loadServices
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

          <div className="admin-services-stats">

            <div className="admin-services-stat">

              <span>
                TOTAL SERVICES
              </span>

              <strong>
                {services.length}
              </strong>

              <small>
                All configured services
              </small>

            </div>

            <div className="admin-services-stat">

              <span>
                ACTIVE
              </span>

              <strong>
                {activeCount}
              </strong>

              <small>
                Visible to customers
              </small>

            </div>

            <div className="admin-services-stat">

              <span>
                INACTIVE
              </span>

              <strong>
                {inactiveCount}
              </strong>

              <small>
                Currently hidden
              </small>

            </div>

          </div>

          {/* ==================================
              CONTROLS
          ================================== */}

          <div className="admin-services-controls">

            <div className="admin-services-search">

              <span>
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search services..."
              />

            </div>

            <button
              type="button"
              className="admin-services-refresh"
              onClick={
                loadServices
              }
            >
              ↻ Refresh
            </button>

          </div>

          {/* ==================================
              TABLE
          ================================== */}

          <div className="admin-services-table-card">

            <div className="admin-services-table-header">

              <div>

                <span>
                  SERVICES
                </span>

                <strong>
                  {
                    filteredServices.length
                  }{" "}
                  service
                  {filteredServices.length !==
                  1
                    ? "s"
                    : ""}
                </strong>

              </div>

            </div>

            {filteredServices.length ===
            0 ? (

              <div className="admin-services-empty">

                <div>
                  ✦
                </div>

                <h3>
                  No services found
                </h3>

                <p>
                  Try changing your
                  search.
                </p>

              </div>

            ) : (

              <div className="admin-services-table-wrapper">

                <table className="admin-services-table">

                  <thead>

                    <tr>

                      <th>
                        SERVICE
                      </th>

                      <th>
                        CATEGORY
                      </th>

                      <th>
                        DURATION
                      </th>

                      <th>
                        PRICE
                      </th>

                      <th>
                        MODES
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

                    {filteredServices.map(
                      (service) => (

                        <tr
                          key={
                            service._id
                          }
                        >

                          <td>

                            <div className="admin-service-name">

                              <strong>
                                {
                                  service.name
                                }
                              </strong>

                              <span>
                                {
                                  service.serviceId
                                }
                              </span>

                            </div>

                          </td>

                          <td>
                            {
                              service.category
                            }
                          </td>

                          <td>
                            {service.duration
                              ? `${service.duration} min`
                              : "—"}
                          </td>

                          <td>

                            <strong>

                              {
                                service.currency ||
                                "INR"
                              }{" "}

                              {Number(
                                service.price
                              ).toLocaleString(
                                "en-IN"
                              )}

                            </strong>

                          </td>

                          <td>

                            <div className="admin-service-modes">

                              {service.availableModes.includes(
                                "video"
                              ) && (

                                <span>
                                  Video
                                </span>

                              )}

                              {service.availableModes.includes(
                                "voice"
                              ) && (

                                <span>
                                  Voice
                                </span>

                              )}

                            </div>

                          </td>

                          <td>

                            <span
                              className={`admin-service-status ${
                                service.active
                                  ? "admin-service-status-active"
                                  : "admin-service-status-inactive"
                              }`}
                            >

                              <i />

                              {service.active
                                ? "Active"
                                : "Inactive"}

                            </span>

                          </td>

                          <td>

                            <button
                              type="button"
                              className="admin-service-edit"
                              onClick={() =>
                                openEditForm(
                                  service
                                )
                              }
                              disabled={
                                creating
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