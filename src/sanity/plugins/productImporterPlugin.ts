import { definePlugin, type Tool } from "sanity";
import { ProductImporterToolView } from "./ProductImporterToolView";
import { Download } from "lucide-react";

export interface ProductImporterPluginConfig {
  title?: string;
  name?: string;
}

export const productImporterTool = (config?: ProductImporterPluginConfig): Tool => ({
  name: config?.name || "product-importer",
  title: config?.title || "Product Importer",
  icon: Download,
  component: ProductImporterToolView,
});

export const productImporterPlugin = definePlugin<ProductImporterPluginConfig | void>((config) => {
  return {
    name: "picksy-product-importer",
    tools: (prev) => [...prev, productImporterTool(config || undefined)],
  };
});

