import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IRAAC Platform",
  description: "IRAAC listening platform — survey, consent, campaign and reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
