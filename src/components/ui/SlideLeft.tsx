"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SlideLeftProps {
  children: ReactNode;
}

export default function SlideLeft({
  children,
}: SlideLeftProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -60,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}