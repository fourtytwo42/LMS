export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-4 sm:py-5" role="contentinfo">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
        <p>&copy; {new Date().getFullYear()} LMS. All rights reserved.</p>
      </div>
    </footer>
  );
}

