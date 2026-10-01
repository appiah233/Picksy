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
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-[#fcfcfd] text-zinc-900 antialiased selection:bg-zinc-200">
        <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-zinc-950">
                Picksy<span className="text-zinc-400">.</span>
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium text-zinc-600">
              {siteConfig.mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-zinc-950"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

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
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900">
                    {column.title}
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {column.items.map((item) => (
                      <li key={item.title}>
                        <Link
                          href={item.href}
                          className={`transition-colors hover:text-zinc-950 ${
                            item.disabled ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          {item.title}
                        </Link>
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
              <span className="font-semibold text-zinc-700">Affiliate Disclosure:</span> Picksy is
              an independent software evaluation publication. When you purchase software through
              links on our site, we may earn an affiliate commission at no extra cost to you. This
              compensation never influences our editorial ratings, comparison methodology, or
              technical recommendations.
            </div>

            <div className="mt-8 border-t border-zinc-100 pt-6 text-center text-xs text-zinc-400">
              © {new Date().getFullYear()} Picksy. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
