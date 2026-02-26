import "./globals.css";
import ClientWrapper from "./client-wrapper";

export const metadata = {
  title: "Challenge App",
  description: "Fitness challenges for the community",
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}