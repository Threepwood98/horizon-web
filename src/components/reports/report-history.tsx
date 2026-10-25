import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HistoryIcon,
  ScrollTextIcon,
} from "lucide-react";

import { formatReportDate } from "@/components/reports/report-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/domain";
import type { getReportHistoryData } from "@/lib/queries";

type HistoryData = Awaited<ReturnType<typeof getReportHistoryData>>;
type HistoryEvent = HistoryData["events"][number];

const eventDetails = {
  created: { label: "Creado", variant: "outline" as const },
  entry_added: { label: "Entrada agregada", variant: "outline" as const },
  edited: { label: "Editado", variant: "outline" as const },
  merged: { label: "Combinado", variant: "outline" as const },
  submitted: { label: "Enviado", variant: "secondary" as const },
  resubmitted: { label: "Reenviado", variant: "secondary" as const },
  accepted: { label: "Aceptado", variant: "default" as const },
  rejected: { label: "Rechazado", variant: "destructive" as const },
  deleted: { label: "Eliminado", variant: "destructive" as const },
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Havana",
});

const breakdownNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function ReportHistory({ data }: { data: HistoryData }) {
  return (
    <section className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Auditoría de reportes
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Historial
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta cada creación, modificación, envío y decisión sin perder
            los ciclos anteriores.
          </p>
        </div>
        <Badge variant="outline">
          <HistoryIcon data-icon="inline-start" aria-hidden="true" />
          {data.pagination.total.toLocaleString("es-ES")} eventos
        </Badge>
      </header>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Registro de actividad</CardTitle>
          <CardDescription>
            Los registros migrados reconstruyen únicamente la información que
            estaba disponible antes de habilitar esta auditoría.
          </CardDescription>
          <CardAction>
            <Badge variant="secondary">
              Página {data.pagination.page} de {data.pagination.pageCount}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="min-w-0">
          {data.events.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollTextIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No hay eventos registrados</EmptyTitle>
                <EmptyDescription>
                  Las acciones realizadas sobre los reportes aparecerán aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-300">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Momento</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Fecha reporte</TableHead>
                      <TableHead>Miembro</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Sitio</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap">
                          <time dateTime={event.occurredAt}>
                            {formatEventDate(event.occurredAt)}
                          </time>
                        </TableCell>
                        <TableCell>
                          <EventBadge event={event} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatReportDate(event.reportDate)}
                        </TableCell>
                        <TableCell>{event.ownerName}</TableCell>
                        <TableCell>{event.teamName}</TableCell>
                        <TableCell>{event.websiteName}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(event.amount)}
                        </TableCell>
                        <TableCell>{event.actorName ?? "No disponible"}</TableCell>
                        <TableCell>
                          <EventMetadata event={event} />
                        </TableCell>
                        <TableCell className="max-w-72 whitespace-normal text-muted-foreground">
                          <EventDescription event={event} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {data.events.map((event) => (
                  <HistoryMobileCard key={event.id} event={event} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <HistoryPagination pagination={data.pagination} />
    </section>
  );
}

function EventBadge({ event }: { event: HistoryEvent }) {
  const details = eventDetails[event.type];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={details.variant}>{details.label}</Badge>
      {event.cycle > 0 ? (
        <Badge variant="outline">Ciclo {event.cycle}</Badge>
      ) : null}
      {event.backfilled ? <Badge variant="outline">migrado</Badge> : null}
    </div>
  );
}

function EventMetadata({ event }: { event: HistoryEvent }) {
  const delegated = event.creatorId !== event.ownerId;

  if (!delegated && event.submissionOrigin !== "automatic") {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {delegated ? <Badge variant="outline">{event.creatorName}</Badge> : null}
      {event.submissionOrigin === "automatic" ? (
        <Badge variant="secondary">auto</Badge>
      ) : null}
    </div>
  );
}

function EventDescription({ event }: { event: HistoryEvent }) {
  if (event.type === "rejected" && event.rejectionNote) {
    return <>Motivo: {event.rejectionNote}</>;
  }

  if (
    event.type === "accepted" &&
    event.startAmount !== null &&
    event.endAmount !== null
  ) {
    return (
      <>
        Saldo {formatCurrency(event.startAmount)} → {formatCurrency(event.endAmount)}
      </>
    );
  }

  if (event.type === "merged") {
    return <>Integrado en otro borrador.</>;
  }

  if (event.type === "entry_added" || event.type === "edited") {
    return <>Desglose: {event.breakdown.map(formatBreakdownAmount).join(" + ")}</>;
  }

  return <>—</>;
}

function HistoryMobileCard({ event }: { event: HistoryEvent }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{event.websiteName}</CardTitle>
        <CardDescription>
          {event.ownerName} · {formatReportDate(event.reportDate)}
        </CardDescription>
        <CardAction>
          <EventBadge event={event} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-lg font-semibold tabular-nums">
          {formatCurrency(event.amount)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatEventDate(event.occurredAt)} · {event.actorName ?? "Actor no disponible"}
        </p>
        <EventMetadata event={event} />
        <p className="text-sm text-muted-foreground">
          <EventDescription event={event} />
        </p>
      </CardContent>
    </Card>
  );
}

function HistoryPagination({
  pagination,
}: {
  pagination: HistoryData["pagination"];
}) {
  const hasPrevious = pagination.page > 1;
  const hasNext = pagination.page < pagination.pageCount;

  return (
    <nav
      className="flex items-center justify-between gap-3"
      aria-label="Paginación del historial"
    >
      {hasPrevious ? (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/history?page=${pagination.page - 1}`} />}
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Anterior
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Anterior
        </Button>
      )}

      <span className="text-sm text-muted-foreground">
        {pagination.total.toLocaleString("es-ES")} eventos
      </span>

      {hasNext ? (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/history?page=${pagination.page + 1}`} />}
        >
          Siguiente
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Siguiente
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      )}
    </nav>
  );
}

function formatEventDate(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatBreakdownAmount(value: number) {
  return breakdownNumberFormatter.format(value);
}
