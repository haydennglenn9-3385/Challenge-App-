"use client";

import { useEffect } from "react";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isEmbedded = window !== window.parent;
    if (isEmbedded) {
      document.body.classList.add("embedded");
    }
  }, []);

  return <>{children}</>;
}