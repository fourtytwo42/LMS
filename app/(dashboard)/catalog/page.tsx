"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, GraduationCap, Search, Filter, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Course {
  id: string;
  code?: string;
  title: string;
  shortDescription?: string;
  thumbnail?: string;
  difficultyLevel?: string;
  estimatedTime?: number;
  publicAccess: boolean;
  selfEnrollment: boolean;
  featured: boolean;
  category?: {
    id: string;
    name: string;
  };
}

interface LearningPlan {
  id: string;
  code?: string;
  title: string;
  shortDescription?: string;
  thumbnail?: string;
  difficultyLevel?: string;
  estimatedTime?: number;
  publicAccess: boolean;
  selfEnrollment: boolean;
  featured: boolean;
  category?: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function CatalogPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCourses, setShowCourses] = useState(true);
  const [showLearningPlans, setShowLearningPlans] = useState(true);
  const [enrolling, setEnrolling] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch("/api/categories");
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }

        // Fetch courses
        const coursesResponse = await fetch(
          `/api/courses?status=PUBLISHED&publicAccess=true&selfEnrollment=true&limit=100`
        );
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setCourses(coursesData.courses || []);
        }

        // Fetch learning plans
        const plansResponse = await fetch(
          `/api/learning-plans?status=PUBLISHED&publicAccess=true&selfEnrollment=true&limit=100`
        );
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          setLearningPlans(plansData.learningPlans || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, isAuthLoading, router]);

  const handleSelfEnroll = async (courseId?: string, learningPlanId?: string) => {
    if (!user) return;

    const id = courseId || learningPlanId;
    if (!id) return;

    setEnrolling((prev) => new Set(prev).add(id));

    try {
      const response = await fetch("/api/enrollments/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          learningPlanId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to enroll");
      }

      const data = await response.json();
      alert(data.enrollment.message || "Successfully enrolled!");
      
      // Refresh data
      router.refresh();
    } catch (err: any) {
      alert(`Enrollment failed: ${err.message}`);
    } finally {
      setEnrolling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Filter courses and learning plans
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      !search ||
      course.title.toLowerCase().includes(search.toLowerCase()) ||
      course.shortDescription?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || course.category?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredLearningPlans = learningPlans.filter((plan) => {
    const matchesSearch =
      !search ||
      plan.title.toLowerCase().includes(search.toLowerCase()) ||
      plan.shortDescription?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || plan.category?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading || isAuthLoading) {
    return (
      <div className="container mx-auto py-8 text-center">Loading catalog...</div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Course Catalog</h1>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search courses and learning plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <Button
            variant={showCourses ? "default" : "outline"}
            onClick={() => setShowCourses(!showCourses)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Courses ({filteredCourses.length})
          </Button>
          <Button
            variant={showLearningPlans ? "default" : "outline"}
            onClick={() => setShowLearningPlans(!showLearningPlans)}
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            Learning Plans ({filteredLearningPlans.length})
          </Button>
        </div>
      </div>

      {/* Courses */}
      {showCourses && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Courses</h2>
          {filteredCourses.length === 0 ? (
            <p className="text-gray-600">No courses found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="p-6 hover:shadow-lg transition-shadow">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                  {course.shortDescription && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {course.shortDescription}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    {course.category && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {course.category.name}
                      </span>
                    )}
                    {course.difficultyLevel && (
                      <span>Level: {course.difficultyLevel}</span>
                    )}
                    {course.estimatedTime && (
                      <span>{course.estimatedTime} min</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/courses/${course.id}`}>
                      <Button variant="outline" className="flex-1">
                        View Details
                      </Button>
                    </Link>
                    {course.selfEnrollment && (
                      <Button
                        onClick={() => handleSelfEnroll(course.id)}
                        disabled={enrolling.has(course.id)}
                        className="flex-1"
                      >
                        {enrolling.has(course.id) ? "Enrolling..." : "Enroll"}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learning Plans */}
      {showLearningPlans && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Learning Plans</h2>
          {filteredLearningPlans.length === 0 ? (
            <p className="text-gray-600">No learning plans found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLearningPlans.map((plan) => (
                <Card key={plan.id} className="p-6 hover:shadow-lg transition-shadow">
                  {plan.thumbnail && (
                    <img
                      src={plan.thumbnail}
                      alt={plan.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-xl font-semibold mb-2">{plan.title}</h3>
                  {plan.shortDescription && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {plan.shortDescription}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    {plan.category && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {plan.category.name}
                      </span>
                    )}
                    {plan.difficultyLevel && (
                      <span>Level: {plan.difficultyLevel}</span>
                    )}
                    {plan.estimatedTime && (
                      <span>{plan.estimatedTime} min</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/learning-plans/${plan.id}`}>
                      <Button variant="outline" className="flex-1">
                        View Details
                      </Button>
                    </Link>
                    {plan.selfEnrollment && (
                      <Button
                        onClick={() => handleSelfEnroll(undefined, plan.id)}
                        disabled={enrolling.has(plan.id)}
                        className="flex-1"
                      >
                        {enrolling.has(plan.id) ? "Enrolling..." : "Enroll"}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

