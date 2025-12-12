"use client";

import { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Footer } from "./footer";
import { AuthProvider } from "../auth/auth-provider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <div className="flex flex-1 flex-col md:flex-row bg-gray-50">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50" role="main">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
}

