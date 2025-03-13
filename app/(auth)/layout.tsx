
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

// Metadata for auth pages
export const metadata: Metadata = {
  title: 'Clarify Account',
  description: 'Access your personalized AI learning experience',
  openGraph: {
    title: 'Clarify Account',
    description: 'Access your personalized AI learning experience',
    images: [{
      url: '/ai-landing.png',
      width: 1920,
      height: 1080,
      alt: 'Clarify AI Educational Assistant',
    }],
  },
};

// Layout component that wraps login and register pages
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Background wrapper - absolute positioning */}
      <div className="fixed inset-0" aria-hidden="true">
        <Image
          src="/ai-landing.png"
          alt=""
          fill
          className="object-cover object-right object-rightobject-right"
          quality={100}
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue/500 via-transparent  to-black/500" />
      </div>

      {/* Content wrapper - relative positioning and flex-grow */}
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header */}
        <div className="pt-4 px-4">
          <Link
            href="/"
            className={"font-playfair text-3xl italic hover:scale-105 transition-all duration-300"}
            aria-label="Return to Clarify home page"
          >
            <span className="bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]">
              Clarify
            </span>
          </Link>
        </div>

        {/* Main content - flex-grow to push footer down */}
        <div className="flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
}