import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIG AI — Autonomous Issue-to-PR Engine",
  description: "Headless AI agent pipeline that ingests GitHub issues, localizes code, generates pytest reproductions, verifies patches, and requests human approval for draft PRs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full light">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
