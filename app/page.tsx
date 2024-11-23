import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative min-h-screen">
        {/* Background Image - Modified styling */}
        <div className="absolute inset-0">
          <Image
            src="/ai-landing.png"
            alt="AI Assistant Background"
            fill
            className="object-cover"
            quality={100}
            priority
            sizes="100vw"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        </div>
        
        {/* Gradient Overlay - Adjusted for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10" />
        
        {/* Hero Content - Adjusted positioning and colors */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Your AI Assistant - Clarify
          </h1>
          
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-2xl">
            Experience natural conversations with our advanced AI assistant. 
            Voice-enabled, intelligent, and ready to help.
          </p>
          
          {/* CTA Buttons - Updated styling */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <Link 
              href="/login"
              className="px-8 py-3 bg-slate-600 text-white rounded-full hover:bg-blue-700 transition-colors text-lg font-semibold"
            >
              Get Started
            </Link>
            <Link 
              href="/register"
              className="px-8 py-3 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-colors text-lg font-semibold"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4 bg-white/80">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <h3 className="text-xl font-semibold mb-4">Voice Interaction</h3>
            <p className="text-gray-600">Natural conversations through voice recognition</p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-xl font-semibold mb-4">Real-time Responses</h3>
            <p className="text-gray-600">Instant AI-powered assistance</p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-xl font-semibold mb-4">Secure Platform</h3>
            <p className="text-gray-600">End-to-end encrypted communications</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          <p>© 2024 Clarify AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
