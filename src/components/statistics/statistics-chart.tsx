"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/domain";

const chartConfig = {
  amount: {
    label: "Ingresos",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const shortMonths = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function StatisticsChart({
  data,
}: {
  data: Array<{ date: string; amount: number }>;
}) {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full sm:h-80">
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
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
          width={48}
          tickFormatter={formatAxisAmount}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(label) => formatLongDate(String(label))}
              formatter={(value) => (
                <div className="flex min-w-40 flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">Ingresos</span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="amount"
          type="monotone"
          fill="var(--color-amount)"
          fillOpacity={0.16}
          stroke="var(--color-amount)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function formatShortDate(value: string) {
  const [, month = "1", day = "1"] = value.split("-");
  return `${Number(day)} ${shortMonths[Number(month) - 1]}`;
}

function formatLongDate(value: string) {
  const [year = "", month = "1", day = "1"] = value.split("-");
  return `${Number(day)} ${shortMonths[Number(month) - 1]} ${year}`;
}

function formatAxisAmount(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}k`;
  }

  return `$${value}`;
}
