export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-gray-600">Welcome to your admin dashboard!</p>
        <p className="mt-2 text-sm text-gray-500">
          System overview and management tools will appear here.
        </p>
      </div>
    </div>
  );
}

