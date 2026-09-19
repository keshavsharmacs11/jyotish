"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type AdminProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isSuperAdmin?: boolean;
  active?: boolean;
  consultantProfileEligible?: boolean;
  createdAt?: string;
};

type ManagedAdministrator = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isSuperAdmin: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ManagedConsultant = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const SUPER_ADMIN_EMAIL =
  "info.akshaanshhjyotish@gmail.com";

export default function AdminSettingsPage() {
  const [admin, setAdmin] =
    useState<AdminProfile | null>(null);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [profileError, setProfileError] =
    useState("");

  const [myConsultant, setMyConsultant] =
    useState<ManagedConsultant | null>(null);

  const [myConsultantEligible, setMyConsultantEligible] =
    useState(false);

  const [loadingMyConsultant, setLoadingMyConsultant] =
    useState(true);

  const [myConsultantError, setMyConsultantError] =
    useState("");

  const [inviteName, setInviteName] =
    useState("");

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteLoading, setInviteLoading] =
    useState(false);

  const [inviteMessage, setInviteMessage] =
    useState("");

  const [inviteError, setInviteError] =
    useState("");

  const [
    administrators,
    setAdministrators,
  ] = useState<ManagedAdministrator[]>([]);

  const [
    loadingAdministrators,
    setLoadingAdministrators,
  ] = useState(false);

  const [
    administratorsError,
    setAdministratorsError,
  ] = useState("");

  const [
    updatingAdministratorId,
    setUpdatingAdministratorId,
  ] = useState("");

  const [
    administratorActionMessage,
    setAdministratorActionMessage,
  ] = useState("");

  const [
    administratorActionError,
    setAdministratorActionError,
  ] = useState("");

  const [
    consultants,
    setConsultants,
  ] = useState<ManagedConsultant[]>([]);

  const [
    loadingConsultants,
    setLoadingConsultants,
  ] = useState(false);

  const [
    consultantsError,
    setConsultantsError,
  ] = useState("");

  const [
    consultantActionId,
    setConsultantActionId,
  ] = useState("");

  const [
    consultantActionMessage,
    setConsultantActionMessage,
  ] = useState("");

  const [
    consultantActionError,
    setConsultantActionError,
  ] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setProfileError("");

        const response = await fetch(
          "/api/admin/me",
          {
            credentials: "include",
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
              "Unable to load administrator profile."
          );
        }

        setAdmin(data.admin);
      } catch (error) {
        console.error(
          "ADMIN PROFILE LOAD ERROR:",
          error
        );

        setProfileError(
          error instanceof Error
            ? error.message
            : "Unable to load administrator profile."
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  /*
   * Display privilege.
   *
   * The server-provided isSuperAdmin flag remains
   * authoritative when available.
   *
   * The configured owner email is also used as a
   * display fallback for the protected owner account.
   */
  const isSuperAdmin = useMemo(() => {
    if (!admin) {
      return false;
    }

    if (admin.isSuperAdmin === true) {
      return true;
    }

    return (
      String(admin.email || "")
        .trim()
        .toLowerCase() ===
      SUPER_ADMIN_EMAIL
    );
  }, [admin]);

  const loadMyConsultant = useCallback(async () => {
    if (!admin) {
      return;
    }

    try {
      setLoadingMyConsultant(true);
      setMyConsultantError("");

      const response = await fetch(
        "/api/admin/my-consultant",
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Unable to load your consultant profile.",
        );
      }

      setMyConsultantEligible(Boolean(data.eligible));
      setMyConsultant(data.consultant || null);
    } catch (error) {
      console.error(
        "MY CONSULTANT PROFILE LOAD ERROR:",
        error,
      );
      setMyConsultantError(
        error instanceof Error
          ? error.message
          : "Unable to load your consultant profile.",
      );
    } finally {
      setLoadingMyConsultant(false);
    }
  }, [admin]);

  useEffect(() => {
    void loadMyConsultant();
  }, [loadMyConsultant]);

  const loadAdministrators =
    useCallback(async () => {
      if (!isSuperAdmin) {
        return;
      }

      try {
        setLoadingAdministrators(true);
        setAdministratorsError("");

        const response = await fetch(
          "/api/admin/administrators",
          {
            credentials: "include",
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
              "Unable to load administrators."
          );
        }

        setAdministrators(
          Array.isArray(
            data.administrators
          )
            ? data.administrators
            : []
        );
      } catch (error) {
        console.error(
          "ADMINISTRATOR LIST LOAD ERROR:",
          error
        );

        setAdministratorsError(
          error instanceof Error
            ? error.message
            : "Unable to load administrators."
        );
      } finally {
        setLoadingAdministrators(false);
      }
    }, [isSuperAdmin]);

  useEffect(() => {
    void loadAdministrators();
  }, [loadAdministrators]);

  const loadConsultants =
    useCallback(async () => {
      if (!isSuperAdmin) {
        return;
      }

      try {
        setLoadingConsultants(true);
        setConsultantsError("");

        const response = await fetch(
          "/api/admin/consultants",
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load consultant profiles."
          );
        }

        setConsultants(
          Array.isArray(data.consultants)
            ? data.consultants
            : []
        );
      } catch (error) {
        console.error(
          "CONSULTANT LIST LOAD ERROR:",
          error
        );

        setConsultantsError(
          error instanceof Error
            ? error.message
            : "Unable to load consultant profiles."
        );
      } finally {
        setLoadingConsultants(false);
      }
    }, [isSuperAdmin]);

  useEffect(() => {
    void loadConsultants();
  }, [loadConsultants]);

  const handleConsultantAccess =
    async (
      consultantId: string,
      active: boolean
    ) => {
      setConsultantActionMessage("");
      setConsultantActionError("");
      setConsultantActionId(consultantId);

      try {
        const response = await fetch(
          `/api/admin/consultants/${encodeURIComponent(consultantId)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ active }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to update consultant access."
          );
        }

        setConsultants((current) =>
          current.map((consultant) =>
            consultant._id === consultantId
              ? { ...consultant, active }
              : consultant
          )
        );

        setConsultantActionMessage(
          active
            ? "Consultant access restored. The same consultant ID remains in place."
            : "Consultant access revoked. The profile is now kept in recovery."
        );
      } catch (error) {
        console.error(
          "CONSULTANT ACCESS UPDATE ERROR:",
          error
        );

        setConsultantActionError(
          error instanceof Error
            ? error.message
            : "Unable to update consultant access."
        );
      } finally {
        setConsultantActionId("");
      }
    };

  const handlePermanentConsultantDelete =
    async (consultant: ManagedConsultant) => {
      if (consultant.active) {
        setConsultantActionError(
          "Revoke consultant access first. Active profiles cannot be permanently deleted."
        );
        return;
      }

      const confirmed = window.confirm(
        `Permanently delete ${consultant.name}?\n\nPast booking history is preserved. Permanent deletion is allowed only when no future booking is assigned to this profile. This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      setConsultantActionMessage("");
      setConsultantActionError("");
      setConsultantActionId(consultant._id);

      try {
        const response = await fetch(
          `/api/admin/consultants/${encodeURIComponent(consultant._id)}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ permanent: true }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to permanently delete consultant profile."
          );
        }

        setConsultants((current) =>
          current.filter(
            (item) => item._id !== consultant._id
          )
        );

        setConsultantActionMessage(
          `${consultant.name} was permanently removed.`
        );
      } catch (error) {
        console.error(
          "PERMANENT CONSULTANT DELETE ERROR:",
          error
        );

        setConsultantActionError(
          error instanceof Error
            ? error.message
            : "Unable to permanently delete consultant profile."
        );
      } finally {
        setConsultantActionId("");
      }
    };

  const revokedConsultants = useMemo(
    () =>
      consultants
        .filter((consultant) => !consultant.active)
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "en",
            { sensitivity: "base" }
          )
        ),
    [consultants]
  );

  const activeConsultantsCount = consultants.filter(
    (consultant) => consultant.active
  ).length;

  const activeAdministrators = useMemo(
    () =>
      administrators
        .filter((administrator) => administrator.active)
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "en",
            { sensitivity: "base" }
          )
        ),
    [administrators]
  );

  const removedAdministrators = useMemo(
    () =>
      administrators
        .filter((administrator) => !administrator.active)
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "en",
            { sensitivity: "base" }
          )
        ),
    [administrators]
  );

  const handleInvite = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setInviteMessage("");
    setInviteError("");

    if (
      !inviteName.trim() ||
      !inviteEmail.trim()
    ) {
      setInviteError(
        "Name and email are required."
      );

      return;
    }

    try {
      setInviteLoading(true);

      const response = await fetch(
        "/api/admin/invite",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: inviteName,
            email: inviteEmail,
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
            "Unable to send administrator invitation."
        );
      }

      setInviteMessage(
        "Invitation sent. The recipient can use the secure link to create their own password."
      );

      setInviteName("");
      setInviteEmail("");
    } catch (error) {
      console.error(
        "ADMIN INVITATION ERROR:",
        error
      );

      setInviteError(
        error instanceof Error
          ? error.message
          : "Unable to send administrator invitation."
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAdministratorAccess =
    async (
      administratorId: string,
      active: boolean
    ) => {
      const targetAdministrator =
        administrators.find(
          (administrator) =>
            administrator.id === administratorId
        );

      if (
        !active &&
        targetAdministrator &&
        !targetAdministrator.isSuperAdmin &&
        targetAdministrator.email
          .trim()
          .toLowerCase() !== SUPER_ADMIN_EMAIL
      ) {
        const confirmed = window.confirm(
          `Remove access for ${targetAdministrator.name}?\n\nTheir administrator profile will be kept. They can be restored later with the same account and ID.`
        );

        if (!confirmed) {
          return;
        }
      }
      setAdministratorActionMessage("");
      setAdministratorActionError("");
      setUpdatingAdministratorId(
        administratorId
      );

      try {
        const response = await fetch(
          "/api/admin/administrators",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              administratorId,
              active,
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
              "Unable to update administrator access."
          );
        }

        setAdministrators(
          (current) =>
            current.map(
              (administrator) =>
                administrator.id ===
                administratorId
                  ? {
                      ...administrator,
                      active,
                    }
                  : administrator
            )
        );

        setAdministratorActionMessage(
          active
            ? "Administrator access restored. Any linked consultant profile was restored with the same consultant ID."
            : "Administrator access revoked. Any linked consultant profile was also removed from active consultant visibility; history is preserved."
        );
      } catch (error) {
        console.error(
          "ADMINISTRATOR ACCESS UPDATE ERROR:",
          error
        );

        setAdministratorActionError(
          error instanceof Error
            ? error.message
            : "Unable to update administrator access."
        );
      } finally {
        setUpdatingAdministratorId("");
      }
    };

  return (
    <div className="admin-settings-page">
      <div className="admin-settings-header">
        <div>
          <div className="admin-settings-eyebrow">
            ADMINISTRATION
          </div>

          <h1>Settings</h1>

          <p>
            Manage administrator access and portal
            security.
          </p>
        </div>
      </div>

      {/* =====================================================
          ADMIN PROFILE
          ===================================================== */}

      <section className="admin-settings-card">
        <div className="admin-settings-card-header">
          <div className="admin-settings-card-icon">
            👤
          </div>

          <div>
            <h2>Admin Profile</h2>

            <p>
              Your authenticated administrator
              account.
            </p>
          </div>
        </div>

        <div className="admin-settings-divider" />

        {loadingProfile ? (
          <div className="admin-settings-loading">
            Loading account information...
          </div>
        ) : profileError ? (
          <div className="admin-settings-error">
            {profileError}
          </div>
        ) : (
          <div className="admin-settings-info-grid">
            <div className="admin-settings-info-item">
              <span>NAME</span>

              <strong>
                {admin?.name || "—"}
              </strong>
            </div>

            <div className="admin-settings-info-item">
              <span>EMAIL</span>

              <strong>
                {admin?.email || "—"}
              </strong>
            </div>

            <div className="admin-settings-info-item">
              <span>ROLE</span>

              <strong>
                {isSuperAdmin
                  ? "Super Administrator"
                  : "Administrator"}
              </strong>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          MY CONSULTANT PROFILE
          ===================================================== */}

      <section className="admin-settings-card admin-settings-my-consultant-card">
        <div className="admin-settings-card-header">
          <div className="admin-settings-card-icon">
            🧑‍💼
          </div>

          <div>
            <h2>My Consultant Profile</h2>
            <p>
              Create and manage your consultation profile using the same administrator identity.
            </p>
          </div>
        </div>

        <div className="admin-settings-divider" />

        {loadingMyConsultant ? (
          <div className="admin-settings-management-loading">
            Checking consultant profile access...
          </div>
        ) : myConsultantError ? (
          <div className="admin-settings-management-error">
            {myConsultantError}
          </div>
        ) : !myConsultantEligible ? (
          <div className="admin-settings-my-consultant-locked">
            <div className="admin-settings-my-consultant-lock">
              🔒
            </div>
            <div>
              <strong>Self consultant profile not enabled</strong>
              <p>
                This option is available only to administrators who activated their account through an administrator invitation.
              </p>
            </div>
          </div>
        ) : myConsultant ? (
          <div className="admin-settings-my-consultant-summary">
            <div>
              <span className="admin-settings-status admin-settings-status-active">
                {myConsultant.active ? "Consultant Active" : "Consultant Access Removed"}
              </span>
              <strong>{myConsultant.name}</strong>
              <p>
                {myConsultant.specialization || "Specialization not set"}
              </p>
            </div>

            <Link
              href="/admin/my-consultant"
              className="admin-settings-action-button"
            >
              Manage My Consultant Profile →
            </Link>
          </div>
        ) : (
          <div className="admin-settings-my-consultant-summary is-empty">
            <div>
              <span className="admin-settings-status admin-settings-status-revoked">
                Not Created
              </span>
              <strong>Create your consultation profile</strong>
              <p>
                Complete your consultant details once. The profile will be linked to this administrator account.
              </p>
            </div>

            <Link
              href="/admin/my-consultant"
              className="admin-settings-action-button"
            >
              Create My Consultant Profile →
            </Link>
          </div>
        )}
      </section>

      {/* =====================================================
          SUPER ADMINISTRATOR POWER & ACCESS
          ===================================================== */}

      {isSuperAdmin && (
        <section className="admin-settings-card">
          <div className="admin-settings-card-header">
            <div className="admin-settings-card-icon">
              ✦
            </div>

            <div>
              <h2>
                Super Administrator Power &amp;
                Access
              </h2>

              <p>
                Owner-level controls for managing
                the administration portal.
              </p>
            </div>
          </div>

          <div className="admin-settings-divider" />

          <div className="admin-settings-power">
            <div className="admin-settings-power-intro">
              <strong>
                Protected privileges
              </strong>

              <p>
                These controls are enforced by the
                server and are available only to the
                Super Administrator.
              </p>
            </div>

            <div className="admin-settings-permissions">
              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Manage bookings
                  </strong>

                  <span>
                    Access existing booking,
                    payment and refund administration
                    workflows.
                  </span>
                </div>

                <span className="admin-settings-permission-badge allowed">
                  Allowed
                </span>
              </div>

              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Manage services
                  </strong>

                  <span>
                    Create and maintain the services
                    available through the portal.
                  </span>
                </div>

                <span className="admin-settings-permission-badge allowed">
                  Allowed
                </span>
              </div>

              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Manage consultant profiles
                  </strong>

                  <span>
                    Edit consultant details, modes
                    and availability.
                  </span>
                </div>

                <span className="admin-settings-permission-badge allowed">
                  Allowed
                </span>
              </div>

              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Activate or deactivate
                    consultants
                  </strong>

                  <span>
                    Control consultant visibility
                    and activation status.
                  </span>
                </div>

                <span className="admin-settings-permission-badge allowed">
                  Allowed
                </span>
              </div>

              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Invite administrators
                  </strong>

                  <span>
                    Send secure, single-use
                    administrator invitations.
                  </span>
                </div>

                <span className="admin-settings-permission-badge allowed">
                  Allowed
                </span>
              </div>

              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Remove or restore administrator
                    access
                  </strong>

                  <span>
                    Remove portal access without deleting
                    the administrator profile or its
                    existing record.
                  </span>
                </div>

                <span className="admin-settings-permission-badge allowed">
                  Allowed
                </span>
              </div>

              <div className="admin-settings-permission-row">
                <div className="admin-settings-permission-copy">
                  <strong>
                    Deactivate own account
                  </strong>

                  <span>
                    The protected Super Administrator
                    account cannot deactivate itself
                    from the portal.
                  </span>
                </div>

                <span className="admin-settings-permission-badge protected">
                  Protected
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          ADMINISTRATOR ACCESS
          ===================================================== */}

      {isSuperAdmin && (
        <section className="admin-settings-card">
          <div className="admin-settings-card-header">
            <div className="admin-settings-card-icon">
              👥
            </div>

            <div>
              <h2>Administrator Access</h2>

              <p>
                Invite and manage trusted
                administrator accounts.
              </p>
            </div>
          </div>

          <div className="admin-settings-divider" />

          <form
            className="admin-settings-access-form"
            onSubmit={handleInvite}
          >
            <div className="admin-settings-access-copy">
              <strong>
                Invite a new administrator
              </strong>

              <p>
                We will email a single-use
                invitation. The recipient chooses
                their own password; no password is
                ever sent or stored by you.
              </p>
            </div>

            <div className="admin-settings-form-grid">
              <label>
                <span>NAME</span>

                <input
                  type="text"
                  value={inviteName}
                  onChange={(event) =>
                    setInviteName(
                      event.target.value
                    )
                  }
                  autoComplete="name"
                  placeholder="Administrator name"
                  disabled={inviteLoading}
                  maxLength={100}
                />
              </label>

              <label>
                <span>EMAIL</span>

                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) =>
                    setInviteEmail(
                      event.target.value
                    )
                  }
                  autoComplete="email"
                  placeholder="administrator@example.com"
                  disabled={inviteLoading}
                  maxLength={254}
                />
              </label>
            </div>

            {inviteError && (
              <div className="admin-settings-form-error">
                {inviteError}
              </div>
            )}

            {inviteMessage && (
              <div className="admin-settings-form-success">
                {inviteMessage}
              </div>
            )}

            <div className="admin-settings-access-submit-row">
              <span>
                Invitation expires after 30 minutes.
              </span>

              <button
                type="submit"
                className="admin-settings-action-button"
                disabled={inviteLoading}
              >
                {inviteLoading
                  ? "Sending..."
                  : "Send Invitation →"}
              </button>
            </div>
          </form>

          <div className="admin-settings-divider" />

          <div className="admin-settings-access-copy">
            <strong>
              Existing administrators
            </strong>

            <p>
              Remove portal access without deleting the administrator
              record. Removed profiles stay here and can be restored
              later with the same account.
            </p>
          </div>

          {loadingAdministrators ? (
            <div className="admin-settings-management-loading">
              Loading administrator accounts...
            </div>
          ) : administratorsError ? (
            <div className="admin-settings-management-error">
              {administratorsError}
            </div>
          ) : administrators.length === 0 ? (
            <div className="admin-settings-management-loading">
              No administrator accounts were found.
            </div>
          ) : (
            <>
              <div className="admin-settings-access-copy">
                <strong>
                  Active Administrators ({activeAdministrators.length})
                </strong>

                <p>
                  These accounts currently have portal access.
                </p>
              </div>

              {activeAdministrators.length === 0 ? (
                <div className="admin-settings-management-loading">
                  No other active administrators.
                </div>
              ) : (
                <div className="admin-settings-admin-list">
                  {activeAdministrators.map((administrator) => {
                    const isProtected =
                      administrator.isSuperAdmin ||
                      administrator.email.trim().toLowerCase() ===
                        SUPER_ADMIN_EMAIL;

                    const isUpdating =
                      updatingAdministratorId === administrator.id;

                    return (
                      <div
                        className="admin-settings-admin-row"
                        key={administrator.id}
                      >
                        <div className="admin-settings-admin-main">
                          <div className="admin-settings-admin-name-row">
                            <span className="admin-settings-admin-name">
                              {administrator.name}
                            </span>

                            {isProtected && (
                              <span className="admin-settings-admin-role">
                                Super Administrator
                              </span>
                            )}
                          </div>

                          <div className="admin-settings-admin-email">
                            {administrator.email}
                          </div>

                          <div className="admin-settings-admin-meta">
                            <span className="admin-settings-status admin-settings-status-active">
                              Active
                            </span>
                          </div>
                        </div>

                        <div className="admin-settings-admin-actions">
                          {isProtected ? (
                            <span className="admin-settings-protected">
                              🔒 Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="admin-settings-management-button danger"
                              onClick={() =>
                                handleAdministratorAccess(
                                  administrator.id,
                                  false
                                )
                              }
                              disabled={isUpdating}
                            >
                              {isUpdating
                                ? "Removing..."
                                : "Remove Access"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {removedAdministrators.length > 0 && (
                <>
                  <div className="admin-settings-divider" />

                  <div className="admin-settings-access-copy">
                    <strong>
                      Removed Access ({removedAdministrators.length})
                    </strong>

                    <p>
                      These profiles are retained for recovery. Restore
                      access whenever the administrator needs to return.
                    </p>
                  </div>

                  <div className="admin-settings-admin-list">
                    {removedAdministrators.map((administrator) => {
                      const isProtected =
                        administrator.isSuperAdmin ||
                        administrator.email.trim().toLowerCase() ===
                          SUPER_ADMIN_EMAIL;

                      const isUpdating =
                        updatingAdministratorId === administrator.id;

                      return (
                        <div
                          className="admin-settings-admin-row"
                          key={administrator.id}
                        >
                          <div className="admin-settings-admin-main">
                            <div className="admin-settings-admin-name-row">
                              <span className="admin-settings-admin-name">
                                {administrator.name}
                              </span>

                              {isProtected && (
                                <span className="admin-settings-admin-role">
                                  Super Administrator
                                </span>
                              )}
                            </div>

                            <div className="admin-settings-admin-email">
                              {administrator.email}
                            </div>

                            <div className="admin-settings-admin-meta">
                              <span className="admin-settings-status admin-settings-status-revoked">
                                Access Removed
                              </span>
                            </div>
                          </div>

                          <div className="admin-settings-admin-actions">
                            {isProtected ? (
                              <span className="admin-settings-protected">
                                🔒 Protected
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="admin-settings-management-button"
                                onClick={() =>
                                  handleAdministratorAccess(
                                    administrator.id,
                                    true
                                  )
                                }
                                disabled={isUpdating}
                              >
                                {isUpdating
                                  ? "Restoring..."
                                  : "Restore Access"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {administratorActionError && (
            <div className="admin-settings-management-error">
              {administratorActionError}
            </div>
          )}

          {administratorActionMessage && (
            <div className="admin-settings-management-success">
              {administratorActionMessage}
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          CONSULTANT ACCESS & RECOVERY
          ===================================================== */}

      {isSuperAdmin && (
        <section className="admin-settings-card admin-settings-consultant-access-card">
          <div className="admin-settings-card-header">
            <div className="admin-settings-card-icon">
              🧑‍💼
            </div>

            <div>
              <h2>Consultant Access &amp; Recovery</h2>

              <p>
                Revoke access without losing the profile, restore the same ID later, or permanently remove a profile when it is safe to do so.
              </p>
            </div>
          </div>

          <div className="admin-settings-consultant-summary">
            <div className="admin-settings-consultant-stat">
              <span>ACTIVE</span>
              <strong>{activeConsultantsCount}</strong>
              <small>Available for management and customer assignment.</small>
            </div>

            <div className="admin-settings-consultant-stat is-revoked">
              <span>RECOVERY</span>
              <strong>{revokedConsultants.length}</strong>
              <small>Access revoked and kept for restoration.</small>
            </div>

            <Link
              href="/admin/consultants"
              className="admin-settings-consultant-manage-link"
            >
              Manage active profiles <span>→</span>
            </Link>
          </div>

          <div className="admin-settings-consultant-note">
            <span>i</span>
            <p>
              Restoring keeps the existing consultant ID. Permanent deletion is blocked only when a future booking is still assigned to the profile.
            </p>
          </div>

          <div className="admin-settings-divider" />

          <div className="admin-settings-access-copy">
            <strong>Revoked profiles</strong>
            <p>
              These consultants are no longer active but remain available here for recovery or safe permanent removal.
            </p>
          </div>

          {loadingConsultants ? (
            <div className="admin-settings-management-loading">
              Loading consultant profiles...
            </div>
          ) : consultantsError ? (
            <div className="admin-settings-management-error">
              {consultantsError}
            </div>
          ) : revokedConsultants.length === 0 ? (
            <div className="admin-settings-consultant-empty">
              <div className="admin-settings-consultant-empty-icon">✓</div>
              <div>
                <strong>No revoked consultant profiles</strong>
                <p>
                  When you revoke a consultant, their profile will appear here instead of disappearing permanently.
                </p>
              </div>
            </div>
          ) : (
            <div className="admin-settings-consultant-list">
              {revokedConsultants.map((consultant) => {
                const isUpdating =
                  consultantActionId === consultant._id;

                const initials = String(consultant.name || "C")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0] || "")
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    className="admin-settings-consultant-row"
                    key={consultant._id}
                  >
                    <div className="admin-settings-consultant-identity">
                      <div className="admin-settings-consultant-avatar">
                        {initials || "C"}
                      </div>

                      <div className="admin-settings-consultant-main">
                        <div className="admin-settings-consultant-name-row">
                          <strong>{consultant.name}</strong>
                          <span className="admin-settings-status admin-settings-status-revoked">
                            Access Revoked
                          </span>
                        </div>

                        <span className="admin-settings-consultant-email">
                          {consultant.email}
                        </span>

                        <div className="admin-settings-consultant-meta">
                          <span>
                            {consultant.specialization || "Specialization not set"}
                          </span>
                          {consultant.updatedAt && (
                            <span>
                              Updated {
                                new Date(consultant.updatedAt).toLocaleDateString(
                                  "en-IN",
                                  { day: "numeric", month: "short", year: "numeric" }
                                )
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="admin-settings-consultant-actions">
                      <button
                        type="button"
                        className="admin-settings-management-button"
                        onClick={() =>
                          handleConsultantAccess(
                            consultant._id,
                            true
                          )
                        }
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Updating..." : "Restore Access"}
                      </button>

                      <button
                        type="button"
                        className="admin-settings-management-button danger"
                        onClick={() =>
                          handlePermanentConsultantDelete(
                            consultant
                          )
                        }
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Working..." : "Delete Permanently"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {consultantActionError && (
            <div className="admin-settings-management-error">
              {consultantActionError}
            </div>
          )}

          {consultantActionMessage && (
            <div className="admin-settings-management-success">
              {consultantActionMessage}
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          SECURITY
          ===================================================== */}

      <section className="admin-settings-card">
        <div className="admin-settings-card-header">
          <div className="admin-settings-card-icon">
            🔐
          </div>

          <div>
            <h2>Security</h2>

            <p>
              Manage your administrator account
              security.
            </p>
          </div>
        </div>

        <div className="admin-settings-divider" />

        <div className="admin-settings-action">
          <div>
            <strong>Password</strong>

            <p>
              Use the existing secure password reset
              process when needed.
            </p>
          </div>

          <Link
            href="/admin/forgot-password"
            className="admin-settings-action-button"
          >
            Reset Password{" "}
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* =====================================================
          SYSTEM INFORMATION
          ===================================================== */}

      <section className="admin-settings-card">
        <div className="admin-settings-card-header">
          <div className="admin-settings-card-icon">
            ⚙
          </div>

          <div>
            <h2>System Information</h2>

            <p>
              Basic information about your
              administration portal.
            </p>
          </div>
        </div>

        <div className="admin-settings-divider" />

        <div className="admin-settings-info-grid">
          <div className="admin-settings-info-item">
            <span>PORTAL</span>

            <strong>
              Akshaanshh Jyotish
            </strong>
          </div>

          <div className="admin-settings-info-item">
            <span>STATUS</span>

            <strong className="admin-settings-online">
              <i />
              Online
            </strong>
          </div>

          <div className="admin-settings-info-item">
            <span>ACCESS</span>

            <strong>
              {isSuperAdmin
                ? "Super Administrator"
                : "Administrator"}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}