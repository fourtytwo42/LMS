"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";

interface OverviewData {
  users: {
    total: number;
    learners: number;
    instructors: number;
    admins: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  learningPlans: {
    total: number;
    published: number;
  };
  enrollments: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
  };
  trends: {
    enrollments: Array<{ date: string; count: number }>;
  };
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.roles?.includes("ADMIN") || false;

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/overview");
        if (!response.ok) throw new Error("Failed to fetch analytics");

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, router]);

  if (loading) {
    return <div className="w-full py-8 text-center">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="w-full py-8 text-center text-red-600">Failed to load analytics</div>;
  }

  const enrollmentStatusData = [
    { name: "Active", value: data.enrollments.active },
    { name: "Completed", value: data.enrollments.completed },
    { name: "Dropped", value: data.enrollments.dropped },
  ];

  const courseStatusData = [
    { name: "Published", value: data.courses.published },
    { name: "Draft", value: data.courses.draft },
    { name: "Archived", value: data.courses.archived },
  ];

  const userRoleData = [
    { name: "Learners", value: data.users.learners },
    { name: "Instructors", value: data.users.instructors },
    { name: "Admins", value: data.users.admins },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="mt-2 text-3xl font-bold">{data.users.total}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-gray-500">Total Courses</h3>
          <p className="mt-2 text-3xl font-bold">{data.courses.total}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-gray-500">Learning Plans</h3>
          <p className="mt-2 text-3xl font-bold">{data.learningPlans.total}</p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-gray-500">Total Enrollments</h3>
          <p className="mt-2 text-3xl font-bold">{data.enrollments.total}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-semibold">Enrollment Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends.enrollments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" name="Enrollments" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 text-xl font-semibold">Enrollment Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={enrollmentStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {enrollmentStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 text-xl font-semibold">Course Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={courseStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 text-xl font-semibold">User Roles</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userRoleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userRoleData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

