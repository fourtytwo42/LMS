export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 sm:mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">LMS</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm sm:text-base">Learning Management System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
