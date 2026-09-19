"use client";

import {
  useEffect,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

const navigation = [
  {
    key: "nav.home",
    href: "/",
  },
  {
    key: "nav.about",
    href: "/about",
  },
  {
    key: "nav.services",
    href: "/services",
  },
  {
    key: "nav.consultants",
    href: "/consultants",
  },
  {
    key: "nav.shop",
    href: "/shop",
  },
  {
    key: "nav.contact",
    href: "/contact",
  },
] as const;

export default function Navbar() {
  const { language, setLanguage, t } =
    useLanguage();

  const pathname = usePathname();

  const isNavItemActive = (
    href: string
  ) => {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  const [scrolled, setScrolled] =
    useState(false);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    sessionChecked,
    setSessionChecked,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const checkSession = async () => {
    try {
      const response =
        await fetch(
          "/api/account/session",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data =
        await response.json();

      if (
        response.ok &&
        data.success
      ) {
        setAuthenticated(
          !!data.authenticated
        );
      } else {
        setAuthenticated(false);
      }
    } catch (error) {
      console.error(
        "NAVBAR SESSION CHECK ERROR:",
        error
      );

      setAuthenticated(false);
    } finally {
      setSessionChecked(true);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(
        window.scrollY > 20
      );
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const response =
        await fetch(
          "/api/account/logout",
          {
            method: "POST",
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
            "Unable to log out."
        );
      }

      setAuthenticated(false);
      setAccountMenuOpen(false);
      setMobileMenuOpen(false);

      window.location.href = "/";
    } catch (error) {
      console.error(
        "CUSTOMER LOGOUT ERROR:",
        error
      );

      setLoggingOut(false);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to log out."
      );
    }
  };

  useEffect(() => {
    const handlePointerDown = (
      event: PointerEvent
    ) => {
      const target =
        event.target as
          | HTMLElement
          | null;

      if (
        !target?.closest(
          ".navbar-account"
        )
      ) {
        setAccountMenuOpen(false);
      }

      if (
        !target?.closest(
          ".navbar-mobile"
        ) &&
        !target?.closest(
          ".navbar-mobile-menu"
        ) &&
        !target?.closest(
          ".navbar-brand"
        )
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow =
        "";

      return;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const languageSwitcher = (
    <div
      className="navbar-language"
      aria-label={
        language === "hi"
          ? "भाषा चयन"
          : "Language selection"
      }
    >
      <button
        type="button"
        className={`navbar-language-option ${
          language === "en"
            ? "is-active"
            : ""
        }`}
        onClick={() =>
          setLanguage("en")
        }
        aria-pressed={
          language === "en"
        }
      >
        English
      </button>

      <span aria-hidden="true">
        |
      </span>

      <button
        type="button"
        className={`navbar-language-option ${
          language === "hi"
            ? "is-active"
            : ""
        }`}
        onClick={() =>
          setLanguage("hi")
        }
        aria-pressed={
          language === "hi"
        }
      >
        हिन्दी
      </button>
    </div>
  );

  const accountDropdown = (
    <div className="navbar-account">
      <button
        type="button"
        className="btn btn-outline navbar-account-trigger"
        aria-haspopup="menu"
        aria-expanded={
          accountMenuOpen
        }
        onClick={() =>
          setAccountMenuOpen(
            (open) => !open
          )
        }
      >
        {t("nav.account")}

        <span aria-hidden="true">
          ⌄
        </span>
      </button>

      {accountMenuOpen && (
        <div
          className="navbar-account-menu"
          role="menu"
        >
          {authenticated ? (
            <>
              <Link
                href="/my-bookings"
                role="menuitem"
                onClick={() =>
                  setAccountMenuOpen(
                    false
                  )
                }
              >
                {t("nav.myBookings")}
              </Link>

              <Link
                href="/track-booking"
                role="menuitem"
                onClick={() =>
                  setAccountMenuOpen(
                    false
                  )
                }
              >
                {t("nav.trackBooking")}
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
              >
                {loggingOut
                  ? t("nav.loggingOut")
                  : t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/account/login"
                role="menuitem"
                onClick={() =>
                  setAccountMenuOpen(
                    false
                  )
                }
              >
                {t("nav.login")}
              </Link>

              <Link
                href="/account/create"
                role="menuitem"
                onClick={() =>
                  setAccountMenuOpen(
                    false
                  )
                }
              >
                {t("nav.createAccount")}
              </Link>

              <Link
                href="/track-booking"
                role="menuitem"
                onClick={() =>
                  setAccountMenuOpen(
                    false
                  )
                }
              >
                {t("nav.trackMyBooking")}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header
      className={`navbar ${
        scrolled
          ? "navbar-scrolled"
          : ""
      } ${
        mobileMenuOpen
          ? "navbar-menu-open"
          : ""
      }`}
    >
      <div className="site-container navbar-inner">

        <Link
          href="/"
          className="navbar-brand"
          onClick={() => {
            setMobileMenuOpen(false);
            setAccountMenuOpen(false);
          }}
        >
          <Image
            src="/images/brand/logo-navbar.webp"
            alt="Akshaanshh Jyotish"
            width={180}
            height={65}
            priority
            className="navbar-logo"
          />
        </Link>

        <nav
          className="navbar-links"
          aria-label={
            language === "hi"
              ? "मुख्य नेविगेशन"
              : "Main navigation"
          }
        >
          {navigation.map((item) => {
            const active =
              isNavItemActive(
                item.href
              );

            return (
              <Link
                key={item.key}
                href={item.href}
                className={
                  active
                    ? "is-active"
                    : undefined
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="navbar-desktop-actions">

          {languageSwitcher}

          {sessionChecked &&
            accountDropdown}

          <Link
            href="/book"
            className="btn btn-primary navbar-book"
          >
            {t("nav.bookConsultation")}

            <span aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <div className="navbar-mobile">

          {sessionChecked && (
            <div className="navbar-account">

              <button
                type="button"
                className="btn btn-outline navbar-account-trigger navbar-mobile-account"
                aria-haspopup="menu"
                aria-expanded={
                  accountMenuOpen
                }
                onClick={() => {
                  setAccountMenuOpen(
                    (open) => !open
                  );

                  setMobileMenuOpen(false);
                }}
              >
                {t("nav.account")}

                <span aria-hidden="true">
                  ⌄
                </span>
              </button>

              {accountMenuOpen && (
                <div
                  className="navbar-account-menu"
                  role="menu"
                >
                  {authenticated ? (
                    <>
                      <Link
                        href="/my-bookings"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t("nav.myBookings")}
                      </Link>

                      <Link
                        href="/track-booking"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t("nav.trackBooking")}
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={
                          handleLogout
                        }
                        disabled={
                          loggingOut
                        }
                      >
                        {loggingOut
                          ? t("nav.loggingOut")
                          : t("nav.logout")}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/account/login"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t("nav.login")}
                      </Link>

                      <Link
                        href="/account/create"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t("nav.createAccount")}
                      </Link>

                      <Link
                        href="/track-booking"
                        role="menuitem"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t("nav.trackMyBooking")}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className={`navbar-mobile-toggle ${
              mobileMenuOpen
                ? "is-open"
                : ""
            }`}
            aria-label={
              mobileMenuOpen
                ? language === "hi"
                  ? "नेविगेशन मेनू बंद करें"
                  : "Close navigation menu"
                : language === "hi"
                  ? "नेविगेशन मेनू खोलें"
                  : "Open navigation menu"
            }
            aria-expanded={
              mobileMenuOpen
            }
            aria-controls="mobile-navigation-menu"
            onClick={() => {
              setMobileMenuOpen(
                (open) => !open
              );

              setAccountMenuOpen(false);
            }}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation-menu"
        className="navbar-mobile-menu"
        aria-hidden={
          !mobileMenuOpen
        }
      >
        {mobileMenuOpen && (
          <nav
            className="navbar-mobile-links"
            aria-label={
              language === "hi"
                ? "मोबाइल नेविगेशन"
                : "Mobile navigation"
            }
          >

            <div className="navbar-mobile-language">
              <span>
                {language === "hi"
                  ? "भाषा"
                  : "Language"}
              </span>

              {languageSwitcher}
            </div>

            {navigation.map((item) => {
              const active =
                isNavItemActive(
                  item.href
                );

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={
                    active
                      ? "is-active"
                      : undefined
                  }
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  onClick={
                    closeMobileMenu
                  }
                >
                  <span>
                    {t(item.key)}
                  </span>

                  <span aria-hidden="true">
                    →
                  </span>
                </Link>
              );
            })}

            <Link
              href="/track-booking"
              className={
                isNavItemActive(
                  "/track-booking"
                )
                  ? "is-active"
                  : undefined
              }
              aria-current={
                isNavItemActive(
                  "/track-booking"
                )
                  ? "page"
                  : undefined
              }
              onClick={
                closeMobileMenu
              }
            >
              <span>
                {t("nav.trackBooking")}
              </span>

              <span aria-hidden="true">
                →
              </span>
            </Link>

            <Link
              href="/book"
              className="navbar-mobile-book"
              onClick={
                closeMobileMenu
              }
            >
              <span>
                {t("nav.bookConsultation")}
              </span>

              <span aria-hidden="true">
                →
              </span>
            </Link>

          </nav>
        )}
      </div>
    </header>
  );
}