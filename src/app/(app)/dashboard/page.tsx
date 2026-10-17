import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CircleCheckIcon,
  CircleDollarSignIcon,
  Clock3Icon,
  TrendingUpIcon,
} from "lucide-react";

import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentReports } from "@/components/dashboard/recent-reports";
import type { CurrentUser } from "@/lib/current-user";
import { getCurrentUser } from "@/lib/current-user";
import { formatCurrency } from "@/lib/domain";
import { getDashboardData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Panel financiero",
};

const periodDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function dateFromDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getScopeDescription(user: CurrentUser) {
  if (user.role === "user") {
    return "Tus resultados aceptados y el estado más reciente de tus informes.";
  }

  if (user.role === "leader") {
    return user.team
      ? `El rendimiento aceptado de ${user.team.name} y sus movimientos recientes.`
      : "El rendimiento aceptado de tu equipo y sus movimientos recientes.";
  }

  return "Una lectura consolidada del rendimiento aceptado de la operación.";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const dashboard = await getDashboardData(user);
  const { metrics, period } = dashboard;
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const fromDate = dateFromDateOnly(period.from);
  const toDate = dateFromDateOnly(period.to);
  const monthLabel = monthFormatter.format(fromDate);
  const periodLabel = `${periodDateFormatter.format(fromDate)} — ${periodDateFormatter.format(toDate)}`;

  return (
    <div className="flex flex-1 flex-col bg-muted/20">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 p-4 sm:p-6 lg:p-10">
        <header className="grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Balance mensual · {monthLabel}
            </p>
            <h1>
              <span className="block font-serif text-4xl leading-[0.95] tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
                El pulso financiero, {firstName}.
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {getScopeDescription(user)}
            </p>
          </div>
          <div className="flex items-end justify-between gap-8 border-t pt-4 lg:flex-col lg:items-end lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <div className="lg:text-right">
              <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Período de corte
              </p>
              <p className="mt-1 text-sm font-medium">{periodLabel}</p>
            </div>
            <p className="font-serif text-3xl leading-none tabular-nums">
              {period.days}{" "}
              <span className="font-sans text-xs text-muted-foreground">
                días
              </span>
            </p>
          </div>
        </header>

        <section aria-labelledby="dashboard-metrics-title">
          <h2 id="dashboard-metrics-title" className="sr-only">
            Indicadores principales
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              className="sm:col-span-2 xl:col-span-2"
              featured
              label="Ingresos aceptados"
              value={formatCurrency(metrics.total)}
              description={`Acumulado confirmado durante ${monthLabel}.`}
              icon={CircleDollarSignIcon}
            />
            <MetricCard
              label="Promedio diario"
              value={formatCurrency(metrics.dailyAverage)}
              description={`Distribuido entre ${period.days} días naturales.`}
              icon={TrendingUpIcon}
            />
            <MetricCard
              label="Informes aceptados"
              value={metrics.acceptedCount.toLocaleString("es-ES")}
              description="Movimientos validados en el período actual."
              icon={CircleCheckIcon}
            />
            <MetricCard
              label="Por revisar"
              value={metrics.pendingCount.toLocaleString("es-ES")}
              description={`${metrics.rejectedCount.toLocaleString("es-ES")} rechazados en el período.`}
              icon={Clock3Icon}
            />
          </div>
        </section>

        <section
          className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(28rem,4fr)]"
          aria-label="Detalle del período"
        >
          <EarningsChart
            data={dashboard.dailyTotals}
            periodLabel={periodLabel}
          />
          <RecentReports reports={dashboard.recentReports} />
        </section>
      </div>
    </div>
  );
}
