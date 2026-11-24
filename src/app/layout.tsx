import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { GLOBAL_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/seo-data";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DocDrop — Free Private PDF Tools & Document Converter (No Upload)",
    template: "%s",
  },
  description:
    "Drop any PDF, Word, Excel, or image to merge, split, compress, convert to Markdown/Word/Excel, sign, or redact 100% locally in your browser. Zero cloud uploads, instant speed.",
  keywords: GLOBAL_SEO_KEYWORDS,
  authors: [{ name: "DocDrop Studio", url: SITE_URL }],
  creator: "DocDrop Studio",
  publisher: "DocDrop Studio",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "DocDrop — Private In-Browser PDF & Document Studio (Zero Uploads)",
    description:
      "30+ free PDF and document tools running 100% inside your browser RAM. Merge, Split, Compress, PDF to Word, PDF to Excel, PDF to Markdown, OCR, Sign & Redact privately.",
    images: [
      {
        url: "/logo.png",
        width: 237,
        height: 237,
        alt: "DocDrop Official Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DocDrop — Private In-Browser PDF & Document Studio",
    description:
      "30+ free PDF & document instruments with zero cloud uploads. Merge, Split, Compress, PDF to Word, Excel, and LLM Markdown.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/icon-192.png",
  },
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
        <Analytics />
      </body>
    </html>
  );
}
