"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

interface AdminShellProps {
  children: ReactNode;
}

const navigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "⌂",
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: "◇",
  },
  {
    label: "Services",
    href: "/admin/services",
    icon: "✦",
  },
  {
    label: "Consultants",
    href: "/admin/consultants",
    icon: "♙",
  },
];

export default function AdminShell({
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  /*
   * Login page must NOT receive the
   * admin sidebar.
   */

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(
        "Admin logout error:",
        error
      );
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  return (
    <div className="admin-shell">
      {/* ======================================
          MOBILE OVERLAY
      ====================================== */}

      {mobileOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      {/* ======================================
          SIDEBAR
      ====================================== */}

      <aside
        className={`admin-sidebar ${
          mobileOpen
            ? "admin-sidebar-open"
            : ""
        }`}
      >
        {/* Brand */}

        <div className="admin-sidebar-brand">
          <div className="admin-brand-symbol">
            ✦
          </div>

          <div>
            <div className="admin-brand-name">
              AKSHAANSHH
            </div>

            <div className="admin-brand-subtitle">
              JYOTISH
            </div>
          </div>
        </div>

        {/* Navigation */}

        <div className="admin-sidebar-section">
          <div className="admin-sidebar-label">
            MAIN
          </div>

          <nav className="admin-sidebar-nav">
            {navigation.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(
                      item.href
                    );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item ${
                    active
                      ? "admin-nav-item-active"
                      : ""
                  }`}
                  onClick={() =>
                    setMobileOpen(false)
                  }
                >
                  <span className="admin-nav-icon">
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}

        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-label">
            SYSTEM
          </div>

          <Link
            href="/admin/settings"
            className={`admin-nav-item ${
              pathname.startsWith(
                "/admin/settings"
              )
                ? "admin-nav-item-active"
                : ""
            }`}
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <span className="admin-nav-icon">
              ⚙
            </span>

            <span>Settings</span>
          </Link>

          <button
            type="button"
            className="admin-nav-item admin-signout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span className="admin-nav-icon">
              ↪
            </span>

            <span>
              {loggingOut
                ? "Signing Out..."
                : "Sign Out"}
            </span>
          </button>
        </div>
      </aside>

      {/* ======================================
          MAIN AREA
      ====================================== */}

      <div className="admin-main">
        {/* Header */}

        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-mobile-menu"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open navigation"
            >
              ☰
            </button>

            <div>
              <div className="admin-topbar-eyebrow">
                ADMINISTRATION
              </div>

              <div className="admin-topbar-title">
                Akshaanshh Jyotish
              </div>
            </div>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-system-status">
              <span className="admin-status-dot" />

              <span>
                System Online
              </span>
            </div>

            <div
              className="admin-avatar"
              title="Administrator"
            >
              A
            </div>
          </div>
        </header>

        {/* Page */}

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}