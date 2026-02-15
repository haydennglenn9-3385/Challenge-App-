// archive/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Challenge App",
  description: "Fitness challenges for the community",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}