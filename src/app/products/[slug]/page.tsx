import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  productMetadata,
  productStaticParams,
  renderProductPage,
} from "@/features/catalog/product-page";
import { catalog } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return productStaticParams(catalog);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return productMetadata(catalog, (await params).slug);
}

export default async function ProductPage({ params }: Props) {
  return renderProductPage(catalog, (await params).slug) ?? notFound();
}
