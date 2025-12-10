import Link from "next/link";
import { RegisterForm } from "@/components/forms/register-form";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <Card>
      <h2 className="mb-6 text-2xl font-semibold">Create your account</h2>
      <RegisterForm />
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </div>
    </Card>
  );
}

