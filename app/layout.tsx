import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import Footer from "@/components/layout/footer";
import "./globals.css";

// Add Playfair for headings
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: {
    default: 'Clarify - AI-Powered Educational Assistant',
    template: '%s | Clarify AI'
  },
  description: 'Experience natural conversations with our advanced AI educational assistant. Voice-enabled, intelligent, and ready to help with your learning journey.',
  openGraph: {
    title: 'Clarify - AI-Powered Educational Assistant',
    description: 'Voice-enabled AI assistant for personalized learning experience',
    images: [{
      url: '/ai-landing.png',
      width: 1920,
      height: 1080,
      alt: 'Clarify AI Educational Assistant',
    }],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en">
      <body
        className={`${playfair.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* Main content takes remaining space */}
        <div className="flex-grow">
          {children}
        </div>

        {/* Footer always at bottom */}
        <Footer />
      </body>
    </html>
  );
}
