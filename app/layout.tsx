import "./globals.css";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";

const displayFont = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-display" });
const bodyFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata = {
  title: "Queers and Allies Fitness Challenge",
  description: "Challenge-driven fitness for gym communities",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
