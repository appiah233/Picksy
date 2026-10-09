import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  categoryMetadata,
  categoryStaticParams,
  renderCategoryPage,
} from "@/features/catalog/category-page";
import { catalog } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categoryStaticParams(catalog);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return categoryMetadata(catalog, (await params).slug);
}

export default async function CategoryPage({ params }: Props) {
  return renderCategoryPage(catalog, (await params).slug) ?? notFound();
}
