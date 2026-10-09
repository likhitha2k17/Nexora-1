import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/bs/app-shell";

export const Route = createFileRoute("/_dash")({
  component: DashLayout,
});

function DashLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
