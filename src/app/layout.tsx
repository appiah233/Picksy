import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight, Compass, Sparkles } from "lucide-react";
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
  themeColor: "#10172b",
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
      <body className="min-h-screen flex flex-col bg-[#10172b] text-slate-100 antialiased selection:bg-amber-200/30 selection:text-amber-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-indigo-400 focus:bg-slate-950 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-xl"
        >
          Skip to main content
        </a>
        <header className="picksy-site-header discovery-site-header">
          <div className="picksy-container picksy-header-inner">
            <Link href="/" className="picksy-logo">
              <span className="picksy-logo-mark">
                <Sparkles aria-hidden="true" size={19} strokeWidth={1.75} />
              </span>
              <span>Picksy</span>
            </Link>
            <nav aria-label="Main navigation" className="picksy-main-nav">
              {siteConfig.mainNav.map((item) => (
                <Link key={item.href} href={item.href} className="picksy-nav-link">
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="picksy-header-actions">
              <Link href="/#products" className="picksy-header-deal">
                Explore picks <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <footer className="picksy-site-footer discovery-footer">
          <div className="picksy-container discovery-footer-inner">
            <div className="discovery-footer-top">
              <div>
                <span className="discovery-footer-logo">
                  <Compass aria-hidden="true" size={23} /> Picksy.
                </span>
                <p>{siteConfig.description}</p>
              </div>
              {siteConfig.footerNav.map((column) => (
                <div key={column.title}>
                  <h2>{column.title}</h2>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item.title}>
                        <Link href={item.href}>{item.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div id="disclosure" className="discovery-footer-disclosure">
              <strong>Affiliate disclosure</strong>
              <p>
                When a page contains a merchant link marked as an affiliate link, Picksy may earn a
                commission if you purchase through it. Any such link has a disclosure beside it.
              </p>
            </div>
            <div className="discovery-footer-bottom">
              <span>© {new Date().getFullYear()} Picksy</span>
              <span>Independent discovery · Clear merchant attribution</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
