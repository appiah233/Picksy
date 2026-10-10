import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminImportsPage() {
  redirect("/studio/product-importer");
}

