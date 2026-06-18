import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookstore Practice",
  description: "Учебная web-версия книжного магазина",
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
