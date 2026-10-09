import type { Metadata, Viewport } from "next";
import Link from "next/link";
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
  themeColor: "#09090b",
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
      <body className="min-h-screen flex flex-col bg-[#fcfcfd] text-zinc-900 antialiased selection:bg-zinc-200">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:p-3 focus:outline-hidden focus:ring-2 focus:ring-zinc-950"
        >
          Skip to main content
        </a>
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center space-x-2 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            >
              <span className="text-xl font-bold tracking-tight text-zinc-950">
                Picksy<span className="text-zinc-400">.</span>
              </span>
            </Link>
            <nav
              aria-label="Main navigation"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-zinc-600 sm:gap-x-6"
            >
              {siteConfig.mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-zinc-950 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="border-t border-zinc-200 bg-white text-zinc-600">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              <div className="space-y-3">
                <span className="text-lg font-bold tracking-tight text-zinc-950">
                  Picksy<span className="text-zinc-400">.</span>
                </span>
                <p className="text-sm text-zinc-500 leading-relaxed">{siteConfig.tagline}</p>
              </div>

              {siteConfig.footerNav.map((column) => (
                <div key={column.title} className="space-y-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    {column.title}
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {column.items.map((item) => (
                      <li key={item.title}>
                        {item.disabled || item.href === "#" ? (
                          <span className="text-zinc-600">{item.title}</span>
                        ) : (
                          <Link
                            href={item.href}
                            className="rounded-sm transition-colors hover:text-zinc-950 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
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

            <div
              id="disclosure"
              className="mt-12 rounded-lg border border-zinc-200/80 bg-zinc-50 p-4 text-xs text-zinc-500 leading-relaxed"
            >
              <span className="font-semibold text-zinc-700">Affiliate Disclosure:</span> When a page
              contains a merchant link marked as an affiliate link, Picksy may earn a commission if
              you purchase through it. Any such link has a disclosure beside it.
            </div>

            <div className="mt-8 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-600">
              © {new Date().getFullYear()} Picksy. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
