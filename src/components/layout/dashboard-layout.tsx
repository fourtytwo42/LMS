"use client";

import { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { Footer } from "./footer";
import { AuthProvider } from "../auth/auth-provider";
import { CSSDebug } from "../debug/css-debug";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthProvider>
      <CSSDebug />
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        <div className="flex flex-1 flex-col md:flex-row bg-gray-50">
          <Sidebar />
          <main className="flex-1 p-6 sm:p-8 lg:p-10 bg-gray-50" role="main">
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

