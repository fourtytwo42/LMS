"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { 
  BookOpen, 
  TrendingUp, 
  Users, 
  Award, 
  CheckCircle2, 
  BarChart3, 
  Shield, 
  Zap, 
  Globe, 
  Clock, 
  Target,
  ArrowRight,
  Star,
  PlayCircle
} from "lucide-react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 root-page" style={{ backgroundColor: 'white' }}>
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
              <Link href="/login">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 pt-16 pb-20" style={{ textAlign: 'center' }}>
          {/* Hero Section */}
          <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 bg-white dark:bg-gray-900" style={{ textAlign: 'center' }}>
            <div className="text-center max-w-5xl w-full mx-auto" style={{ textAlign: 'center' }}>
              <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                <Star className="h-4 w-4 fill-blue-600 dark:fill-blue-400" />
                Enterprise-Grade Learning Management System
              </div>
              <h1 className="mb-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Transform Your
                <span className="block text-blue-600 dark:text-blue-400">Learning Experience</span>
              </h1>
              <p className="mb-4 text-xl sm:text-2xl lg:text-3xl text-gray-700 dark:text-gray-300 font-medium leading-relaxed text-center">
                The Complete Platform for Modern Education and Training
              </p>
              <p className="mb-12 text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto text-center" style={{ textAlign: 'center' }}>
                Empower your organization with a comprehensive learning management system that delivers engaging courses, 
                tracks progress in real-time, and provides actionable insights. Whether you're training employees, 
                educating students, or building skills, our platform scales with your needs.
              </p>
              <div className="flex justify-center items-center gap-4">
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto">
                    Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="https://studio42.dev/contact?source=lms" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="text-lg px-8 py-6 h-auto">
                    Contact Us
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-white dark:bg-gray-900" style={{ textAlign: 'center' }}>
            <div className="max-w-6xl w-full mx-auto" style={{ textAlign: 'center' }}>
              <div className="text-center mb-16">
                <h2 className="mb-4 text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                  Everything You Need to Succeed
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-center" style={{ textAlign: 'center' }}>
                  Our comprehensive platform provides all the tools and features you need to create, 
                  deliver, and track exceptional learning experiences.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
                <div className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition-all duration-300 text-center">
                  <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform mx-auto block">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Comprehensive Course Library</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    Access an extensive library of professionally designed courses covering a wide range of topics. 
                    Create custom courses with multimedia content, interactive elements, and structured learning paths 
                    that engage learners and drive results.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Video, PDF, and presentation support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      YouTube integration
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Sequential learning paths
                    </li>
                  </ul>
                </div>
                
                <div className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:border-green-500 dark:hover:border-green-400 hover:shadow-xl transition-all duration-300 text-center w-full">
                  <div className="mb-6 w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Real-Time Progress Tracking</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    Monitor learner progress with precision and detail. Our advanced tracking system captures 
                    video watch time, assessment scores, completion rates, and engagement metrics, giving you 
                    complete visibility into learning outcomes.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Automatic progress updates
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Completion thresholds
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Detailed analytics dashboard
                    </li>
                  </ul>
                </div>
                
                <div className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-xl transition-all duration-300 text-center w-full">
                  <div className="mb-6 w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center">
                    <Users className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Expert-Led Instruction</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    Learn from industry-leading instructors and subject matter experts who bring real-world 
                    experience and practical knowledge to every course. Our instructor management system ensures 
                    quality content and personalized learning experiences.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Verified expert instructors
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Instructor assignment tools
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Direct learner support
                    </li>
                  </ul>
                </div>
                
                <div className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:border-yellow-500 dark:hover:border-yellow-400 hover:shadow-xl transition-all duration-300 text-center w-full">
                  <div className="mb-6 w-16 h-16 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center">
                    <Award className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Verified Certificates</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    Recognize achievement with professional certificates that validate skills and knowledge. 
                    Automatically generate certificates upon course completion, providing learners with 
                    tangible proof of their accomplishments.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Automated certificate generation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Customizable certificate templates
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Digital verification system
                    </li>
                  </ul>
                </div>
                
                <div className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-xl transition-all duration-300 text-center w-full">
                  <div className="mb-6 w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Advanced Assessments</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    Create comprehensive assessments with multiple question types, auto-grading, and instant 
                    feedback. Track performance, identify knowledge gaps, and ensure learners master the material 
                    before progressing.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Multiple question types
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Instant auto-grading
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Detailed performance reports
                    </li>
                  </ul>
                </div>
                
                <div className="group rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 hover:border-red-500 dark:hover:border-red-400 hover:shadow-xl transition-all duration-300 text-center w-full">
                  <div className="mb-6 w-16 h-16 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform mx-auto flex items-center justify-center">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Powerful Analytics</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    Make data-driven decisions with comprehensive analytics and reporting. Track enrollment trends, 
                    completion rates, learner engagement, and performance metrics to optimize your training programs 
                    and maximize ROI.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Real-time dashboards
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Custom report generation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Exportable data
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Additional Features Section */}
          <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-24 bg-gray-50 dark:bg-gray-800" style={{ textAlign: 'center' }}>
            <div className="max-w-6xl w-full mx-auto" style={{ textAlign: 'center' }}>
              <div className="text-center mb-16">
                <h2 className="mb-4 text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">
                  Built for Scale and Security
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-center" style={{ textAlign: 'center' }}>
                  Enterprise-grade features that grow with your organization
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
                <div className="text-center w-full max-w-xs">
                  <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto">
                    <Shield className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Enterprise Security</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Bank-level encryption, role-based access control, and compliance with industry standards
                  </p>
                </div>
                <div className="text-center w-full max-w-xs">
                  <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mx-auto">
                    <Zap className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Lightning Fast</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Optimized performance with CDN delivery and scalable infrastructure for any team size
                  </p>
                </div>
                <div className="text-center w-full max-w-xs">
                  <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mx-auto">
                    <Globe className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Global Access</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Access your courses from anywhere, on any device, with full mobile responsiveness
                  </p>
                </div>
                <div className="text-center w-full max-w-xs">
                  <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 mx-auto">
                    <Clock className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">24/7 Availability</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Round-the-clock access to learning materials with 99.9% uptime guarantee
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="w-full px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700" style={{ textAlign: 'center' }}>
            <div className="max-w-4xl w-full mx-auto text-center" style={{ textAlign: 'center' }}>
              <h2 className="mb-6 text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Ready to Transform Your Learning?
              </h2>
              <p className="mb-10 text-xl sm:text-2xl text-blue-100 leading-relaxed max-w-2xl mx-auto text-center" style={{ textAlign: 'center' }}>
                Join thousands of organizations already using our platform to deliver exceptional learning experiences. 
                Start your free trial today and see the difference.
              </p>
              <div className="flex justify-center items-center gap-4">
                <Link href="/login">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto bg-white/10 text-white border-white/20 hover:bg-white/20">
                    Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="https://studio42.dev/contact?source=lms" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="secondary" className="text-lg px-8 py-6 h-auto bg-white text-blue-600 hover:bg-gray-100">
                    Contact Us
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  );
}

