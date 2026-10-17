import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Compass, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#090a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-pt-24 motion-safe:scroll-smooth">
      <body className="min-h-screen flex flex-col bg-[#090a0f] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-indigo-400 focus:bg-slate-950 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-xl"
        >
          Skip to main content
        </a>
        <header className="picksy-site-header">
          <div className="picksy-container picksy-header-inner">
            <Link href="/" className="picksy-logo">
              <span className="picksy-logo-mark">
                <Sparkles aria-hidden="true" size={19} fill="currentColor" strokeWidth={1.75} />
              </span>
              <span>Picksy</span>
              <span className="picksy-logo-badge">Editorial</span>
            </Link>
            <nav aria-label="Main navigation" className="picksy-main-nav">
              {siteConfig.mainNav.map((item) => (
                <Link key={item.href} href={item.href} className="picksy-nav-link">
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="picksy-header-actions">
              <Link
                href="/#products"
                aria-label="Explore products"
                className="picksy-header-search-btn"
              >
                <Search aria-hidden="true" size={18} />
              </Link>
              <Link href="/#deals" className="picksy-header-deal">
                <Zap aria-hidden="true" size={14} />
                <span>Today&apos;s Deals</span>
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="picksy-site-footer">
          <div className="picksy-container py-14 lg:py-16">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
              <div className="space-y-4 md:col-span-5">
                <div className="inline-flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
                    <Compass aria-hidden="true" size={17} />
                  </span>
                  <span className="text-xl font-extrabold tracking-tight text-slate-50">
                    Picksy<span className="text-indigo-400">.</span>
                  </span>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-slate-300">
                  {siteConfig.description}
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <ShieldCheck aria-hidden="true" size={14} />
                  <span>Source-verified reviews &amp; transparent affiliate standards</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 md:col-span-7">
                {siteConfig.footerNav.map((column) => (
                  <div key={column.title} className="space-y-3.5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      {column.title}
                    </h2>
                    <ul className="space-y-2.5 text-sm">
                      {column.items.map((item) => (
                        <li key={item.title}>
                          {item.disabled || item.href === "#" ? (
                            <span className="text-slate-400">{item.title}</span>
                          ) : (
                            <Link
                              href={item.href}
                              className="rounded-sm text-slate-300 transition-colors hover:text-indigo-300"
                            >
                              {item.title}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div
              id="disclosure"
              className="mt-12 rounded-xl border border-indigo-500/25 bg-slate-900/90 p-5 text-xs leading-relaxed text-slate-300 shadow-inner"
            >
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                  Affiliate Disclosure
                </span>
                <p className="text-slate-300">
                  When a page contains a merchant link marked as an affiliate link, Picksy may earn
                  a commission if you purchase through it. Any such link has a disclosure beside it.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-400 sm:flex-row">
              <p>© {new Date().getFullYear()} Picksy. All rights reserved.</p>
              <p>Independent research · Verified sources · Explicit merchant attribution</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
