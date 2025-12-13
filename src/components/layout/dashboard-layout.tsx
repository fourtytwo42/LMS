"use client";

import { ReactNode } from "react";
import { Header } from "./header";
import { SidebarComponent } from "./sidebar";
import { Footer } from "./footer";
import { AuthProvider } from "../auth/auth-provider";
import { ThemeProvider } from "../theme/theme-provider";
interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Header />
          <div className="flex flex-1 flex-col md:flex-row bg-white dark:bg-gray-900">
            <SidebarComponent />
            <main 
              className="flex-1 p-6 sm:p-8 lg:p-10 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-300" 
              role="main"
              style={{
                marginLeft: "var(--sidebar-width, 80px)",
              }}
            >
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

