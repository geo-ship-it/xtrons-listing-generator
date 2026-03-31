import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XTRONS AI Listing Generator",
  description:
    "Generate optimised product listings for all major marketplaces and social platforms",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f1117] text-slate-200">
        {children}
      </body>
    </html>
  );
}
