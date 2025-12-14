"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get theme from localStorage or default to dark
    let storedTheme = localStorage.getItem("lms-theme") as Theme | null;
    
    // Default to dark mode if no theme is stored, and save it
    if (!storedTheme) {
      storedTheme = "dark";
      localStorage.setItem("lms-theme", "dark");
    }
    
    const initialTheme = storedTheme;
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    // Apply all changes synchronously for instant theme switch
    const root = document.documentElement;
    const body = document.body;
    
    // Disable transitions on html and body
    root.style.setProperty("transition", "none", "important");
    body.style.setProperty("transition", "none", "important");
    
    // CRITICAL: Remove dark class first, then add if needed
    // This ensures Tailwind dark: classes don't apply in light mode
    root.classList.remove("dark");
    
    // Update CSS custom properties
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.style.setProperty("--bg-primary", "#111827", "important");
      root.style.setProperty("--bg-secondary", "#1f2937", "important");
      root.style.setProperty("--bg-tertiary", "#1f2937", "important");
      root.style.setProperty("--text-primary", "#f9fafb", "important");
      root.style.setProperty("--text-secondary", "#d1d5db", "important");
    } else {
      // Ensure dark class is removed for light mode
      root.classList.remove("dark");
      root.style.setProperty("--bg-primary", "#ffffff", "important");
      root.style.setProperty("--bg-secondary", "#f9fafb", "important");
      root.style.setProperty("--bg-tertiary", "#ffffff", "important");
      root.style.setProperty("--text-primary", "#111827", "important");
      root.style.setProperty("--text-secondary", "#6b7280", "important");
    }
    
    // Force reflow to ensure class changes are applied
    void root.offsetHeight;
    void body.offsetHeight;
    
    // Re-enable transitions after a microtask
    Promise.resolve().then(() => {
      root.style.removeProperty("transition");
      body.style.removeProperty("transition");
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("lms-theme", newTheme);
    applyTheme(newTheme);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

