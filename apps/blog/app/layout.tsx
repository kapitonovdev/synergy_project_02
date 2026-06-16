import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Practice Blog",
  description: "Учебное приложение блога для технологической практики",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
