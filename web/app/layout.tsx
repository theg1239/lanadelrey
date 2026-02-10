import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
});
export const metadata: Metadata = {
    title: "Delrey — Audio Intelligence",
    description: "Enterprise-grade audio ingestion, transcription, and financial-speech understanding platform. Convert unstructured voice data into structured, actionable insights.",
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="en" className="dark" suppressHydrationWarning>
      <script async crossOrigin="anonymous" src="https://tweakcn.com/live-preview.min.js"/>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased grain-overlay`}>
        {children}
      </body>
    </html>);
}
