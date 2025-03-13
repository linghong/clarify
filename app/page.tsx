import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <main className="min-h-screen">
        <section className="relative min-h-screen" aria-labelledby="hero-heading">
          {/* Background Image - Modified styling */}
          <div className="absolute inset-0" aria-hidden="true">
            <Image
              src="/ai-landing.png"
              alt="AI Educational Assistant Site Background"
              fill
              className="object-cover object-left"
              quality={100}
              priority
              sizes="100vw"
            />
          </div>
          {/* Gradient Overlay - Adjusted for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue/50 via-black/10 to-black/50" aria-hidden="true" />

          {/* Hero Content - Adjusted positioning and colors */}
          <div className="relative z-10 flex flex-col pb-32 lg:pb-52  items-center justify-center min-h-screen px-4 text-center  lg:ml-[7%] xl:ml-[6%] 2xl:ml-[4%]">
            <h1
              id="hero-heading"
              className="font-playfair text-4xl md:text-6xl lg:text-7xl font-bold text-white"
            >
              <span className="bg-gradient-to-r from-emerald-300 via-white to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]">
                Clarify
              </span>
            </h1>

            <p className="text-xl pt-6  md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Experience natural conversations with our advanced AI agent.
              Voice-enabled, intelligent, and ready to help.
            </p>

            {/* CTA Buttons - Updated styling */}
            {/* CTA Buttons */}
            <div className="flex gap-10 lg:gap-40 pt-24 lg:pt-48 flex-col sm:flex-row" role="group" aria-label="Get started">
              <Link
                href="/login"
                className="px-8 w-48  py-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors text-lg font-semibold focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:outline-none"
                aria-label="Get Started with Clarify"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="px-8 py-3 w-48  bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors text-lg font-semibold focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:outline-none"
                aria-label="Sign up for a new account"
              >
                Sign up
              </Link>
            </div>
          </div>
        </section>

        <section
          className="py-10 px-4 bg-white/90"
          aria-labelledby="features-heading"
        >
          <h2 id="features-heading" className="sr-only">Our Features</h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">Voice Interaction</h3>
              <p className="text-gray-600">Natural voice conversations with AI</p>
            </article>
            <article className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">Real-time Responses</h3>
              <p className="text-gray-600">Instant AI-powered assistance</p>
            </article>
            <article className="text-center p-6">
              <h3 className="text-xl font-semibold mb-4">Personalized Learning</h3>
              <p className="text-gray-600">Adaptive assistance tailored to your needs</p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
