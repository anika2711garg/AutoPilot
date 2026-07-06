import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Autopilot — AI Travel Copilot",
  description: "Plan, optimize, and book complete trips with a multi-agent AI copilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#0a0a0a",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans)",
        },
        elements: {
          formButtonPrimary:
            "bg-indigo-500 hover:bg-indigo-600 text-sm normal-case font-medium",
          card: "bg-[#111111] border border-white/10 shadow-2xl",
          headerTitle: "text-white font-semibold tracking-tight",
          headerSubtitle: "text-white/50",
          socialButtonsBlockButton:
            "border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm",
          dividerLine: "bg-white/10",
          dividerText: "text-white/30",
          formFieldLabel: "text-white/70 text-sm",
          formFieldInput:
            "bg-white/5 border-white/10 text-white placeholder-white/30 focus:ring-indigo-500",
          footerActionLink: "text-indigo-400 hover:text-indigo-300",
          identityPreviewText: "text-white/70",
          identityPreviewEditButton: "text-indigo-400",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      >
        <body className="min-h-full bg-black text-white flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
