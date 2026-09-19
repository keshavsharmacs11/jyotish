"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./page.module.css";

async function fetchInvitation(currentToken: string) {
  const response = await fetch(
    `/api/consultants/onboarding?token=${encodeURIComponent(currentToken)}`,
    { cache: "no-store" },
  );
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "This invitation is no longer available.",
    );
  }

  return data.invitation;
}

const MODES = [
  { value: "video" as const, label: "Video Consultation", icon: "◉" },
  { value: "voice" as const, label: "Voice Consultation", icon: "◌" },
];

export default function ConsultantOnboardingPage() {
  const [invitation, setInvitation] = useState<{
    name: string;
    email: string;
    expiresAt: string;
  } | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);
  const [pageError, setPageError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [photo, setPhoto] = useState("");
  const [selectedModes, setSelectedModes] = useState<("video" | "voice")[]>([
    "video",
    "voice",
  ]);
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const tokenRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    const currentToken =
      new URLSearchParams(window.location.search).get("token")?.trim() || "";

    tokenRef.current = currentToken;

    const invitationPromise = currentToken
      ? fetchInvitation(currentToken)
      : Promise.reject(
          new Error("This consultant invitation link is missing its secure token."),
        );

    void invitationPromise
      .then((data) => {
        if (cancelled) return;
        setInvitation(data);
        setName(data.name || "");
        setLoadingInvitation(false);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setPageError(
          loadError instanceof Error
            ? loadError.message
            : "This invitation is no longer available.",
        );
        setLoadingInvitation(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleMode(mode: "video" | "voice") {
    setSelectedModes((current) => {
      if (current.includes(mode)) {
        return current.filter((item) => item !== mode);
      }

      return [...current, mode];
    });
  }

  function compressPhoto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const maxSize = 900;
          let width = image.width;
          let height = image.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height / width) * maxSize);
              width = maxSize;
            } else {
              width = Math.round((width / height) * maxSize);
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Unable to process this image."));
            return;
          }

          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };

        image.onerror = () => reject(new Error("Unable to read this image."));
        image.src = String(reader.result || "");
      };

      reader.onerror = () => reject(new Error("Unable to read this image."));
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("Please select an image smaller than 5 MB.");
      return;
    }

    try {
      setSubmitError("");
      const compressed = await compressPhoto(file);
      setPhoto(compressed);
      setPhotoPreview(compressed);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to process this image.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!tokenRef.current || !invitation) {
      setSubmitError("This invitation is not available.");
      return;
    }

    if (selectedModes.length === 0) {
      setSubmitError("Select at least one consultation mode.");
      return;
    }

    if (!photo) {
      setSubmitError("Please upload a professional profile photo.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/consultants/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenRef.current,
          name,
          phone,
          specialization,
          photo,
          availableModes: selectedModes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to create your consultant profile.",
        );
      }

      setSuccess(true);
    } catch (error) {
      console.error("CONSULTANT ONBOARDING SUBMIT ERROR:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to create your consultant profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className={styles.page}>
        <div className={styles.glowOne} />
        <div className={styles.glowTwo} />

        <section className={styles.card}>
          <div className={styles.brandMark}>✦</div>
          <div className={styles.eyebrow}>CONSULTANT ONBOARDING</div>
          <h1>Your profile is ready.</h1>
          <p className={styles.lead}>
            Your consultant profile has been created successfully. The Akshaanshh Jyotish
            team can now manage your consultation availability and customer visibility.
          </p>

          <div className={styles.successBox}>
            <span>✓</span>
            <div>
              <strong>Profile created successfully</strong>
              <p>
                You can close this page. The team will handle the next administrative step.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

      <section className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.brandMark}>✦</div>
          <div>
            <div className={styles.brandName}>AKSHAANSHH</div>
            <div className={styles.brandSub}>JYOTISH</div>
          </div>
        </div>

        <div className={styles.eyebrow}>CONSULTANT ONBOARDING</div>
        <h1>Complete your consultant profile</h1>
        <p className={styles.lead}>
          Your secure invitation is ready. Add the information customers should see on your
          consultant profile. Availability is managed separately by the administration team.
        </p>

        {loadingInvitation ? (
          <div className={styles.loadingBox}>Checking your invitation…</div>
        ) : pageError ? (
          <div className={styles.errorBox}>{pageError}</div>
        ) : invitation ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.invitationBox}>
              <div>
                <span>INVITED CONSULTANT</span>
                <strong>{invitation.name}</strong>
              </div>
              <div>
                <span>EMAIL</span>
                <strong>{invitation.email}</strong>
              </div>
            </div>

            <div className={styles.sectionHeading}>
              <span>01</span>
              <div>
                <h2>Basic information</h2>
                <p>These details will appear on your consultant profile.</p>
              </div>
            </div>

            <label className={styles.field}>
              <span>Consultant name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                disabled={submitting}
              />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input value={invitation.email} readOnly disabled />
            </label>

            <label className={styles.field}>
              <span>Phone number</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={40}
                placeholder="+91 9876543210"
                required
                disabled={submitting}
              />
            </label>

            <label className={styles.field}>
              <span>Area of specialization</span>
              <input
                value={specialization}
                onChange={(event) => setSpecialization(event.target.value)}
                maxLength={200}
                placeholder="Vedic Astrology, Numerology, Marriage Guidance…"
                required
                disabled={submitting}
              />
            </label>

            <div className={styles.sectionHeading}>
              <span>02</span>
              <div>
                <h2>Profile photo</h2>
                <p>Use a clear, professional photo customers can recognize.</p>
              </div>
            </div>

            <div className={styles.photoArea}>
              <div className={styles.photoPreview}>
                {photoPreview ? (
                  <img src={photoPreview} alt={name || "Consultant preview"} />
                ) : (
                  <span>PHOTO</span>
                )}
              </div>
              <div className={styles.photoCopy}>
                <strong>Choose your profile photo</strong>
                <p>JPG, PNG or WebP. Maximum 5 MB.</p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className={styles.sectionHeading}>
              <span>03</span>
              <div>
                <h2>Consultation modes</h2>
                <p>Select the ways customers can request a consultation.</p>
              </div>
            </div>

            <div className={styles.modeGrid}>
              {MODES.map((mode) => {
                const selected = selectedModes.includes(mode.value);

                return (
                  <button
                    key={mode.value}
                    type="button"
                    className={`${styles.modeButton} ${selected ? styles.modeSelected : ""}`}
                    onClick={() => toggleMode(mode.value)}
                    disabled={submitting}
                    aria-pressed={selected}
                  >
                    <span className={styles.modeIcon}>{mode.icon}</span>
                    <span>{mode.label}</span>
                    <span className={styles.modeCheck}>{selected ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>

            {submitError && <div className={styles.errorBox}>{submitError}</div>}

            <div className={styles.submitNote}>
              <span>i</span>
              <p>
                You will only complete your profile here. Consultation availability remains
                under the administration panel.
              </p>
            </div>

            <button className={styles.submit} type="submit" disabled={submitting}>
              {submitting ? "Creating profile…" : "Create My Consultant Profile →"}
            </button>
          </form>
        ) : null}

        <footer className={styles.footer}>Akshaanshh Jyotish · Consultant onboarding</footer>
      </section>
    </main>
  );
}
