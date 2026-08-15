"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />

      {children}

      <Footer />
    </>
  );
}