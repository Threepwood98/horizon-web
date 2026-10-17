"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  CheckCheckIcon,
  ClipboardCheckIcon,
  InboxIcon,
  XIcon,
} from "lucide-react";

import { acceptReportsAction, rejectReportsAction } from "@/app/actions/reports";
import { ActionFeedback, formatReportDate, ReportStatusBadge } from "@/components/reports/report-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState } from "@/lib/action-state";
import { formatCurrency } from "@/lib/domain";
import type { getApprovalsData } from "@/lib/queries";

type ApprovalsData = Awaited<ReturnType<typeof getApprovalsData>>;
type PendingReport = ApprovalsData["pendingReports"][number];
type ReviewedReport = ApprovalsData["recentlyReviewed"][number];

export function ApprovalsWorkspace({ data }: { data: ApprovalsData }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pendingIdSet = new Set(data.pendingReports.map((report) => report.id));
  const currentSelectedIds = selectedIds.filter((id) => pendingIdSet.has(id));
  const selectedSet = new Set(currentSelectedIds);
  const allSelected =
    data.pendingReports.length > 0 && currentSelectedIds.length === data.pendingReports.length;
  const someSelected = currentSelectedIds.length > 0 && !allSelected;
  const pendingTotal = data.pendingReports.reduce((total, report) => total + report.amount, 0);

  function toggleReport(reportId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(reportId)
          ? current
          : [...current, reportId]
        : current.filter((id) => id !== reportId),
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? data.pendingReports.map((report) => report.id) : []);
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Control de equipo
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Aprobaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa los reportes pendientes y resuélvelos en lote con una decisión consistente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Resumen de aprobaciones">
          <Badge variant="secondary">{data.pendingReports.length} pendientes</Badge>
          <Badge variant="outline">{formatCurrency(pendingTotal)}</Badge>
        </div>
      </header>

      <PendingReportsCard
        reports={data.pendingReports}
        selectedSet={selectedSet}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggle={toggleReport}
        onToggleAll={toggleAll}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <AcceptReportsCard reportIds={currentSelectedIds} />
        <RejectReportsCard reportIds={currentSelectedIds} />
      </div>

      <ReviewedReportsCard reports={data.recentlyReviewed} />
    </section>
  );
}

