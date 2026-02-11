import type { Metadata } from "next";
import {
    Inter,
    JetBrains_Mono,
    Noto_Sans_Devanagari,
    Noto_Sans_Tamil,
    Noto_Sans_Kannada,
} from "next/font/google";
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
const notoSansDevanagari = Noto_Sans_Devanagari({
    subsets: ["devanagari"],
    variable: "--font-native-devanagari",
    display: "swap",
    weight: ["400", "500", "600"],
});
const notoSansTamil = Noto_Sans_Tamil({
    subsets: ["tamil"],
    variable: "--font-native-tamil",
    display: "swap",
    weight: ["400", "500", "600"],
});
const notoSansKannada = Noto_Sans_Kannada({
    subsets: ["kannada"],
    variable: "--font-native-kannada",
    display: "swap",
    weight: ["400", "500", "600"],
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} ${notoSansTamil.variable} ${notoSansKannada.variable} font-sans antialiased grain-overlay`}>
        {children}
      </body>
    </html>);
}
