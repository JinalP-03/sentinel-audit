import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sentinel - AI Voice Agent Compliance Auditor",
  description:
    "Autonomous compliance inspector for voice AI agents - EU AI Act, UK Service Standard, and GDPR purpose-limitation checks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * suppressHydrationWarning on <html>: the theme script below (and the
     * ThemeProvider) may add/remove the "dark" class before or during
     * hydration, causing a server/client className mismatch. This prop tells
     * React to accept the live DOM value rather than warn or revert.
     */
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * Inline theme-init script — runs synchronously before the browser
         * paints any content, preventing a flash of the wrong theme on
         * load/refresh for users who have a stored preference.
         *
         * This is a plain <script> (not next/script) intentionally: as a
         * Server Component, layout.tsx emits this directly as raw HTML so
         * React's client renderer never encounters it in the component tree
         * and cannot fire the "Encountered a script tag" warning.
         * suppressHydrationWarning on the element tells the reconciler to
         * skip diffing it entirely during hydration.
         */}
        {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
        <script
          suppressHydrationWarning
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
