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
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar />
          <main className="flex-1 p-4 md:p-6" role="main">
            {children}
          </main>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
}

