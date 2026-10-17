import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
  className?: string;
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  featured = false,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("min-h-40", className)}>
      <CardHeader>
        <CardDescription className="text-xs font-semibold tracking-[0.14em] uppercase">
          {label}
        </CardDescription>
        <CardAction>
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-2">
        <CardTitle
          className={cn(
            "font-serif text-3xl leading-none tracking-tight tabular-nums",
            featured && "text-4xl sm:text-5xl",
          )}
        >
          {value}
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
