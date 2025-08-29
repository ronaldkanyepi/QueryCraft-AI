import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider"
import Providers from "@/components/ui/providers";
import {Toaster} from "@/components/ui/sonner";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QueryCraft AI",
  description: "Intelligent data agent for instant insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" suppressHydrationWarning>
      <head>
          <link rel="apple-touch-icon" sizes="180x180" href="/img/apple-touch-icon.png"/>
          <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32x32.png"/>
          <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon-16x16.png"/>
          <link rel="manifest" href="/img/site.webmanifest"/>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
      >
          <Providers>
              {children}
              <Toaster position="top-right" richColors />
          </Providers>
      </ThemeProvider>
      </body>
      </html>
  );
}
