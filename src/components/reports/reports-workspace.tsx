"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  FilePlus2Icon,
  FilesIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  WalletCardsIcon,
} from "lucide-react";
import { es } from "react-day-picker/locale";

import {
  deleteReportAction,
  saveReportAction,
  submitReportsAction,
} from "@/app/actions/reports";
import { ActionFeedback, formatReportDate, ReportStatusBadge } from "@/components/reports/report-ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initialActionState } from "@/lib/action-state";
import { formatCurrency } from "@/lib/domain";
import type { getReportsData } from "@/lib/queries";

type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
type Report = ReportsData["reports"][number];

const reportTabs = [
  {
    value: "draft",
    label: "Borradores",
    emptyTitle: "No hay borradores",
    emptyDescription: "Los nuevos borradores aparecerán aquí.",
  },
  {
    value: "rejected",
    label: "Rechazados",
    emptyTitle: "No hay reportes rechazados",
    emptyDescription: "Los reportes rechazados aparecerán aquí junto con el motivo.",
  },
  {
    value: "sent",
    label: "Pendientes",
    emptyTitle: "No hay reportes pendientes",
    emptyDescription: "Los reportes enviados a revisión aparecerán aquí.",
  },
  {
    value: "accepted",
    label: "Aceptados",
    emptyTitle: "No hay reportes aceptados",
    emptyDescription: "Los reportes aprobados aparecerán aquí con sus saldos.",
  },
] as const satisfies ReadonlyArray<{
  value: Report["status"];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}>;

export function ReportsWorkspace({ data, today }: { data: ReportsData; today: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const editingReport = data.reports.find((report) => report.id === editingId);
  const editableReports = data.reports.filter(isEditable);
  const editableIdSet = new Set(editableReports.map((report) => report.id));
  const currentSelectedIds = selectedIds.filter((id) => editableIdSet.has(id));
  const pendingCount = data.reports.filter((report) => report.status === "sent").length;

  function toggleReport(reportId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(reportId)
          ? current
          : [...current, reportId]
        : current.filter((id) => id !== reportId),
    );
  }

  function toggleReports(reportIds: string[], checked: boolean) {
    const reportIdSet = new Set(reportIds);
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, ...reportIds])]
        : current.filter((id) => !reportIdSet.has(id)),
    );
  }

  function startEditing(reportId: string) {
    setEditingId(reportId);

    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => {
        document.getElementById("report-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Registro diario
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Reportes de ganancias
          </h1>
          <p className="text-sm text-muted-foreground">
            Guarda avances como borrador y envía varios reportes cuando estén listos para revisión.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Resumen de reportes"
        >
          <Badge variant="outline">{editableReports.length} editables</Badge>
          <Badge variant="secondary">{pendingCount} pendientes</Badge>
          <Badge variant="outline">{data.reports.length} recientes</Badge>
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.55fr)]">
        <ReportEditor
          key={editingId ?? "new-report"}
          report={editingReport}
          websites={data.websites}
          today={today}
          onCancel={() => setEditingId(null)}
        />

        <ReportLedger
          reports={data.reports}
          selectedIds={currentSelectedIds}
          onToggle={toggleReport}
          onToggleAll={toggleReports}
          onEdit={startEditing}
        />
      </div>
    </section>
  );
}

