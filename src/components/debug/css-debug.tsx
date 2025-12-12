"use client";

import { useEffect } from "react";

export function CSSDebug() {
  useEffect(() => {
    // Log CSS information to console
    const debugInfo: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      css: {},
      computedStyles: {},
    };

    // Check if Tailwind CSS is loaded
    const testElement = document.createElement("div");
    testElement.className = "p-6 sm:p-8";
    testElement.style.position = "absolute";
    testElement.style.visibility = "hidden";
    document.body.appendChild(testElement);
    
    // Force a reflow to ensure styles are computed
    testElement.offsetHeight;
    
    const computed = window.getComputedStyle(testElement);
    
    debugInfo.css.tailwindLoaded = computed.padding !== "" && computed.padding !== "0px";
    debugInfo.css.testPadding = computed.padding;
    debugInfo.css.testPaddingTop = computed.paddingTop;
    debugInfo.css.testPaddingRight = computed.paddingRight;
    debugInfo.css.testPaddingBottom = computed.paddingBottom;
    debugInfo.css.testPaddingLeft = computed.paddingLeft;
    
    // Check if classes are actually in the DOM
    debugInfo.css.testElementClasses = testElement.className;
    debugInfo.css.testElementHasP6 = testElement.classList.contains("p-6");
    debugInfo.css.testElementHasP8 = testElement.classList.contains("sm:p-8");
    
    document.body.removeChild(testElement);

    // Check Card component styles
    const cardElements = document.querySelectorAll('[class*="rounded-lg"][class*="border"][class*="bg-white"]');
    if (cardElements.length > 0) {
      const firstCard = cardElements[0] as HTMLElement;
      const cardComputed = window.getComputedStyle(firstCard);
      debugInfo.computedStyles.card = {
        padding: cardComputed.padding,
        paddingTop: cardComputed.paddingTop,
        paddingRight: cardComputed.paddingRight,
        paddingBottom: cardComputed.paddingBottom,
        paddingLeft: cardComputed.paddingLeft,
        className: firstCard.className,
        allClasses: Array.from(firstCard.classList),
      };
    }

    // Check if CSS files are loaded
    const stylesheets = Array.from(document.styleSheets);
    debugInfo.css.stylesheets = stylesheets.map((sheet, index) => {
      try {
        return {
          index,
          href: sheet.href || "inline",
          rules: sheet.cssRules?.length || 0,
        };
      } catch (e) {
        return {
          index,
          href: sheet.href || "inline",
          error: "Cannot access (CORS or other issue)",
        };
      }
    });

    // Check for Tailwind classes in stylesheets
    let tailwindFound = false;
    let p6Found = false;
    let p8Found = false;
    let smP8Found = false;
    stylesheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule) => {
          if (rule instanceof CSSStyleRule) {
            const selector = rule.selectorText || "";
            if (selector.includes(".p-6") && !selector.includes(":")) {
              p6Found = true;
              tailwindFound = true;
            }
            if (selector.includes(".p-8") && !selector.includes(":")) {
              p8Found = true;
              tailwindFound = true;
            }
            if (selector.includes(".sm\\:p-8") || selector.includes(".sm:p-8")) {
              smP8Found = true;
              tailwindFound = true;
            }
          }
        });
      } catch (e) {
        // CORS or other issue
      }
    });
    debugInfo.css.tailwindClassesFound = tailwindFound;
    debugInfo.css.p6Found = p6Found;
    debugInfo.css.p8Found = p8Found;
    debugInfo.css.smP8Found = smP8Found;
    
    // Check if CSS variables are set
    const rootStyles = window.getComputedStyle(document.documentElement);
    const spacingVar = rootStyles.getPropertyValue("--spacing");
    debugInfo.css.spacingVariable = spacingVar || "not found";

    // Log to console
    console.group("🎨 CSS Debug Information");
    console.log("Full Debug Info:", debugInfo);
    console.log("Tailwind CSS Loaded:", debugInfo.css.tailwindLoaded);
    console.log("Tailwind Classes Found:", debugInfo.css.tailwindClassesFound);
    console.log("  - .p-6 found:", debugInfo.css.p6Found);
    console.log("  - .p-8 found:", debugInfo.css.p8Found);
    console.log("  - .sm:p-8 found:", debugInfo.css.smP8Found);
    console.log("Spacing CSS Variable (--spacing):", debugInfo.css.spacingVariable);
    console.log("Test Padding (p-6 sm:p-8):", debugInfo.css.testPadding);
    console.log("  - Expected: ~24px (p-6) or ~32px (sm:p-8 on larger screens)");
    console.log("  - Actual padding-top:", debugInfo.css.testPaddingTop);
    console.log("  - Actual padding-bottom:", debugInfo.css.testPaddingBottom);
    if (debugInfo.computedStyles.card) {
      console.log("First Card Padding:", debugInfo.computedStyles.card.padding);
      console.log("First Card Classes:", debugInfo.computedStyles.card.allClasses);
    }
    console.log("Stylesheets:", debugInfo.css.stylesheets);
    console.groupEnd();

    // Also log to window for easy access
    (window as any).__CSS_DEBUG__ = debugInfo;
  }, []);

  return null; // This component doesn't render anything
}

