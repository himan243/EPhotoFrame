import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Playfair_Display, Poppins, Dancing_Script } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/layout/pwa-register";
import { AppProviders } from "@/components/layout/app-providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display-name",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body-name",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const dancing = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sunstone Freshers Experience 2026",
  description:
    "Welcome to Sunstone. Take a selfie, frame your moment, and beam it to your phone with light — no internet required.",
  applicationName: "Sunstone Freshers 2026",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sunstone Freshers 2026",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Sunstone Freshers Experience 2026",
    description:
      "Take a selfie, frame your moment, and beam it to your phone with animated light — no internet required.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1022",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${playfair.variable} ${poppins.variable} ${dancing.variable} h-full antialiased`}
    >
      <body className="noise min-h-full">
        <AppProviders>{children}</AppProviders>
        <PwaRegister />
      </body>
    </html>
  );
}
