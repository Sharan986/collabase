import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";
import {SpringMouseFollow} from "@/components/ui/skiper61";
import { AuthProvider } from "@/lib/firebase-context";
import { Toaster } from "sonner";
import Nav from "@/components/Nav";
import { Analytics } from "@vercel/analytics/next"

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const pressStart = Press_Start_2P({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Collabase - Find Your Hackathon Team",
  description: "Form balanced hackathon teams in minutes. Match skills, build serious teams, and collaborate better.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${pressStart.variable} antialiased`}
      >
        <AuthProvider>
          <Nav />
          <SpringMouseFollow />
          <Analytics />
          {children}
          <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
        </AuthProvider>
      </body>
    </html>
  );
}
