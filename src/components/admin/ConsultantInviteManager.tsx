"use client";

import { FormEvent, useEffect, useState } from "react";

export type ConsultantInvitation = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "expired";
};

type Props = {
  onManualAdd?: () => void;
};

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function expiryLabel(value: string): string {
  const target = new Date(value).getTime();

  if (!Number.isFinite(target)) {
    return "Invitation expiry unavailable";
  }

  const hours = Math.ceil((target - Date.now()) / (60 * 60 * 1000));

  if (hours <= 0) {
    return "Expired";
  }

  if (hours < 24) {
    return `Expires in ${hours}h`;
  }

  const days = Math.ceil(hours / 24);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

async function fetchPendingInvitations(): Promise<ConsultantInvitation[]> {
  const response = await fetch("/api/admin/consultants/invitations", {
    cache: "no-store",
    credentials: "include",
  });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Unable to load consultant invitations.");
  }

  return Array.isArray(data.invitations) ? data.invitations : [];
}

export default function ConsultantInviteManager({ onManualAdd }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<ConsultantInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadInvitations() {
    try {
      setLoading(true);
      setError("");
      setInvitations(await fetchPendingInvitations());
    } catch (loadError) {
      console.error("Consultant invitation list error:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load consultant invitations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void fetchPendingInvitations()
      .then((items) => {
        if (cancelled) return;
        setInvitations(items);
        setError("");
        setLoading(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        console.error("Consultant invitation list error:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load consultant invitations.",
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!name.trim() || !email.trim()) {
      setError("Consultant name and email are required.");
      return;
    }

    try {
      setSending(true);

      const response = await fetch("/api/admin/consultants/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to send the consultant invitation.",
        );
      }

      setMessage(
        "Invitation sent. The consultant can now complete their profile from the secure link in the email.",
      );
      setName("");
      setEmail("");
      await loadInvitations();
    } catch (inviteError) {
      console.error("Consultant invitation error:", inviteError);
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to send the consultant invitation.",
      );
    } finally {
      setSending(false);
    }
  }

  async function resendInvitation(invitation: ConsultantInvitation) {
    setMessage("");
    setError("");

    try {
      setWorkingId(invitation.id);

      const response = await fetch("/api/admin/consultants/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: invitation.name,
          email: invitation.email,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to resend the consultant invitation.",
        );
      }

      setMessage(`A fresh invitation was sent to ${invitation.email}.`);
      await loadInvitations();
    } catch (resendError) {
      console.error("Consultant invitation resend error:", resendError);
      setError(
        resendError instanceof Error
          ? resendError.message
          : "Unable to resend the consultant invitation.",
      );
    } finally {
      setWorkingId("");
    }
  }

  async function cancelInvitation(invitation: ConsultantInvitation) {
    const confirmed = window.confirm(
      `Cancel the pending invitation for ${invitation.name}?\n\nThe current invitation link will stop working.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      setWorkingId(invitation.id);

      const response = await fetch("/api/admin/consultants/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invitationId: invitation.id }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to cancel the consultant invitation.",
        );
      }

      setMessage("The consultant invitation has been cancelled.");
      await loadInvitations();
    } catch (cancelError) {
      console.error("Consultant invitation cancel error:", cancelError);
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel the consultant invitation.",
      );
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section
      id="consultant-invite-manager"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
        gap: 20,
        marginBottom: 28,
      }}
    >
      <div
        className="admin-consultant-form-card"
        style={{ margin: 0 }}
      >
        <div className="admin-consultant-form-header">
          <div>
            <div className="admin-consultants-eyebrow">SMART ONBOARDING</div>
            <h2>Invite a Consultant</h2>
            <p>
              Enter only their name and email. They complete the profile themselves;
              you manage the profile and availability afterward.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 20,
            padding: 14,
            border: "1px solid rgba(20,27,45,0.07)",
            borderRadius: 13,
            background: "rgba(250,247,239,0.55)",
          }}
        >
          {[
            ["01", "Invite", "Send one secure onboarding link."],
            ["02", "Complete", "Consultant adds phone, specialization, photo and modes."],
            ["03", "Manage", "Completed profile appears in your consultant list."],
          ].map(([number, title, copy]) => (
            <div
              key={number}
              style={{
                display: "grid",
                gridTemplateColumns: "30px 1fr",
                gap: 10,
                alignItems: "start",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 9,
                  background: "#172033",
                  color: "#e1b84f",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {number}
              </span>
              <div>
                <strong style={{ display: "block", fontSize: 12, color: "#172033" }}>
                  {title}
                </strong>
                <span style={{ display: "block", marginTop: 2, color: "#777d88", fontSize: 11, lineHeight: 1.45 }}>
                  {copy}
                </span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleInvite} className="admin-consultant-form">
          <div className="admin-consultant-form-grid">
            <div className="admin-consultant-field">
              <label>Consultant Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Akshaanshh Sharma"
                maxLength={100}
                required
                disabled={sending}
              />
            </div>

            <div className="admin-consultant-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="consultant@example.com"
                maxLength={254}
                required
                disabled={sending}
              />
            </div>
          </div>

          {error && <div className="admin-consultant-form-error">{error}</div>}
          {message && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid rgba(70,120,82,0.14)",
                background: "rgba(70,120,82,0.07)",
                color: "#315c3b",
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          <div className="admin-consultant-form-actions">
            {onManualAdd && (
              <button
                type="button"
                className="admin-consultant-cancel"
                onClick={onManualAdd}
                disabled={sending}
              >
                Create Profile Manually
              </button>
            )}

            <button
              type="submit"
              className="admin-consultant-submit"
              disabled={sending}
            >
              {sending ? "Sending…" : "Send Consultant Invite →"}
            </button>
          </div>
        </form>
      </div>

      <div
        className="admin-consultants-table-card"
        style={{ alignSelf: "start" }}
      >
        <div className="admin-consultants-table-header">
          <div>
            <span>PENDING INVITATIONS</span>
            <strong>
              {invitations.length} pending consultant
              {invitations.length === 1 ? "" : "s"}
            </strong>
          </div>
          <button
            type="button"
            className="admin-consultants-refresh"
            onClick={() => void loadInvitations()}
            disabled={loading || sending || Boolean(workingId)}
          >
            ↻
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "#777d88", fontSize: 12 }}>
            Loading invitations…
          </div>
        ) : invitations.length === 0 ? (
          <div style={{ padding: 24 }}>
            <strong style={{ display: "block", color: "#263044", fontSize: 13 }}>
              No pending invitations
            </strong>
            <p style={{ margin: "6px 0 0", color: "#7b818c", fontSize: 11, lineHeight: 1.55 }}>
              Once a consultant completes the secure onboarding link, their profile
              will appear in the consultant list below.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid" }}>
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                style={{
                  padding: "17px 18px",
                  borderTop: "1px solid rgba(20,27,45,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", color: "#172033", fontSize: 13 }}>
                      {invitation.name}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        overflow: "hidden",
                        color: "#737985",
                        fontSize: 11,
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {invitation.email}
                    </span>
                  </div>

                  <span
                    style={{
                      flex: "0 0 auto",
                      padding: "5px 8px",
                      borderRadius: 999,
                      background: "rgba(170,124,31,0.09)",
                      color: "#916718",
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {expiryLabel(invitation.expiresAt)}
                  </span>
                </div>

                <div style={{ marginTop: 10, color: "#90949d", fontSize: 10 }}>
                  Sent {formatDateTime(invitation.createdAt)}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 13,
                  }}
                >
                  <button
                    type="button"
                    className="admin-consultant-edit"
                    onClick={() => void resendInvitation(invitation)}
                    disabled={Boolean(workingId) || sending}
                  >
                    {workingId === invitation.id ? "Working…" : "Resend Invite"}
                  </button>
                  <button
                    type="button"
                    className="admin-consultant-remove"
                    onClick={() => void cancelInvitation(invitation)}
                    disabled={Boolean(workingId) || sending}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
