export default function Footer() {
  return (
    <footer className="bg-gray-50 py-8" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
        <p>&copy; {new Date().getFullYear()} Clarify AI. All rights reserved.</p>
      </div>
    </footer>
  );
}