function ReportEditor({
  report,
  websites,
  today,
  onCancel,
}: {
  report: Report | undefined;
  websites: ReportsData["websites"];
  today: string;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(saveReportAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const websiteError = state.fieldErrors?.websiteId?.[0];
  const dateError = state.fieldErrors?.date?.[0];
  const amountError = state.fieldErrors?.amount?.[0];
  const formKey = report
    ? `${report.id}:${report.websiteId}:${report.date}:${report.amount}`
    : "new-report-form";

  useEffect(() => {
    if (state.status === "success" && !report) {
      formRef.current?.reset();
    }
  }, [report, state]);

  return (
    <Card id="report-editor" className="scroll-mt-4 xl:sticky xl:top-6">
      <CardHeader>
        <CardTitle>{report ? "Editar reporte" : "Nuevo reporte"}</CardTitle>
        <CardDescription>
          {report
            ? "Al guardar, el reporte volverá a borrador y quedará listo para reenviar."
            : "Registra la ganancia de un sitio. Podrás enviarla después."}
        </CardDescription>
        <CardAction>
          <Badge variant={report ? "secondary" : "outline"}>
            {report ? "Edición" : "Borrador"}
          </Badge>
        </CardAction>
      </CardHeader>

      <form key={formKey} ref={formRef} action={formAction} className="flex flex-col gap-4">
        <CardContent className="flex flex-col gap-4">
          {report ? <input type="hidden" name="reportId" value={report.id} /> : null}

          {websites.length === 0 ? (
            <Alert variant="destructive">
              <WalletCardsIcon aria-hidden="true" />
              <AlertTitle>No hay sitios disponibles</AlertTitle>
              <AlertDescription>
                Tu equipo necesita al menos un sitio activo antes de crear reportes.
              </AlertDescription>
            </Alert>
          ) : null}

          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" data-invalid={websiteError ? true : undefined}>
              <FieldLabel htmlFor="report-website">Sitio</FieldLabel>
              <NativeSelect
                id="report-website"
                name="websiteId"
                defaultValue={report?.websiteId ?? ""}
                required
                disabled={isPending || websites.length === 0}
                aria-invalid={websiteError ? true : undefined}
                aria-describedby={websiteError ? "report-website-error" : undefined}
                className="w-full"
              >
                <NativeSelectOption value="" disabled>
                  Selecciona un sitio
                </NativeSelectOption>
                {websites.map((website) => (
                  <NativeSelectOption key={website.id} value={website.id}>
                    {website.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError id="report-website-error">{websiteError}</FieldError>
            </Field>

            <Field data-invalid={dateError ? true : undefined}>
              <FieldLabel htmlFor="report-date">Fecha</FieldLabel>
              <ReportDatePicker
                id="report-date"
                defaultValue={report?.date ?? today}
                maxValue={today}
                disabled={isPending}
                invalid={Boolean(dateError)}
                describedBy={dateError ? "report-date-error" : undefined}
              />
              <FieldError id="report-date-error">{dateError}</FieldError>
            </Field>

            <Field data-invalid={amountError ? true : undefined}>
              <FieldLabel htmlFor="report-amount">Importe (USD)</FieldLabel>
              <Input
                id="report-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                defaultValue={report?.amount ?? ""}
                placeholder="0.00"
                required
                disabled={isPending}
                aria-invalid={amountError ? true : undefined}
                aria-describedby={amountError ? "report-amount-error" : undefined}
              />
              <FieldError id="report-amount-error">{amountError}</FieldError>
            </Field>
          </FieldGroup>

          <ActionFeedback state={state} />
        </CardContent>

        <CardFooter className="justify-end gap-2">
          {report ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending || websites.length === 0}>
            {isPending ? <Spinner data-icon="inline-start" /> : <FilePlus2Icon data-icon="inline-start" />}
            {isPending ? "Guardando..." : report ? "Guardar cambios" : "Guardar borrador"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ReportDatePicker({
  id,
  defaultValue,
  maxValue,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  defaultValue: string;
  maxValue: string;
  disabled: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const selectedDate = parseLocalDate(value);

  useEffect(() => {
    const form = inputRef.current?.form;

    if (!form) {
      return;
    }

    function handleReset() {
      setValue(defaultValue);
      setOpen(false);
    }

    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue]);

  function handleSelect(date: Date | undefined) {
    if (!date) {
      return;
    }

    setValue(formatLocalDate(date));
    setOpen(false);
  }

  return (
    <>
      <input ref={inputRef} type="hidden" name="date" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-start px-2.5 font-normal"
              disabled={disabled}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" aria-hidden="true" />
          {formatReportDate(value)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            required
            locale={es}
            defaultMonth={selectedDate}
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={{ after: parseLocalDate(maxValue) }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(value: Date) {
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ReportLedger({
  reports,
  selectedIds,
  onToggle,
  onToggleAll,
  onEdit,
}: {
  reports: ReportsData["reports"];
  selectedIds: string[];
  onToggle: (reportId: string, checked: boolean) => void;
  onToggleAll: (reportIds: string[], checked: boolean) => void;
  onEdit: (reportId: string) => void;
}) {
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteReportAction,
    initialActionState,
  );
  const selectedSet = new Set(selectedIds);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Historial reciente</CardTitle>
        <CardDescription>
          Consulta cada estado y selecciona borradores o rechazados para enviarlos juntos.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Últimos {reports.length}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-4">
        <ActionFeedback state={deleteState} />
        <form id="delete-report-form" action={deleteFormAction} />

        <Tabs defaultValue="draft" className="min-w-0">
          <div className="overflow-x-auto pb-1">
            <TabsList variant="line" className="min-w-max">
              {reportTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <Badge variant="secondary">
                    {reports.filter((report) => report.status === tab.value).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {reportTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <ReportStatusPanel
                reports={reports.filter((report) => report.status === tab.value)}
                selectedSet={selectedSet}
                deletePending={deletePending}
                emptyTitle={tab.emptyTitle}
                emptyDescription={tab.emptyDescription}
                selectionLabel={tab.label.toLowerCase()}
                showDetail={tab.value === "rejected"}
                onToggle={onToggle}
                onToggleAll={onToggleAll}
                onEdit={onEdit}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-3">
        <SubmitReportsForm reportIds={selectedIds} />
      </CardFooter>
    </Card>
  );
}

function ReportStatusPanel({
  reports,
  selectedSet,
  deletePending,
  emptyTitle,
  emptyDescription,
  selectionLabel,
  showDetail,
  onToggle,
  onToggleAll,
  onEdit,
}: {
  reports: Report[];
  selectedSet: ReadonlySet<string>;
  deletePending: boolean;
  emptyTitle: string;
  emptyDescription: string;
  selectionLabel: string;
  showDetail: boolean;
  onToggle: (reportId: string, checked: boolean) => void;
  onToggleAll: (reportIds: string[], checked: boolean) => void;
  onEdit: (reportId: string) => void;
}) {
  const editableIds = reports.filter(isEditable).map((report) => report.id);
  const selectedCount = editableIds.filter((id) => selectedSet.has(id)).length;
  const allSelected = editableIds.length > 0 && selectedCount === editableIds.length;
  const someSelected = selectedCount > 0 && !allSelected;

  if (reports.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FilesIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {editableIds.length > 0 ? (
        <label className="flex min-h-10 items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onCheckedChange={(checked) => onToggleAll(editableIds, checked)}
            aria-label={`Seleccionar todos los ${selectionLabel}`}
          />
          <span>Seleccionar {selectionLabel}</span>
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {selectedCount} de {editableIds.length}
          </span>
        </label>
      ) : null}

      <div className="hidden md:block">
        <Table className="min-w-225">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Sitio</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              {showDetail ? <TableHead>Detalle</TableHead> : null}
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow
                key={report.id}
                data-state={selectedSet.has(report.id) ? "selected" : undefined}
              >
                <TableCell>
                  {isEditable(report) ? (
                    <Checkbox
                      checked={selectedSet.has(report.id)}
                      onCheckedChange={(checked) => onToggle(report.id, checked)}
                      aria-label={`Seleccionar reporte de ${report.websiteName} del ${formatReportDate(report.date)}`}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">
                  {formatReportDate(report.date)}
                </TableCell>
                <TableCell>{report.websiteName}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(report.amount)}
                </TableCell>
                {showDetail ? (
                  <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                    <ReportDetail report={report} />
                  </TableCell>
                ) : null}
                <TableCell>
                  {isEditable(report) ? (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(report.id)}
                      >
                        <PencilIcon data-icon="inline-start" />
                        Editar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="destructive"
                        form="delete-report-form"
                        name="reportId"
                        value={report.id}
                        disabled={deletePending}
                      >
                        {deletePending ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <Trash2Icon data-icon="inline-start" />
                        )}
                        Eliminar
                      </Button>
                    </div>
                  ) : (
                    <span className="block text-right text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {reports.map((report) => (
          <ReportMobileCard
            key={report.id}
            report={report}
            selected={selectedSet.has(report.id)}
            deletePending={deletePending}
            onToggle={onToggle}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

function SubmitReportsForm({ reportIds }: { reportIds: string[] }) {
  const [state, formAction, isPending] = useActionState(submitReportsAction, initialActionState);

  return (
    <div className="flex w-full flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {reportIds.map((reportId) => (
          <input key={reportId} type="hidden" name="reportIds" value={reportId} />
        ))}
        <p className="text-sm text-muted-foreground">
          {reportIds.length === 0
            ? "Selecciona al menos un reporte editable."
            : `${reportIds.length} reporte${reportIds.length === 1 ? " seleccionado" : "s seleccionados"}.`}
        </p>
        <Button type="submit" disabled={isPending || reportIds.length === 0}>
          {isPending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
          {isPending ? "Enviando..." : "Enviar a revisión"}
        </Button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}

function ReportMobileCard({
  report,
  selected,
  deletePending,
  onToggle,
  onEdit,
}: {
  report: Report;
  selected: boolean;
  deletePending: boolean;
  onToggle: (reportId: string, checked: boolean) => void;
  onEdit: (reportId: string) => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>
          {isEditable(report) ? (
            <label className="flex items-center gap-2">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onToggle(report.id, checked)}
                aria-label={`Seleccionar reporte de ${report.websiteName} del ${formatReportDate(report.date)}`}
              />
              <span>{report.websiteName}</span>
            </label>
          ) : (
            report.websiteName
          )}
        </CardTitle>
        <CardDescription>{formatReportDate(report.date)}</CardDescription>
        <CardAction>
          <ReportStatusBadge status={report.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-lg font-semibold tabular-nums">{formatCurrency(report.amount)}</p>
        <ReportDetail report={report} />
      </CardContent>
      {isEditable(report) ? (
        <CardFooter className="justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(report.id)}>
            <PencilIcon data-icon="inline-start" />
            Editar
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            form="delete-report-form"
            name="reportId"
            value={report.id}
            disabled={deletePending}
          >
            {deletePending ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
            Eliminar
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function ReportDetail({ report }: { report: Report }) {
  if (report.status === "rejected" && report.rejectionNote) {
    return <span>Motivo: {report.rejectionNote}</span>;
  }

  if (report.status === "accepted" && report.startAmount !== null && report.endAmount !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        {formatCurrency(report.startAmount)}
        <ArrowRightIcon aria-hidden="true" />
        {formatCurrency(report.endAmount)}
      </span>
    );
  }

  if (report.status === "sent") {
    return <span>En revisión por el líder</span>;
  }

  return <span>Listo para editar o enviar</span>;
}

function isEditable(report: Report) {
  return report.status === "draft" || report.status === "rejected";
}
