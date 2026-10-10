import type { Metadata } from "next";
import { ProductImporter } from "@/features/admin/product-importer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Affiliate Product Importer | Admin",
  description: "Administrative interface for ingesting and reviewing affiliate software products.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminImportsPage() {
  return (
    <main id="main-content" className="flex-1 bg-zinc-50/50 min-h-[calc(100vh-4rem)]">
      <ProductImporter />
    </main>
  );
}

