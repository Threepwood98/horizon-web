import {
  CircleCheckIcon,
  Clock3Icon,
  FilePenLineIcon,
  TriangleAlertIcon,
  XCircleIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { ActionState } from "@/lib/action-state";

export type ReportStatus = "draft" | "sent" | "accepted" | "rejected";

const statusDetails = {
  draft: {
    label: "Borrador",
    variant: "outline" as const,
    icon: FilePenLineIcon,
  },
  sent: {
    label: "Pendiente",
    variant: "secondary" as const,
    icon: Clock3Icon,
  },
  accepted: {
    label: "Aceptado",
    variant: "default" as const,
    icon: CircleCheckIcon,
  },
  rejected: {
    label: "Rechazado",
    variant: "destructive" as const,
    icon: XCircleIcon,
  },
} satisfies Record<
  ReportStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: typeof CircleCheckIcon;
  }
>;

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const details = statusDetails[status];
  const Icon = details.icon;

  return (
    <Badge variant={details.variant}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {details.label}
    </Badge>
  );
}

export function ActionFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle") {
    return null;
  }

  const isError = state.status === "error";
  const Icon = isError ? TriangleAlertIcon : CircleCheckIcon;

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      role={isError ? "alert" : "status"}
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{isError ? "No se pudo completar" : "Operación completada"}</AlertTitle>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export function formatReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatLongReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return longDateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}
