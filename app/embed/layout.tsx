"use client";

import { Suspense } from "react";
import { UserProvider } from "@/lib/UserContext";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-16 py-10">
      <div className="w-full max-w-5xl mx-auto">
        <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
          <UserProvider>
            {children}
          </UserProvider>
        </Suspense>
      </div>
    </div>
  );
}