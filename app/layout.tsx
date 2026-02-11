import "./globals.css";

export const metadata = {
  title: "Gym Challenge Hub",
  description: "Queers and Allies Fitness Challenge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
