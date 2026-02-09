import type { Metadata } from "next";
import { Poppins, Lora, Fira_Code } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Delrey — Audio Intelligence",
  description:
    "Enterprise-grade audio ingestion, transcription, and financial-speech understanding platform. Convert unstructured voice data into structured, actionable insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <script
        async
        crossOrigin="anonymous"
        src="https://tweakcn.com/live-preview.min.js"
      />
      <body
        className={`${poppins.variable} ${lora.variable} ${firaCode.variable} font-sans antialiased grain-overlay`}
      >
        {children}
      </body>
    </html>
  );
}
