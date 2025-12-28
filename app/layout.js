import { Saira } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./contexts/LanguageContext";
import DesktopAccessCheck from "./components/DesktopAccessCheck";

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Tur Salah Jalan",
  description: "Tur Salah Jalan Official Website",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${saira.variable} antialiased`}>
        <LanguageProvider>
          <DesktopAccessCheck>
            {children}
          </DesktopAccessCheck>
        </LanguageProvider>
      </body>
    </html>
  );
}
