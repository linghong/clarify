import Link from 'next/link';

export function Logo() {
  return (
    <Link
      href="/"
      className="font-playfair text-3xl italic hover:scale-105 transition-all duration-300"
      aria-label="Return to Clarify home page"
    >
      <span className="bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]">
        Clarify
      </span>
    </Link>
  );
}