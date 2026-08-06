"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Consultants", href: "/consultants" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      <div className="site-container navbar-inner">

        <Link href="/" className="navbar-brand">
          <Image
            src="/images/brand/logo.png"
            alt="Akshaanshh Jyotish"
            width={180}
            height={70}
            priority
            className="navbar-logo"
          />
        </Link>

        <nav className="navbar-links" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              {item.name}
            </Link>
          ))}
        </nav>

        <Link href="/book" className="btn btn-primary navbar-book">
          Book Consultation
          <span aria-hidden="true">→</span>
        </Link>

      </div>
    </header>
  );
}