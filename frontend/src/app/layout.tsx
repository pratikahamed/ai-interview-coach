import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "cn";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Interview Coach",
  description: "Practice technical interviews with an AI-powered interviewer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          inter.className,
          "min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-slate-800 selection:text-white"
        )}
      >
        {children}
      </body>
    </html>
  );
}
