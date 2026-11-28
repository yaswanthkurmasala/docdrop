import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata = {
  title: "Contact Us | DocDrop",
  description: "Get in touch with DocDrop support, billing, and technical inquiries.",
};

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Studio</span>
        </Link>
        <BrandLogo size="sm" showSubtitle={false} />
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Contact Us</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-10">
          Have a question about DocDrop, need help with payment, or want to report an issue? We are here to help.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Customer Support</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Email us for inquiries, billing questions, or refund requests.
            </p>
            <a href="mailto:support@docdrop.app" className="inline-block text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
              support@docdrop.app
            </a>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Official Instagram</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Follow for feature updates, reels, and video tutorials.
            </p>
            <a
              href="https://www.instagram.com/docdroptools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-medium text-pink-600 dark:text-pink-400 hover:underline font-mono"
            >
              @docdroptools &rarr;
            </a>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Response Time</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              We respond to customer tickets within 24 business hours.
            </p>
            <span className="inline-block text-xs font-mono text-zinc-600 dark:text-zinc-400">
              Mon &ndash; Sat (9 AM &ndash; 7 PM IST)
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-400" />
            <span>Business Entity & Address</span>
          </h2>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 leading-relaxed">
            <p className="font-medium text-zinc-900 dark:text-zinc-200">DocDrop Studio / Yaswanth Kurmasala</p>
            <p>Software & Digital Document Services</p>
            <p>Andhra Pradesh, India</p>
            <p>Official Merchant Contact: <a href="mailto:yaswanth2818@gmail.com" className="text-amber-500 hover:underline">yaswanth2818@gmail.com</a></p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        © 2026 DocDrop Studio. All rights reserved.
      </footer>
    </div>
  );
}
