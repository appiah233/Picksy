import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  categoryMetadata,
  categoryStaticParams,
  renderCategoryPage,
} from "@/features/catalog/category-page";
import { getCatalog } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return categoryStaticParams(catalog);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const catalog = await getCatalog();
  return categoryMetadata(catalog, (await params).slug);
}

export default async function CategoryPage({ params }: Props) {
  const catalog = await getCatalog();
  return renderCategoryPage(catalog, (await params).slug) ?? notFound();
}
