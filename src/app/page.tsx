import { renderHomePage } from "@/features/catalog/home-page";
import { catalog } from "@/lib/catalog";

export default function HomePage() {
  return renderHomePage(catalog);
}
