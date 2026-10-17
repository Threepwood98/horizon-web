import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApprovalsWorkspace } from "@/components/reports/approvals-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { getApprovalsData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Aprobaciones",
  description: "Revisión de reportes pendientes y decisiones del equipo.",
};

export default async function ApprovalsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "leader") {
    redirect("/dashboard");
  }

  const data = await getApprovalsData(user);

  return <ApprovalsWorkspace data={data} />;
}
