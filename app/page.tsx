import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-gray-900">LMS</h1>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="mb-4 text-5xl font-bold text-gray-900">
            Learn. Grow. Succeed.
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            Your comprehensive learning management system for modern education
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="lg">
                Log in
              </Button>
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-2 text-xl font-semibold">Comprehensive Courses</h3>
              <p className="text-gray-600">
                Access a wide range of courses designed to help you learn and grow.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-2 text-xl font-semibold">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your learning journey with detailed progress tracking and analytics.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-2 text-xl font-semibold">Expert Instructors</h3>
              <p className="text-gray-600">
                Learn from experienced instructors dedicated to your success.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} LMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

