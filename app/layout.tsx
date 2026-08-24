import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Special Voice — Daily Bible Stories Delivered to Your Voicemail",
  description:
    "Hear the Bible every day. Warm, engaging Bible stories delivered straight to your phone as ringless voicemail — no app, no effort. Start with a free trial.",
  keywords: ["Bible stories", "ringless voicemail", "daily Bible", "Christian subscription", "RVM"],
  openGraph: {
    title: "The Special Voice",
    description: "Daily Bible stories delivered to your voicemail. Start with a free trial.",
    siteName: "The Special Voice",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
