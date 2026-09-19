"use client";

import {
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AdminActivatePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This administrator invitation is invalid.");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/admin/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to create your administrator account."
        );
      }

      setSuccess(true);
    } catch (activationError) {
      console.error("ADMIN ACCOUNT ACTIVATION ERROR:", activationError);
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Unable to create your administrator account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="admin-login-orbit admin-login-orbit-one" />
      <div className="admin-login-orbit admin-login-orbit-two" />

      <div className="admin-login-shell">
        <div className="admin-login-brand">
          <div className="admin-login-symbol">✦</div>
          <div>
            <div className="admin-login-brand-name">AKSHAANSHH</div>
            <div className="admin-login-brand-subtitle">JYOTISH</div>
          </div>
        </div>

        <div className="admin-login-card">
          <div className="admin-login-card-header">
            <div className="admin-login-eyebrow">ADMINISTRATION</div>
            <h1>{success ? "Account Created" : "Create Your Account"}</h1>
            <p>
              {success
                ? "Your administrator account is ready. Sign in with your email and new password, then open Settings to create your own consultant profile."
                : "Create your private administrator password to finish setting up your access."}
            </p>
          </div>

          <div className="admin-login-divider" />

          {success ? (
            <div
              style={{
                padding: "12px 0 4px",
                textAlign: "center",
                lineHeight: 1.7,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background: "rgba(212, 167, 71, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                }}
              >
                ✓
              </div>

              <Link
                href="/admin/login"
                className="admin-login-submit"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textDecoration: "none",
                  marginTop: 24,
                }}
              >
                Go to Admin Login →
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="admin-login-form"
            >
              <div className="admin-login-field">
                <label htmlFor="activation-password">
                  Create Password
                </label>
                <div className="admin-password-wrapper">
                  <input
                    id="activation-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="admin-login-field">
                <label htmlFor="activation-confirm-password">
                  Confirm Password
                </label>
                <div className="admin-password-wrapper">
                  <input
                    id="activation-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Enter the password again"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword((previous) => !previous)
                    }
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "13px 14px",
                  borderRadius: 11,
                  background: "rgba(214, 166, 59, 0.08)",
                  border: "1px solid rgba(214, 166, 59, 0.18)",
                  color: "#6f6a61",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Use at least 12 characters. Never reuse a password from another
                important account.
              </div>

              {error && (
                <div className="admin-login-error">
                  <span>!</span>
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="admin-login-submit"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Admin Account →"}
              </button>
            </form>
          )}
        </div>

        <div className="admin-login-footer">
          <span>© {new Date().getFullYear()} Akshaanshh Jyotish</span>
          <span className="admin-login-footer-dot">•</span>
          <span>Administration Portal</span>
        </div>
      </div>
    </main>
  );
}
