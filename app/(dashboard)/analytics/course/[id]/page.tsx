"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CourseAnalytics {
  courseId: string;
  enrollments: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
  };
  completionRate: number;
  averageScore: number;
  averageTimeToComplete: number;
  contentItems: Array<{
    id: string;
    title: string;
    type: string;
    completionRate?: number;
    averageWatchTime?: number;
    timesWatched?: number;
    uniqueViewers?: number;
    totalAttempts?: number;
    passRate?: number;
    averageScore?: number;
    completions?: number;
  }>;
}

export default function CourseAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/analytics/course/${courseId}`);
        if (!response.ok) throw new Error("Failed to fetch analytics");

        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error("Error fetching course analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [courseId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "COURSE",
          entityId: courseId,
          format: "CSV",
        }),
      });

      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `course-${courseId}-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Failed to export analytics");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="container mx-auto py-8">Failed to load analytics</div>;
  }

  const enrollmentData = [
    { name: "Active", value: analytics.enrollments.active },
    { name: "Completed", value: analytics.enrollments.completed },
    { name: "Dropped", value: analytics.enrollments.dropped },
  ];

  const contentItemData = analytics.contentItems.map((item) => ({
    name: item.title.length > 20 ? item.title.substring(0, 20) + "..." : item.title,
    completionRate: item.completionRate || 0,
    averageScore: item.averageScore || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/courses/${courseId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
          <h1 className="text-3xl font-bold">Course Analytics</h1>
        </div>
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Enrollments</h3>
          <p className="mt-2 text-3xl font-bold">{analytics.enrollments.total}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Completion Rate</h3>
          <p className="mt-2 text-3xl font-bold">{analytics.completionRate.toFixed(1)}%</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Average Score</h3>
          <p className="mt-2 text-3xl font-bold">{analytics.averageScore.toFixed(1)}%</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg Time (min)</h3>
          <p className="mt-2 text-3xl font-bold">{analytics.averageTimeToComplete.toFixed(0)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Enrollment Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={enrollmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Content Item Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contentItemData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completionRate" fill="#8884d8" name="Completion Rate %" />
              <Bar dataKey="averageScore" fill="#82ca9d" name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Content Items Detail</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Completion Rate</th>
                <th className="px-4 py-2 text-right">Avg Score</th>
                <th className="px-4 py-2 text-right">Views/Attempts</th>
              </tr>
            </thead>
            <tbody>
              {analytics.contentItems.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-2">{item.title}</td>
                  <td className="px-4 py-2">{item.type}</td>
                  <td className="px-4 py-2 text-right">
                    {item.completionRate !== undefined
                      ? `${item.completionRate.toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.averageScore !== undefined
                      ? `${item.averageScore.toFixed(1)}%`
                      : "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {item.timesWatched || item.totalAttempts || item.completions || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

