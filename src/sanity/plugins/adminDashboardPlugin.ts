import { definePlugin, type Tool } from "sanity";
import { LayoutDashboard } from "lucide-react";
import { AdminDashboardToolView } from "./AdminDashboardToolView";

export const adminDashboardTool: Tool = {
  name: "dashboard",
  title: "Dashboard",
  icon: LayoutDashboard,
  component: AdminDashboardToolView,
};

export const adminDashboardPlugin = definePlugin({
  name: "picksy-admin-dashboard",
  tools: (prev) => [adminDashboardTool, ...prev],
});
