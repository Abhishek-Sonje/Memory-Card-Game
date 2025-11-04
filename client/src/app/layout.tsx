import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Rubik_Iso, Zain, Poppins } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../context/SocketProvider"

const rubikIso = Rubik_Iso({
  subsets: ["latin"],
  weight: "400", // Rubik Iso comes in 400 weight
  variable: "--font-rubik-iso",
  display: "swap",
});

const zain = Zain({
  subsets: ["latin"],
  adjustFontFallback: true,
  weight: ["300", "400", "700", "800"], // Zain has multiple weights
  variable: "--font-zain",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  adjustFontFallback: true,
  weight: ["300", "400", "500", "600", "700", "800"], // Poppins has multiple weights
  variable: "--font-poppins",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Memory Game",
  description: "Multiplayer Memory Card Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${rubikIso.variable} ${zain.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <SocketProvider>{children}</SocketProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
