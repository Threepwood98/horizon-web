import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CalendarDaysIcon,
  ChartNoAxesCombinedIcon,
  CircleDollarSignIcon,
  ReceiptTextIcon,
  UsersRoundIcon,
  UserRoundIcon,
  WaypointsIcon,
} from "lucide-react";

import { RankingCard } from "@/components/statistics/ranking-card";
import { StatisticsChart } from "@/components/statistics/statistics-chart";
import { StatisticsFilters } from "@/components/statistics/statistics-filters";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getCurrentUser } from "@/lib/current-user";
import { formatCurrency } from "@/lib/domain";
import { getStatisticsData } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Estadísticas",
  description: "Rendimiento por fecha, equipo, sitio y usuario.",
};

type StatisticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const integerFormatter = new Intl.NumberFormat("es-ES");
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function StatisticsPage({
  searchParams,
}: StatisticsPageProps) {
  const [user, requestedParams] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  if (!user) {
    redirect("/login");
  }

  const data = await getStatisticsData(user, {
    from: getSingleParam(requestedParams.from),
    to: getSingleParam(requestedParams.to),
    teamId: getSingleParam(requestedParams.teamId),
    websiteId: getSingleParam(requestedParams.websiteId),
    userId: getSingleParam(requestedParams.userId),
  });
  const rangeLabel = `${formatDate(data.range.from)} - ${formatDate(data.range.to)}`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Análisis</Badge>
            <span className="text-sm text-muted-foreground">{rangeLabel}</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Estadísticas
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Consulta únicamente reportes aceptados dentro del alcance de tu
            cuenta.
          </p>
        </div>
      </header>

      <StatisticsFilters
        role={user.role}
        range={data.range}
        filters={data.filters}
        options={data.filterOptions}
      />

      <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="summary-heading" className="font-heading text-lg font-medium">
            Resumen del período
          </h2>
          <span className="text-sm text-muted-foreground">
            {integerFormatter.format(data.range.days)} días calendario
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CircleDollarSignIcon}
            label="Ingresos aceptados"
            value={formatCurrency(data.metrics.total)}
            description="Total consolidado"
          />
          <MetricCard
            icon={ChartNoAxesCombinedIcon}
            label="Promedio diario"
            value={formatCurrency(data.metrics.dailyAverage)}
            description="Sobre todos los días del período"
          />
          <MetricCard
            icon={ReceiptTextIcon}
            label="Reportes aceptados"
            value={integerFormatter.format(data.metrics.acceptedCount)}
            description="Operaciones incluidas"
          />
          <MetricCard
            icon={CalendarDaysIcon}
            label="Días con actividad"
            value={integerFormatter.format(data.dailyTotals.length)}
            description={`De ${integerFormatter.format(data.range.days)} días consultados`}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Rendimiento diario</CardTitle>
          <CardDescription>
            Importe aceptado por cada fecha con actividad en el período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.dailyTotals.length > 0 ? (
            <StatisticsChart data={data.dailyTotals} />
          ) : (
            <Empty className="min-h-72 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ChartNoAxesCombinedIcon />
                </EmptyMedia>
                <EmptyTitle>Sin actividad para graficar</EmptyTitle>
                <EmptyDescription>
                  Ajusta el período o los filtros para consultar otros reportes
                  aceptados.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="rankings-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="rankings-heading" className="font-heading text-lg font-medium">
            Rankings
          </h2>
          <p className="text-sm text-muted-foreground">
            Ordenados por importe aceptado, de mayor a menor.
          </p>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <RankingCard
            title="Equipos"
            description="Rendimiento consolidado por equipo."
            icon={UsersRoundIcon}
            entries={data.teamRanking}
          />
          <RankingCard
            title="Sitios"
            description="Ingresos aceptados por sitio."
            icon={WaypointsIcon}
            entries={data.websiteRanking}
          />
          <RankingCard
            title="Usuarios"
            description="Aporte individual aceptado."
            icon={UserRoundIcon}
            entries={data.userRanking}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof CircleDollarSignIcon;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardHeader className="grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-1">
          <CardTitle>{label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}
