import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getCurrentUser } from "@/lib/current-user";
import { getTodayDate } from "@/lib/domain";
import { getReportsData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Reportes",
  description: "Registro, edición y envío de reportes de ganancias.",
};

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "user" && user.role !== "leader")) {
    redirect("/dashboard");
  }

  const data = await getReportsData(user);

  return <ReportsWorkspace data={data} today={getTodayDate()} />;
}
