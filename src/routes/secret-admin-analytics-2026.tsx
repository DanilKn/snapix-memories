import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "./admin";

export const Route = createFileRoute("/secret-admin-analytics-2026")({
  head: () => ({ meta: [{ title: "Snapix Analytics — Private Dashboard" }] }),
  component: AdminDashboard,
});
