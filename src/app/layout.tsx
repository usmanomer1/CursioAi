import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "@/providers/convex-provider";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { AppToaster } from "@/components/app-toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cursio — AI Job Search & Resume Optimizer",
    template: "%s · Cursio",
  },
  description:
    "Find jobs matched to your resume, optimize applications, and get AI coaching for every role.",
  applicationName: "Cursio",
  keywords: [
    "job search",
    "resume optimizer",
    "ATS",
    "AI job matching",
    "career",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* Apply the stored theme before first paint (no flash). */}
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <ThemeProvider>
            <ConvexClientProvider>
              {children}
              <AppToaster />
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
