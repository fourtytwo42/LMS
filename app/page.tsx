"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BookOpen, TrendingUp, Users, Award, CheckCircle2, BarChart3 } from "lucide-react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm" role="banner">
          <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                  LMS
                </Link>
              </h1>
            </div>

            <nav className="flex items-center gap-4" aria-label="Navigation">
              {mounted && <ThemeToggle />}
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 pt-16 pb-20">
          {/* Hero Section */}
          <section className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
            <div className="text-center max-w-4xl w-full">
              <h2 className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
                Learn. Grow. Succeed.
              </h2>
              <p className="mb-10 text-lg sm:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Your comprehensive learning management system for modern education
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Get Started
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    Log in
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="w-full flex justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 justify-items-center max-w-6xl w-full">
              <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Comprehensive Courses</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Access a wide range of courses designed to help you learn and grow in your field.
                </p>
              </div>
              
              <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Track Progress</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Monitor your learning journey with detailed progress tracking and analytics.
                </p>
              </div>
              
              <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Expert Instructors</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Learn from experienced instructors dedicated to your success.
                </p>
              </div>
              
              <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                  <Award className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Certificates</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Earn certificates upon course completion to showcase your achievements.
                </p>
              </div>
              
              <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Assessments</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Test your knowledge with comprehensive assessments and get instant feedback.
                </p>
              </div>
              
              <div className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">Analytics</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Get insights into your learning patterns and performance with detailed analytics.
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
}

