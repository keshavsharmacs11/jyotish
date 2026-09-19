"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

type Consultant = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  photo?: string;
  availableModes: ("video" | "voice")[];
  active: boolean;
};

const MODES = [
  { value: "video" as const, title: "Video consultation", description: "Meet customers by video." },
  { value: "voice" as const, title: "Voice consultation", description: "Speak with customers by voice." },
];

export default function MyConsultantPage() {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [availableModes, setAvailableModes] = useState<("video" | "voice")[]>(["video", "voice"]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/my-consultant", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load your consultant profile.");
      }

      setEligible(Boolean(data.eligible));
      if (data.consultant) {
        const current = data.consultant as Consultant;
        setConsultant(current);
        setName(current.name || "");
        setEmail(current.email || "");
        setPhone(current.phone || "");
        setSpecialization(current.specialization || "");
        setPhoto(current.photo || "");
        setPhotoPreview(current.photo || "");
        setAvailableModes(current.availableModes?.length ? current.availableModes : ["video", "voice"]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your consultant profile.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMode(mode: "video" | "voice") {
    setAvailableModes((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
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
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Please select an image smaller than 5 MB.");
      return;
    }
    try {
      const compressed = await compressPhoto(file);
      setPhoto(compressed);
      setPhotoPreview(compressed);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "Unable to process this image.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (availableModes.length === 0) {
      setError("Select at least one consultation mode.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/my-consultant", {
        method: consultant ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          phone,
          specialization,
          photo,
          availableModes,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to save your consultant profile.");
      }
      setConsultant(data.consultant);
      setName(data.consultant.name || "");
      setEmail(data.consultant.email || email);
      setPhone(data.consultant.phone || "");
      setSpecialization(data.consultant.specialization || "");
      setPhoto(data.consultant.photo || "");
      setPhotoPreview(data.consultant.photo || "");
      setAvailableModes(data.consultant.availableModes?.length ? data.consultant.availableModes : ["video", "voice"]);
      setMessage(data.message || "Consultant profile saved successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your consultant profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className={styles.page}><div className={styles.card}><div className={styles.muted}>Loading your consultant profile…</div></div></main>;
  }

  if (!eligible) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>AKSHAANSHH JYOTISH</div>
          <div className={styles.badge}>ADMINISTRATOR ACCESS</div>
          <h1>Consultant profile creation is not enabled</h1>
          <p className={styles.lead}>
            This feature is available only to administrators who activated their account through an administrator invitation.
          </p>
          <div className={styles.locked}>
            <strong>Why am I seeing this?</strong>
            <p>Your administrator account does not carry the invitation-based consultant eligibility required to create a self-owned consultant profile.</p>
          </div>
          <Link href="/admin/settings" className={styles.secondaryButton}>← Back to Settings</Link>
        </div>
      </main>
    );
  }

  const initials = (name || "C")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.brand}>AKSHAANSHH JYOTISH</div>
            <div className={styles.badge}>MY CONSULTANT PROFILE</div>
          </div>
          <Link href="/admin/settings" className={styles.backLink}>Settings</Link>
        </div>

        <h1>{consultant ? "Manage your consultant profile" : "Create your consultant profile"}</h1>
        <p className={styles.lead}>
          This profile is linked to your administrator account. Your administrator access and consultant identity remain under the same account relationship.
        </p>

        <div className={styles.identityStrip}>
          <div className={styles.avatar}>{photoPreview ? <img src={photoPreview} alt="Profile preview" /> : initials}</div>
          <div>
            <strong>{email || consultant?.email || "Your administrator email"}</strong>
            <span>{consultant?.active ? "Consultant profile active" : consultant ? "Consultant profile revoked" : "Consultant profile not created yet"}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <label>
              <span>Consultant name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required disabled={saving} />
            </label>
            <label>
              <span>Email</span>
              <input value={email || consultant?.email || ""} readOnly disabled />
            </label>
          </div>

          <label>
            <span>Phone number</span>
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} placeholder="+91 9876543210" required disabled={saving} />
          </label>

          <label>
            <span>Area of specialization</span>
            <input value={specialization} onChange={(event) => setSpecialization(event.target.value)} maxLength={200} placeholder="Vedic Astrology, Numerology, Marriage Guidance…" required disabled={saving} />
          </label>

          <div className={styles.sectionTitle}>Profile photo</div>
          <div className={styles.photoRow}>
            <div className={styles.photoPreview}>{photoPreview ? <img src={photoPreview} alt="Consultant preview" /> : <span>{initials}</span>}</div>
            <div className={styles.photoControls}>
              <strong>Use a clear professional photo</strong>
              <p>JPG, PNG or WebP · Maximum 5 MB</p>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} disabled={saving} />
            </div>
          </div>

          <div className={styles.sectionTitle}>Consultation modes</div>
          <div className={styles.modeGrid}>
            {MODES.map((mode) => {
              const selected = availableModes.includes(mode.value);
              return (
                <button key={mode.value} type="button" className={`${styles.mode} ${selected ? styles.modeSelected : ""}`} onClick={() => toggleMode(mode.value)} disabled={saving} aria-pressed={selected}>
                  <span className={styles.modeCheck}>{selected ? "✓" : ""}</span>
                  <span><strong>{mode.title}</strong><small>{mode.description}</small></span>
                </button>
              );
            })}
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}

          <div className={styles.actions}>
            <Link href="/admin/settings" className={styles.secondaryButton}>Cancel</Link>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Saving…" : consultant ? "Save Consultant Profile" : "Create My Consultant Profile"}
            </button>
          </div>
        </form>

        <div className={styles.footerNote}>
          Availability remains managed by the administration team. Removing administrator access automatically removes this profile from active consultant visibility; restoring access restores it with the same consultant ID.
        </div>
      </div>
    </main>
  );
}
