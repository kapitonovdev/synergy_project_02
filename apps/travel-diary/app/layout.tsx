import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel Diary Practice",
  description: "Учебный дневник путешествий"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
