"use client";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    setEmail(sp.get("email"));
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We sent a verification link to {email ? <span className="font-medium text-gray-900">{email}</span> : "your email"}
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-gray-700 font-semibold">Next steps:</p>
          <ol className="text-sm text-gray-700 mt-2 ml-4 list-decimal space-y-1">
            <li>Open the email we sent</li>
            <li>Click the verification link</li>
            <li>Log in to your account</li>
          </ol>
        </div>
        <p className="text-sm text-gray-500 mb-4">Didn't receive it? Check spam folder.</p>
        <a href="/login" className="inline-block bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800">Go to Login</a>
      </div>
    </div>
  );
}
