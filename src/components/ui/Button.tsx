"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
}

export default function Button({
  children,
  href = "#",
  variant = "primary",
}: ButtonProps) {
  return (
    <motion.div
      whileHover={{
        y: -3,
        scale: 1.02,
      }}
      whileTap={{
        scale: 0.97,
      }}
      transition={{
        duration: 0.2,
      }}
    >
      <Link
        href={href}
        className={`btn ${
          variant === "primary"
            ? "btn-primary"
            : "hero-secondary"
        }`}
      >
        {children}
      </Link>
    </motion.div>
  );
}