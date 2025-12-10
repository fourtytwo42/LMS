import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card>
      <h2 className="mb-6 text-2xl font-semibold">Log in to your account</h2>
      <LoginForm />
      <div className="mt-4 space-y-2 text-center text-sm">
        <div>
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <div>
          <span className="text-gray-600">Don't have an account? </span>
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </Card>
  );
}

