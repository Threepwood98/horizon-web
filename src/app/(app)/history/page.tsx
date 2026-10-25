import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReportHistory } from "@/components/reports/report-history";
import { getCurrentUser } from "@/lib/current-user";
import { getReportHistoryData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Historial",
  description: "Registro auditable de la creación, envío y revisión de reportes.",
};

type HistoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const [user, requestedParams] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  if (!user) {
    redirect("/login");
  }

  if (user.role === "user") {
    redirect("/dashboard");
  }

  const pageValue = Array.isArray(requestedParams.page)
    ? requestedParams.page[0]
    : requestedParams.page;
  const data = await getReportHistoryData(user, Number(pageValue ?? 1));

  return <ReportHistory data={data} />;
}
