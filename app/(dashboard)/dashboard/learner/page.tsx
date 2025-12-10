export const dynamic = 'force-dynamic';

export default function LearnerDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Learner Dashboard</h1>
      <div className="rounded-lg border bg-white p-6">
        <p className="text-gray-600">Welcome to your learner dashboard!</p>
        <p className="mt-2 text-sm text-gray-500">
          Your enrolled courses and progress will appear here.
        </p>
      </div>
    </div>
  );
}

