import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Document Redaction Tool",
  description: "Automatically redact sensitive information from documents",
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
