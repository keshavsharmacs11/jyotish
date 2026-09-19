"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reset the document scroll position when the route changes.
 * Same-page anchor navigation is intentionally left to the browser/CSS.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Preserve intentional in-page/hash navigation.
    if (window.location.hash) {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" as ScrollBehavior,
    });
  }, [pathname]);

  return null;
}
