
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "College Predictor | MHT-CET Engineering Admissions",
  description:
    "Explore Maharashtra engineering colleges using MHT-CET percentile, category, preferred branches, city, and historical CAP cutoff records.",
  applicationName: "College Predictor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
