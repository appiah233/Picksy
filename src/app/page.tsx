import Link from "next/link";
import { siteConfig } from "@/config/site";
import {
  Workflow,
  Search,
  Mail,
  GraduationCap,
  Server,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  Workflow: <Workflow className="h-6 w-6 text-zinc-800" />,
  Search: <Search className="h-6 w-6 text-zinc-800" />,
  Mail: <Mail className="h-6 w-6 text-zinc-800" />,
  GraduationCap: <GraduationCap className="h-6 w-6 text-zinc-800" />,
  Server: <Server className="h-6 w-6 text-zinc-800" />,
  ShieldCheck: <ShieldCheck className="h-6 w-6 text-zinc-800" />,
};

const trustPillars = [
  {
    title: "Practical Guidance",
    description:
      "Actionable software evaluations designed for real operational workflows, not theoretical feature matrices.",
  },
  {
    title: "Real Implementation Experience",
    description:
      "Insights gathered from hands-on setup, migration hurdles, and practical team adoption across SaaS stacks.",
  },
  {
    title: "Transparent Recommendations",
    description:
      "Clear, honest analysis highlighting both platform strengths and hard limitations without marketing spin.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* 1. Hero Section */}
      <section className="relative border-b border-zinc-200/80 bg-white px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 mb-6">
            <span>Independent SaaS Discovery & Evaluation</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl leading-[1.15]">
            Find the Right Software. <span className="text-zinc-500">Faster.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 leading-relaxed sm:text-xl">
            Independent software recommendations, implementation insights, and practical comparisons
            for growing businesses.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="#categories"
              className="inline-flex items-center justify-center rounded-md bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
            >
              Explore Categories
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="#why-trust"
              className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
            >
              Why Trust Picksy
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Categories Section */}
      <section
        id="categories"
        className="border-b border-zinc-200/80 bg-[#fcfcfd] px-4 py-20 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Coverage Areas
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              Software Categories We Evaluate
            </p>
            <p className="mt-3 text-base text-zinc-600">
              Deep, objective analysis across essential business software disciplines.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.categories.map((category) => (
              <div
                key={category.id}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50">
                    {categoryIcons[category.iconName] ?? (
                      <Workflow className="h-6 w-6 text-zinc-800" />
                    )}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-zinc-950 group-hover:text-zinc-700 transition-colors">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                    {category.description}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-medium text-zinc-400">
                  <span>Guides & Reviews in Preparation</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Why Trust Picksy Section */}
      <section
        id="why-trust"
        className="border-b border-zinc-200/80 bg-white px-4 py-20 sm:px-6 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Our Methodology
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              Why Trust Picksy
            </p>
            <p className="mt-3 text-base text-zinc-600">
              How our editorial and technical evaluation process protects business leaders.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {trustPillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-6"
              >
                <div className="flex items-center gap-2 text-zinc-900">
                  <CheckCircle2 className="h-5 w-5 text-zinc-800" />
                  <h3 className="text-base font-semibold">{pillar.title}</h3>
                </div>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Newsletter Placeholder Section */}
      <section id="newsletter" className="bg-[#fcfcfd] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Stay Ahead on Software Intelligence
            </h2>
            <p className="mt-3 text-sm text-zinc-600 sm:text-base">
              Get unbiased comparisons, software teardowns, and implementation playbooks delivered
              directly to your inbox.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                disabled
                placeholder="Enter your business email"
                className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none sm:w-80 cursor-not-allowed opacity-75"
              />
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-md bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white opacity-70 cursor-not-allowed shadow-sm"
              >
                Subscribe (Soon)
              </button>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              * Newsletter subscription integration is scheduled for Phase 2. Zero spam, ever.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
