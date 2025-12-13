import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="mb-6 sm:mb-8 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">Log in to your account</h2>
      <LoginForm />
      <div className="mt-6 sm:mt-8 space-y-2.5 text-center text-sm">
        <div>
          <Link href="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </Card>
  );
}

