import type { Metadata } from "next";
import { Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LangSync } from "@/components/lang-sync";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Solo Doctor | eMedicine Platform",
  description: "Online consultations, appointments and prescriptions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${playfair.variable}`}>
      <body className="font-sans bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <LangSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
