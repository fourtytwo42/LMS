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
          <div className="flex flex-1 flex-col md:flex-row bg-white dark:bg-gray-900 pt-16" style={{ paddingBottom: "60px" }}>
            <SidebarComponent />
            <main 
              className="flex-1 p-4 sm:p-5 lg:p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-300" 
              role="main"
              style={{
                marginLeft: "var(--sidebar-width, 80px)",
              }}
            >
              <div className="w-full max-w-full">
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

