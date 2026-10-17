"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { ChartNoAxesCombinedIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatCurrency } from "@/lib/domain";

type DailyTotal = {
  date: string;
  amount: number;
};

const chartConfig = {
  amount: {
    label: "Ingresos aceptados",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

const shortDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

function dateFromDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(dateFromDateOnly(value));
}

function formatLongDate(value: string) {
  return longDateFormatter.format(dateFromDateOnly(value));
}

export function EarningsChart({
  data,
  periodLabel,
}: {
  data: DailyTotal[];
  periodLabel: string;
}) {
  const dayLabel = data.length === 1 ? "día con ingresos" : "días con ingresos";

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Ingresos aceptados por día</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
        <CardAction>
          <Badge variant="outline">
            {data.length} {dayLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="h-72 w-full sm:h-80"
            role="region"
            aria-label={`Gráfico de ingresos diarios aceptados. ${periodLabel}.`}
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                minTickGap={24}
                tickFormatter={formatShortDate}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={64}
                tickFormatter={(value) =>
                  compactCurrencyFormatter.format(Number(value))
                }
              />
              <ChartTooltip
                cursor={{ fill: "var(--muted)" }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(label) => formatLongDate(String(label))}
                    formatter={(value) => (
                      <div className="flex min-w-40 items-center justify-between gap-4">
                        <span className="text-muted-foreground">Ingresos</span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesCombinedIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Aún no hay ingresos aceptados</EmptyTitle>
              <EmptyDescription>
                El gráfico aparecerá cuando existan informes aceptados en este
                período.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
      <CardFooter className="gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-foreground" aria-hidden="true" />
        Solo se contabilizan informes aceptados.
      </CardFooter>
    </Card>
  );
}
