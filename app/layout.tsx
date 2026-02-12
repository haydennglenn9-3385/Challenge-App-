// app/layout.tsx
import "./globals.css";
import { useEffect } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isEmbedded = window !== window.parent;
    if (isEmbedded) {
      document.body.classList.add("embedded");
    }
  }, []);

  return (
    <html lang="en">
      <body>
        <div className="site-wrapper">{children}</div>
      </body>
    </html>
  );
}
