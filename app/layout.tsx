import "./globals.css";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import ClientWrapper from "./client-wrapper";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Q&A Fitness",
  description: "Fitness challenges for the community",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`}>
      <body>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}