function PendingReportsCard({
  reports,
  selectedSet,
  allSelected,
  someSelected,
  onToggle,
  onToggleAll,
}: {
  reports: ApprovalsData["pendingReports"];
  selectedSet: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onToggle: (reportId: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Por revisar</CardTitle>
        <CardDescription>
          Comprueba fecha, sitio, responsable e importe antes de seleccionar una decisión.
        </CardDescription>
        <CardAction>
          <Badge variant={reports.length > 0 ? "secondary" : "outline"}>{reports.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {reports.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No hay reportes pendientes</EmptyTitle>
              <EmptyDescription>
                Los nuevos envíos del equipo aparecerán aquí para su revisión.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <label className="flex min-h-10 items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={onToggleAll}
                aria-label="Seleccionar todos los reportes pendientes"
              />
              <span>Seleccionar todos</span>
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {selectedSet.size} de {reports.length}
              </span>
            </label>

            <div className="hidden md:block">
              <Table className="min-w-175">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <span className="sr-only">Seleccionar</span>
                    </TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Sitio</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id} data-state={selectedSet.has(report.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedSet.has(report.id)}
                          onCheckedChange={(checked) => onToggle(report.id, checked)}
                          aria-label={`Seleccionar reporte de ${report.userName} para ${report.websiteName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{formatReportDate(report.date)}</TableCell>
                      <TableCell>{report.userName}</TableCell>
                      <TableCell>{report.websiteName}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(report.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {reports.map((report) => (
                <PendingMobileCard
                  key={report.id}
                  report={report}
                  selected={selectedSet.has(report.id)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AcceptReportsCard({ reportIds }: { reportIds: string[] }) {
  const [state, formAction, isPending] = useActionState(acceptReportsAction, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aceptar selección</CardTitle>
        <CardDescription>
          Confirma los importes y actualiza los saldos de cada sitio en orden.
        </CardDescription>
        <CardAction>
          <CheckCheckIcon aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form id="accept-reports-form" action={formAction}>
          {reportIds.map((reportId) => (
            <input key={reportId} type="hidden" name="reportIds" value={reportId} />
          ))}
        </form>
        <p className="text-sm text-muted-foreground">
          {selectionSummary(reportIds.length)}
        </p>
        <ActionFeedback state={state} />
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="submit"
          form="accept-reports-form"
          disabled={isPending || reportIds.length === 0}
        >
          {isPending ? <Spinner data-icon="inline-start" /> : <CheckCheckIcon data-icon="inline-start" />}
          {isPending ? "Aceptando..." : "Aceptar reportes"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function RejectReportsCard({ reportIds }: { reportIds: string[] }) {
  const [state, formAction, isPending] = useActionState(rejectReportsAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rechazar selección</CardTitle>
        <CardDescription>
          La misma nota se mostrará en todos los reportes seleccionados.
        </CardDescription>
        <CardAction>
          <XIcon aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form id="reject-reports-form" ref={formRef} action={formAction}>
          {reportIds.map((reportId) => (
            <input key={reportId} type="hidden" name="reportIds" value={reportId} />
          ))}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rejection-note">Motivo del rechazo</FieldLabel>
              <Textarea
                id="rejection-note"
                name="rejectionNote"
                minLength={3}
                maxLength={500}
                required
                disabled={isPending || reportIds.length === 0}
                placeholder="Explica qué debe corregirse antes de reenviar..."
              />
              <FieldDescription>Entre 3 y 500 caracteres.</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
        <ActionFeedback state={state} />
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          type="submit"
          form="reject-reports-form"
          variant="destructive"
          disabled={isPending || reportIds.length === 0}
        >
          {isPending ? <Spinner data-icon="inline-start" /> : <XIcon data-icon="inline-start" />}
          {isPending ? "Rechazando..." : "Rechazar reportes"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ReviewedReportsCard({ reports }: { reports: ApprovalsData["recentlyReviewed"] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Revisados recientemente</CardTitle>
        <CardDescription>
          Los reportes aceptados conservan el saldo inicial y final aplicado en la revisión.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Últimos {reports.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">
        {reports.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardCheckIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Aún no hay revisiones</EmptyTitle>
              <EmptyDescription>
                Las decisiones aceptadas o rechazadas quedarán registradas aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="hidden md:block">
              <Table className="min-w-250">
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Sitio</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Saldo inicial</TableHead>
                    <TableHead className="text-right">Saldo final</TableHead>
                    <TableHead>Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{formatReportDate(report.date)}</TableCell>
                      <TableCell>{report.userName}</TableCell>
                      <TableCell>{report.websiteName}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(report.amount)}
                      </TableCell>
                      <TableCell>
                        <ReportStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.startAmount === null ? "—" : formatCurrency(report.startAmount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.endAmount === null ? "—" : formatCurrency(report.endAmount)}
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                        {report.rejectionNote ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {reports.map((report) => (
                <ReviewedMobileCard key={report.id} report={report} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function PendingMobileCard({
  report,
  selected,
  onToggle,
}: {
  report: PendingReport;
  selected: boolean;
  onToggle: (reportId: string, checked: boolean) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={selected}
              onCheckedChange={(checked) => onToggle(report.id, checked)}
              aria-label={`Seleccionar reporte de ${report.userName} para ${report.websiteName}`}
            />
            <span>{report.websiteName}</span>
          </label>
        </CardTitle>
        <CardDescription>
          {report.userName} · {formatReportDate(report.date)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold tabular-nums">{formatCurrency(report.amount)}</p>
      </CardContent>
    </Card>
  );
}

function ReviewedMobileCard({ report }: { report: ReviewedReport }) {
  const hasBalances = report.startAmount !== null && report.endAmount !== null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{report.websiteName}</CardTitle>
        <CardDescription>
          {report.userName} · {formatReportDate(report.date)}
        </CardDescription>
        <CardAction>
          <ReportStatusBadge status={report.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-lg font-semibold tabular-nums">{formatCurrency(report.amount)}</p>
        {hasBalances ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            Saldo {formatCurrency(report.startAmount!)}
            <ArrowRightIcon aria-hidden="true" />
            {formatCurrency(report.endAmount!)}
          </p>
        ) : null}
        {report.rejectionNote ? (
          <p className="text-sm text-muted-foreground">Motivo: {report.rejectionNote}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function selectionSummary(count: number) {
  if (count === 0) {
    return "Selecciona al menos un reporte pendiente.";
  }

  return `${count} reporte${count === 1 ? " seleccionado" : "s seleccionados"}.`;
}
