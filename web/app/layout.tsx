import type { Metadata } from "next";
import { Quicksand, Crimson_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
const quicksand = Quicksand({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
    weight: ["300", "400", "500", "600", "700"],
});
const crimsonPro = Crimson_Pro({
    subsets: ["latin"],
    variable: "--font-serif",
    display: "swap",
    weight: ["400", "500", "600", "700"],
});
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    display: "swap",
    weight: ["400", "500", "600", "700"],
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
      <body className={`${quicksand.variable} ${crimsonPro.variable} ${jetbrainsMono.variable} font-sans antialiased grain-overlay`}>
        {children}
      </body>
    </html>);
}
