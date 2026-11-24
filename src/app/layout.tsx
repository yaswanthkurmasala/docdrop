import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "DocDrop — Drop it. Done. Private In-Browser Document & PDF Studio",
  description:
    "Drop any document to convert, compress, edit, split, and audit 100% inside your browser memory. All-in-one private PDF tools with zero server uploads and total data privacy.",
  keywords: [
    "DocDrop",
    "drag and drop pdf",
    "pdf to markdown",
    "docx to markdown",
    "excel to markdown table",
    "split pdf",
    "remove pdf pages",
    "repair pdf",
    "ocr text audit",
    "pdf to word",
    "private pdf editor",
    "private document converter",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload JetBrainsMono Nerd Font for instant developer typography */}
        <link
          rel="preload"
          href="/fonts/JetBrainsMonoNerdFont-Regular.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* Instant Theme Detection Script: executes before hydration to prevent white/dark flashes */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem("docdrop_theme");
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var isDark = stored === "dark" || ((!stored || stored === "system") && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add("dark");
                    document.documentElement.setAttribute("data-theme", "dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                    document.documentElement.setAttribute("data-theme", "light");
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-subtle)] selection:text-[var(--foreground)] font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
