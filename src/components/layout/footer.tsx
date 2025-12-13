export function Footer() {
  return (
    <footer 
      className="w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 sm:py-5" 
      role="contentinfo"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p className="text-center">&copy; {new Date().getFullYear()} LMS. All rights reserved.</p>
      </div>
    </footer>
  );
}

