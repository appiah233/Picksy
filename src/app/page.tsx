import { renderHomePage } from "@/features/catalog/home-page";
import { getCatalog } from "@/lib/catalog";

export default async function HomePage() {
  const catalog = await getCatalog();
  return renderHomePage(catalog);
}
