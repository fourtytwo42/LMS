import Link from "next/link";
import { Github } from "lucide-react";

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
      <div className="w-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} LMS. All rights reserved.</p>
          <Link
            href="https://github.com/fourtytwo42/LMS"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            aria-label="View on GitHub"
          >
            <Github className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

