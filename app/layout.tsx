import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "LMS - Learning Management System",
  description: "Enterprise-grade learning management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('lms-theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const isDark = theme === 'dark' || (!theme && prefersDark);
                  const root = document.documentElement;
                  const body = document.body;
                  
                  if (isDark) {
                    root.classList.add('dark');
                    root.style.setProperty('background-color', '#111827', 'important');
                    body.style.setProperty('background-color', '#111827', 'important');
                    body.style.setProperty('color', '#f9fafb', 'important');
                  } else {
                    root.classList.remove('dark');
                    root.style.setProperty('background-color', '#ffffff', 'important');
                    body.style.setProperty('background-color', '#ffffff', 'important');
                    body.style.setProperty('color', '#111827', 'important');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}

