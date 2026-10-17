import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  productMetadata,
  productStaticParams,
  renderProductPage,
} from "@/features/catalog/product-page";
import { getCatalog } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const catalog = await getCatalog();
  return productStaticParams(catalog);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const catalog = await getCatalog();
  return productMetadata(catalog, (await params).slug);
}

export default async function ProductPage({ params }: Props) {
  const catalog = await getCatalog();
  return renderProductPage(catalog, (await params).slug) ?? notFound();
}
