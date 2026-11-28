import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, Cpu, ArrowRight, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { TOOLS_REGISTRY } from "@/lib/tools-registry";
import {
  getToolSeoProfile,
  getRelatedTools,
  buildToolJsonLd,
  SITE_URL,
  SITE_NAME,
} from "@/lib/seo-data";
import { DocDropStudio } from "@/components/DocDropStudio";

export function generateStaticParams() {
  return TOOLS_REGISTRY.map((tool) => ({
    slug: tool.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOLS_REGISTRY.find((t) => t.id === slug);

  if (!tool) {
    return {
      title: "Tool Not Found | DocDrop",
    };
  }

  const profile = getToolSeoProfile(tool);
  const url = `${SITE_URL}/tools/${tool.id}`;

  return {
    title: profile.seoTitle,
    description: profile.seoDescription,
    keywords: profile.keywords,
    alternates: {
      canonical: `/tools/${tool.id}`,
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: profile.seoTitle,
      description: profile.seoDescription,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${tool.name} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: profile.seoTitle,
      description: profile.seoDescription,
      images: ["/og-image.png"],
    },
  };
}

export default async function ToolSeoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOLS_REGISTRY.find((t) => t.id === slug);

  if (!tool) {
    notFound();
  }

  const profile = getToolSeoProfile(tool);
  const relatedTools = getRelatedTools(tool, 6);
  const jsonLd = buildToolJsonLd(tool, profile);

  const toolHero = (
    <section className="pt-8 pb-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Semantic Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-5 font-medium"
      >
        <Link href="/" className="hover:text-zinc-950 dark:hover:text-white transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <Link
          href="/#all-tools"
          className="hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          {tool.categoryLabel}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{tool.name}</span>
      </nav>

      {/* Focused SEO Tool Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>100% Client-Side • Zero Server Uploads</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white">
          {tool.name}
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
          {tool.description}{" "}
          <span className="text-zinc-500 dark:text-zinc-400">
            Supports {tool.accepts.join(", ").toUpperCase()} directly inside your browser memory.
          </span>
        </p>
      </div>
    </section>
  );

  const toolSeoContent = (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12 border-t border-zinc-200/70 dark:border-zinc-800/70">
      {/* 3-Step How-To Guide */}
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            How to use {tool.name} privately online
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Fast, zero-installation browser processing in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {profile.howToSteps.map((step, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-center mb-3">
                0{index + 1}
              </div>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Zero-Upload Security Architecture Highlight */}
      <div className="max-w-5xl mx-auto p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>In-RAM WebAssembly Processing</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
            Why use DocDrop for {tool.name}?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Most online converters upload your confidential files to remote cloud servers. DocDrop
            runs {tool.name} directly on your CPU inside your local browser sandbox, eliminating server
            queues and guaranteeing complete document confidentiality.
          </p>
        </div>
        <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Zero file bytes ever leave your computer or phone</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>No mandatory signup or email required for free tier</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Works across Windows, macOS, Linux, Chrome, Safari & Edge</span>
          </li>
        </ul>
      </div>

      {/* Tool-Specific SEO FAQ Section */}
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            Frequently Asked Questions about {tool.name}
          </h2>
        </div>

        <div className="space-y-3">
          {profile.faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
            >
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mb-1.5">
                {faq.question}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Related PDF Tools Internal Linking Grid */}
      <div className="max-w-5xl mx-auto pt-4">
        <h2 className="text-lg font-bold text-zinc-950 dark:text-white mb-4">
          Related PDF &amp; Document Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {relatedTools.map((rel) => (
            <Link
              key={rel.id}
              href={`/tools/${rel.id}`}
              className="group p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3"
            >
              <div>
                <h3 className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {rel.name}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                  {rel.description}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 group-hover:text-amber-500 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DocDropStudio
        initialToolId={tool.id}
        toolHero={toolHero}
        toolSeoContent={toolSeoContent}
      />
    </>
  );
}
