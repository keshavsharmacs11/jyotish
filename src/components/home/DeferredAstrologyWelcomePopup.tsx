"use client";

import dynamic from "next/dynamic";

const AstrologyWelcomePopup = dynamic(
  () => import("@/components/home/AstrologyWelcomePopup"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function DeferredAstrologyWelcomePopup() {
  return <AstrologyWelcomePopup />;
}
