import type { Metadata } from "next";
import {Suspense} from "react";
import StudentOS from "@/components/student-os";
import "./globals.css";
export const metadata: Metadata = {
  title: "PersonalOS · Student OS",
  description: "由自己的資料出發，逐堂建立 Personal OS。",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body><Suspense fallback={<main className="standalone">載入工作空間…</main>}><StudentOS/></Suspense>{children}</body>
    </html>
  );
}
