"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  CalendarPlus2Icon,
  FilePlus2Icon,
  FilesIcon,
  PencilIcon,
  SendIcon,
  ShieldCheckIcon,
  Trash2Icon,
  WalletCardsIcon,
} from "lucide-react";
import { es } from "react-day-picker/locale";

import {
  deleteReportAction,
  saveReportAction,
  submitReportsAction,
} from "@/app/actions/reports";
import {
  formatReportDate,
  ReportStatusBadge,
} from "@/components/reports/report-ui";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
import { toast } from "@/components/ui/toast";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { formatCurrency } from "@/lib/domain";
import type { ReportCreationIntent } from "@/lib/report-creation-policy";
import type { getReportsData } from "@/lib/queries";

type ReportsData = Awaited<ReturnType<typeof getReportsData>>;
type Report = ReportsData["reports"][number];

const breakdownNumberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function showReportActionToast(
  state: ActionState,
  titles: { success: string; error: string },
) {
  if (state.status === "idle") {
    return;
  }

  toast.add({
    type: state.status,
    title: titles[state.status],
    description: state.message,
  });
}

const reportTabs = [
  {
    value: "draft",
    label: "Borradores",
    emptyTitle: "No hay borradores",
    emptyDescription: "Los nuevos borradores aparecerán aquí.",
  },
  {
    value: "sent",
    label: "Pendientes",
    emptyTitle: "No hay reportes pendientes",
    emptyDescription: "Los reportes enviados a revisión aparecerán aquí.",
  },
  {
    value: "rejected",
    label: "Rechazados",
    emptyTitle: "No hay reportes rechazados",
    emptyDescription:
      "Los reportes rechazados aparecerán aquí junto con el motivo.",
  },
] as const satisfies ReadonlyArray<{
  value: Report["status"];
  label: string;
  emptyTitle: string;
  emptyDescription: string;
}>;

export function ReportsWorkspace({
  data,
  today,
  currentUserId,
  isLeader,
}: {
  data: ReportsData;
  today: string;
  currentUserId: string;
  isLeader: boolean;
}) {
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editableReports = data.reports.filter(isEditable);
  const editableIdSet = new Set(editableReports.map((report) => report.id));
  const currentSelectedIds = selectedIds.filter((id) => editableIdSet.has(id));
  const pendingCount = data.reports.filter(
    (report) => report.status === "sent",
  ).length;

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

  function startEditing(reportId: string, trigger: HTMLButtonElement) {
    const report = data.reports.find(
      (candidate) => candidate.id === reportId && isEditable(candidate),
    );

    if (!report) {
      return;
    }

    editTriggerRef.current = trigger;
    setEditingReport(report);
    setEditDialogOpen(true);
  }

  function finishClosingEditDialog(open: boolean) {
    if (!open) {
      setEditingReport(null);
    }
  }

  function getEditDialogFinalFocus() {
    if (
      editTriggerRef.current?.isConnected &&
      editTriggerRef.current.getClientRects().length > 0
    ) {
      return editTriggerRef.current;
    }

    const visibleEditTrigger = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-report-edit]"),
    ).find(
      (trigger) =>
        trigger.dataset.reportEdit === editingReport?.id &&
        trigger.getClientRects().length > 0,
    );

    if (visibleEditTrigger) {
      return visibleEditTrigger;
    }

    return (
      document.querySelector<HTMLElement>(
        `[data-report-tab="${editingReport?.status ?? "draft"}"]`,
      ) ?? true
    );
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
            Guarda avances como borrador y envía varios reportes cuando estén
            listos para revisión.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {isLeader ? (
            <MissingReportDialog
              websites={data.websites}
              members={data.members}
              today={today}
              currentUserId={currentUserId}
            />
          ) : null}
          <div
            className="flex flex-wrap gap-2 sm:justify-end"
            role="group"
            aria-label="Resumen de reportes"
          >
            <Badge variant="outline">{editableReports.length} editables</Badge>
            <Badge variant="secondary">{pendingCount} pendientes</Badge>
            <Badge variant="outline">{data.reports.length} recientes</Badge>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.55fr)]">
        <NewReportCard
          websites={data.websites}
          members={data.members}
          today={today}
          currentUserId={currentUserId}
          isLeader={isLeader}
        />

        <ReportLedger
          reports={data.reports}
          selectedIds={currentSelectedIds}
          onToggle={toggleReport}
          onToggleAll={toggleReports}
          onEdit={startEditing}
          showMember={isLeader}
        />
      </div>

      {editingReport ? (
        <EditReportDialog
          key={editingReport.id}
          report={editingReport}
          websites={data.websites}
          members={data.members}
          today={today}
          currentUserId={currentUserId}
          isLeader={isLeader}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onOpenChangeComplete={finishClosingEditDialog}
          onSaved={() => setEditDialogOpen(false)}
          finalFocus={getEditDialogFinalFocus}
        />
      ) : null}
    </section>
  );
}

function NewReportCard({
  websites,
  members,
  today,
  currentUserId,
  isLeader,
}: {
  websites: ReportsData["websites"];
  members: ReportsData["members"];
  today: string;
  currentUserId: string;
  isLeader: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (previousState: ActionState, formData: FormData) => {
      const nextState = await saveReportAction(previousState, formData);

      showReportActionToast(nextState, {
        success: "Borrador guardado",
        error: "No se pudo guardar el borrador",
      });

      if (nextState.status === "success") {
        formRef.current?.reset();
      }

      return nextState;
    },
    initialActionState,
  );

  return (
    <Card className="xl:sticky xl:top-6">
      <CardHeader>
        <CardTitle>Nuevo reporte</CardTitle>
        <CardDescription>
          {isLeader
            ? "Registra tus propias ganancias. Podrás enviarlas después."
            : "Registra la ganancia de un sitio. Podrás enviarla después."}
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Borrador</Badge>
        </CardAction>
      </CardHeader>

      <form
        key="new-report-form"
        ref={formRef}
        action={formAction}
        className="flex flex-col gap-4"
      >
        <CardContent className="flex flex-col gap-4">
          <ReportFormFields
            idPrefix="new-report"
            state={state}
            websites={websites}
            members={members}
            today={today}
            currentUserId={currentUserId}
            isLeader={isLeader}
            isPending={isPending}
          />
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="submit" disabled={isPending || websites.length === 0}>
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FilePlus2Icon data-icon="inline-start" />
            )}
            {isPending ? "Guardando..." : "Guardar borrador"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function MissingReportDialog({
  websites,
  members,
  today,
  currentUserId,
}: {
  websites: ReportsData["websites"];
  members: ReportsData["members"];
  today: string;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const eligibleMembers = members.filter(
    (member) => member.role === "user" && member.id !== currentUserId,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }

    setOpen(nextOpen);
  }

  function handleOpenChangeComplete(nextOpen: boolean) {
    if (!nextOpen) {
      setIsPending(false);
      setSessionKey((current) => current + 1);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
          />
        }
      >
        <CalendarPlus2Icon data-icon="inline-start" aria-hidden="true" />
        Completar reporte faltante
      </DialogTrigger>

      <MissingReportDialogContent
        key={sessionKey}
        websites={websites}
        members={eligibleMembers}
        today={today}
        currentUserId={currentUserId}
        onPendingChange={setIsPending}
        onSaved={() => setOpen(false)}
      />
    </Dialog>
  );
}

function MissingReportDialogContent({
  websites,
  members,
  today,
  currentUserId,
  onPendingChange,
  onSaved,
}: {
  websites: ReportsData["websites"];
  members: ReportsData["members"];
  today: string;
  currentUserId: string;
  onPendingChange: (pending: boolean) => void;
  onSaved: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (previousState: ActionState, formData: FormData) => {
      const nextState = await saveReportAction(previousState, formData);

      showReportActionToast(nextState, {
        success: "Reporte faltante guardado",
        error: "No se pudo completar el reporte faltante",
      });

      if (nextState.status === "success") {
        formRef.current?.reset();
        startTransition(onSaved);
      }

      return nextState;
    },
    initialActionState,
  );

  useEffect(() => {
    onPendingChange(isPending);

    return () => onPendingChange(false);
  }, [isPending, onPendingChange]);

  return (
    <DialogContent
      className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl"
      showCloseButton={!isPending}
    >
      <DialogHeader className="pr-8">
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>Completar reporte faltante</DialogTitle>
          <Badge variant="secondary">Registro delegado</Badge>
        </div>
        <DialogDescription>
          Registra una ganancia que un usuario del equipo olvidó reportar.
        </DialogDescription>
      </DialogHeader>

      <form
        ref={formRef}
        action={formAction}
        className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4"
      >
        <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1">
          <Alert>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>Gestión protegida</AlertTitle>
            <AlertDescription>
              El usuario lo verá en Historial, pero solo tú podrás gestionarlo,
              corregirlo y enviarlo.
            </AlertDescription>
          </Alert>

          {members.length === 0 ? (
            <Alert variant="destructive">
              <CalendarPlus2Icon aria-hidden="true" />
              <AlertTitle>No hay usuarios disponibles</AlertTitle>
              <AlertDescription>
                El equipo necesita al menos un usuario para completar un
                reporte faltante.
              </AlertDescription>
            </Alert>
          ) : null}

          <ReportFormFields
            idPrefix="missing-report"
            creationIntent="backfill"
            state={state}
            websites={websites}
            members={members}
            today={today}
            currentUserId={currentUserId}
            isLeader
            isPending={isPending}
          />
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={isPending} />
            }
          >
            Cancelar
          </DialogClose>
          <Button
            type="submit"
            disabled={
              isPending || websites.length === 0 || members.length === 0
            }
          >
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CalendarPlus2Icon data-icon="inline-start" />
            )}
            {isPending ? "Guardando..." : "Guardar como borrador"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditReportDialog({
  report,
  websites,
  members,
  today,
  currentUserId,
  isLeader,
  open,
  onOpenChange,
  onOpenChangeComplete,
  onSaved,
  finalFocus,
}: {
  report: Report;
  websites: ReportsData["websites"];
  members: ReportsData["members"];
  today: string;
  currentUserId: string;
  isLeader: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
  onSaved: () => void;
  finalFocus: () => HTMLElement | boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    async (previousState: ActionState, formData: FormData) => {
      const nextState = await saveReportAction(previousState, formData);

      showReportActionToast(nextState, {
        success: "Reporte actualizado",
        error: "No se pudo actualizar el reporte",
      });

      if (nextState.status === "success") {
        startTransition(onSaved);
      }

      return nextState;
    },
    initialActionState,
  );
  const formKey = `${report.id}:${report.userId}:${report.websiteId}:${report.date}:${report.amount}:${report.breakdown.join(",")}`;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isPending) {
      return;
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl"
        showCloseButton={!isPending}
        finalFocus={finalFocus}
      >
        <DialogHeader className="pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Editar reporte</DialogTitle>
            <ReportStatusBadge status={report.status} />
          </div>
          <DialogDescription>
            {report.status === "draft"
              ? "Corrige o elimina las entradas que forman el importe total del borrador."
              : "Al guardar, el reporte volverá a borrador y quedará listo para reenviar."}
          </DialogDescription>
        </DialogHeader>

        <form
          key={formKey}
          action={formAction}
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4"
        >
          <div className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1">
            <ReportFormFields
              idPrefix="edit-report"
              report={report}
              state={state}
              websites={websites}
              members={members}
              today={today}
              currentUserId={currentUserId}
              isLeader={isLeader}
              isPending={isPending}
            />
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending} />
              }
            >
              Cancelar
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending || websites.length === 0}
            >
              {isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <FilePlus2Icon data-icon="inline-start" />
              )}
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportFormFields({
  idPrefix,
  creationIntent = "standard",
  report,
  state,
  websites,
  members,
  today,
  currentUserId,
  isLeader,
  isPending,
}: {
  idPrefix: string;
  creationIntent?: ReportCreationIntent;
  report?: Report;
  state: ActionState;
  websites: ReportsData["websites"];
  members: ReportsData["members"];
  today: string;
  currentUserId: string;
  isLeader: boolean;
  isPending: boolean;
}) {
  const ownerError = state.fieldErrors?.ownerId?.[0];
  const websiteError = state.fieldErrors?.websiteId?.[0];
  const dateError = state.fieldErrors?.date?.[0];
  const amountError = state.fieldErrors?.amount?.[0];
  const entryAmountsError = state.fieldErrors?.entryAmounts?.[0];
  const editingDraft = report?.status === "draft";
  const isBackfill = creationIntent === "backfill";
  const showOwnerField = isLeader && (Boolean(report) || isBackfill);
  const ownerOptions = isBackfill
    ? members.filter((member) => member.role === "user")
    : members;
  const reportDate = report?.date ?? today;
  const defaultOwnerId =
    report?.userId ??
    (isBackfill
      ? ""
      : members.some((member) => member.id === currentUserId)
        ? currentUserId
        : (members[0]?.id ?? currentUserId));
  const ownerInputId = `${idPrefix}-owner`;
  const ownerErrorId = `${ownerInputId}-error`;
  const websiteInputId = `${idPrefix}-website`;
  const websiteErrorId = `${websiteInputId}-error`;
  const dateInputId = `${idPrefix}-date`;
  const dateErrorId = `${dateInputId}-error`;
  const amountInputId = `${idPrefix}-amount`;
  const amountErrorId = `${amountInputId}-error`;
  const entryAmountsErrorId = `${idPrefix}-entry-amounts-error`;

  return (
    <>
      <input type="hidden" name="intent" value={creationIntent} />
      {report ? (
        <input type="hidden" name="reportId" value={report.id} />
      ) : null}
      {isLeader && !report && !isBackfill ? (
        <input type="hidden" name="ownerId" value={currentUserId} />
      ) : null}

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
        {showOwnerField ? (
          <Field
            className="sm:col-span-2"
            data-disabled={
              report || isPending || ownerOptions.length === 0
                ? true
                : undefined
            }
            data-invalid={ownerError ? true : undefined}
          >
            <FieldLabel htmlFor={ownerInputId}>
              {isBackfill ? "Miembro con reporte faltante" : "Miembro"}
            </FieldLabel>
            {report ? (
              <input type="hidden" name="ownerId" value={report.userId} />
            ) : null}
            <NativeSelect
              id={ownerInputId}
              name={report ? undefined : "ownerId"}
              defaultValue={defaultOwnerId}
              required
              disabled={
                isPending || Boolean(report) || ownerOptions.length === 0
              }
              aria-invalid={ownerError ? true : undefined}
              aria-describedby={ownerError ? ownerErrorId : undefined}
              className="w-full"
            >
              <NativeSelectOption value="" disabled>
                Selecciona un miembro
              </NativeSelectOption>
              {ownerOptions.map((member) => (
                <NativeSelectOption key={member.id} value={member.id}>
                  {member.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {report ? (
              <FieldDescription>
                El propietario de un reporte existente no se puede cambiar.
              </FieldDescription>
            ) : isBackfill ? (
              <FieldDescription>
                Solo se muestran usuarios del equipo; el reporte permanecerá
                bajo tu gestión.
              </FieldDescription>
            ) : null}
            <FieldError id={ownerErrorId}>{ownerError}</FieldError>
          </Field>
        ) : null}

        <Field
          className="sm:col-span-2"
          data-invalid={websiteError ? true : undefined}
        >
          <FieldLabel htmlFor={websiteInputId}>Sitio</FieldLabel>
          <NativeSelect
            id={websiteInputId}
            name="websiteId"
            defaultValue={report?.websiteId ?? ""}
            required
            disabled={isPending || websites.length === 0}
            aria-invalid={websiteError ? true : undefined}
            aria-describedby={websiteError ? websiteErrorId : undefined}
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
          <FieldError id={websiteErrorId}>{websiteError}</FieldError>
        </Field>

        {isLeader ? (
          <Field
            className={editingDraft ? "sm:col-span-2" : undefined}
            data-invalid={dateError ? true : undefined}
          >
            <FieldLabel htmlFor={dateInputId}>
              {isBackfill ? "Fecha faltante" : "Fecha"}
            </FieldLabel>
            <ReportDatePicker
              id={dateInputId}
              defaultValue={reportDate}
              maxValue={today}
              disabled={isPending}
              invalid={Boolean(dateError)}
              describedBy={dateError ? dateErrorId : undefined}
            />
            <FieldError id={dateErrorId}>{dateError}</FieldError>
          </Field>
        ) : null}

        {editingDraft ? (
          <FieldSet className="gap-3 sm:col-span-2">
            <FieldLegend variant="label">Desglose (USD)</FieldLegend>
            <FieldDescription>
              Modifica cada entrada o elimina las que no correspondan.
            </FieldDescription>
            <DraftBreakdownFields
              idPrefix={idPrefix}
              defaultValues={report.breakdown}
              disabled={isPending}
              invalid={Boolean(entryAmountsError)}
              describedBy={
                entryAmountsError ? entryAmountsErrorId : undefined
              }
            />
            <FieldError id={entryAmountsErrorId}>
              {entryAmountsError}
            </FieldError>
          </FieldSet>
        ) : (
          <Field
            className={!isLeader ? "sm:col-span-2" : undefined}
            data-invalid={amountError ? true : undefined}
          >
            <FieldLabel htmlFor={amountInputId}>Importe (USD)</FieldLabel>
            <Input
              id={amountInputId}
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
              aria-describedby={amountError ? amountErrorId : undefined}
            />
            <FieldError id={amountErrorId}>{amountError}</FieldError>
          </Field>
        )}
      </FieldGroup>

    </>
  );
}

function DraftBreakdownFields({
  idPrefix,
  defaultValues,
  disabled,
  invalid,
  describedBy,
}: {
  idPrefix: string;
  defaultValues: number[];
  disabled: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const [entries, setEntries] = useState(() =>
    defaultValues.map((value, index) => ({ id: index, value: String(value) })),
  );
  const total =
    entries.reduce((sum, entry) => {
      if (!/^\d{1,10}(?:\.\d{0,2})?$/.test(entry.value)) {
        return sum;
      }
      return sum + Math.round(Number(entry.value) * 100);
    }, 0) / 100;

  function updateEntry(id: number, value: string) {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, value } : entry)),
    );
  }

  function removeEntry(id: number) {
    setEntries((current) =>
      current.length === 1
        ? current
        : current.filter((entry) => entry.id !== id),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => {
        const inputId = `${idPrefix}-entry-${entry.id}`;

        return (
          <Field key={entry.id} data-invalid={invalid || undefined}>
            <FieldLabel htmlFor={inputId}>Entrada {index + 1}</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id={inputId}
                name="entryAmounts"
                type="number"
                inputMode="decimal"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                value={entry.value}
                onChange={(event) => updateEntry(entry.id, event.target.value)}
                required
                disabled={disabled}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeEntry(entry.id)}
                disabled={disabled || entries.length === 1}
                aria-label={`Eliminar entrada ${index + 1}`}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </div>
          </Field>
        );
      })}

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Importe total</span>
        <strong className="tabular-nums">{formatCurrency(total)}</strong>
      </div>
    </div>
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
  showMember,
}: {
  reports: ReportsData["reports"];
  selectedIds: string[];
  onToggle: (reportId: string, checked: boolean) => void;
  onToggleAll: (reportIds: string[], checked: boolean) => void;
  onEdit: (reportId: string, trigger: HTMLButtonElement) => void;
  showMember: boolean;
}) {
  const [, deleteFormAction, deletePending] = useActionState(
    async (previousState: ActionState, formData: FormData) => {
      const nextState = await deleteReportAction(previousState, formData);

      showReportActionToast(nextState, {
        success: "Reporte eliminado",
        error: "No se pudo eliminar el reporte",
      });

      return nextState;
    },
    initialActionState,
  );
  const selectedSet = new Set(selectedIds);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Reportes</CardTitle>
        <CardDescription>
          Consulta los reportes activos y selecciona borradores o rechazados
          para enviarlos juntos.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">{reports.length} reportes</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-4">
        <form id="delete-report-form" action={deleteFormAction} />

        <Tabs defaultValue="draft" className="min-w-0">
          <div className="overflow-x-auto pb-1">
            <TabsList variant="line" className="min-w-max">
              {reportTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-report-tab={tab.value}
                >
                  {tab.label}
                  <Badge variant="secondary">
                    {
                      reports.filter((report) => report.status === tab.value)
                        .length
                    }
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {reportTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <ReportStatusPanel
                reports={reports.filter(
                  (report) => report.status === tab.value,
                )}
                selectedSet={selectedSet}
                deletePending={deletePending}
                emptyTitle={tab.emptyTitle}
                emptyDescription={tab.emptyDescription}
                selectionLabel={tab.label.toLowerCase()}
                showBreakdown={tab.value === "draft"}
                showNote={tab.value === "rejected"}
                showRegistration={tab.value !== "draft"}
                onToggle={onToggle}
                onToggleAll={onToggleAll}
                onEdit={onEdit}
                showMember={showMember}
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
  showBreakdown,
  showNote,
  showRegistration,
  onToggle,
  onToggleAll,
  onEdit,
  showMember,
}: {
  reports: Report[];
  selectedSet: ReadonlySet<string>;
  deletePending: boolean;
  emptyTitle: string;
  emptyDescription: string;
  selectionLabel: string;
  showBreakdown: boolean;
  showNote: boolean;
  showRegistration: boolean;
  onToggle: (reportId: string, checked: boolean) => void;
  onToggleAll: (reportIds: string[], checked: boolean) => void;
  onEdit: (reportId: string, trigger: HTMLButtonElement) => void;
  showMember: boolean;
}) {
  const editableIds = reports.filter(isEditable).map((report) => report.id);
  const selectedCount = editableIds.filter((id) => selectedSet.has(id)).length;
  const allSelected =
    editableIds.length > 0 && selectedCount === editableIds.length;
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHead>
              <TableHead>Fecha</TableHead>
              {showMember ? <TableHead>Miembro</TableHead> : null}
              <TableHead>Sitio</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              {showBreakdown ? <TableHead>Desglose</TableHead> : null}
              {showNote ? <TableHead>Nota</TableHead> : null}
              {showRegistration ? <TableHead>Registro</TableHead> : null}
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
                      onCheckedChange={(checked) =>
                        onToggle(report.id, checked)
                      }
                      aria-label={`Seleccionar reporte de ${report.websiteName} del ${formatReportDate(report.date)}`}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">
                  {formatReportDate(report.date)}
                </TableCell>
                {showMember ? (
                  <TableCell className="font-medium">
                    {report.userName}
                  </TableCell>
                ) : null}
                <TableCell>{report.websiteName}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(report.amount)}
                </TableCell>
                {showBreakdown ? (
                  <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                    <ReportBreakdown amounts={report.breakdown} />
                  </TableCell>
                ) : null}
                {showNote ? (
                  <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                    <ReportDetail report={report} />
                  </TableCell>
                ) : null}
                {showRegistration ? (
                  <TableCell className="max-w-72 whitespace-normal">
                    <ReportMetadata report={report} />
                  </TableCell>
                ) : null}
                <TableCell>
                  {isEditable(report) ? (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-report-edit={report.id}
                        onClick={(event) =>
                          onEdit(report.id, event.currentTarget)
                        }
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
                    <span className="block text-right text-muted-foreground">
                      —
                    </span>
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
            showMember={showMember}
          />
        ))}
      </div>
    </div>
  );
}

function SubmitReportsForm({ reportIds }: { reportIds: string[] }) {
  const [, formAction, isPending] = useActionState(
    async (previousState: ActionState, formData: FormData) => {
      const nextState = await submitReportsAction(previousState, formData);

      showReportActionToast(nextState, {
        success: "Envío completado",
        error: "No se pudieron enviar los reportes",
      });

      return nextState;
    },
    initialActionState,
  );

  return (
    <div className="flex w-full flex-col gap-3">
      <form
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        {reportIds.map((reportId) => (
          <input
            key={reportId}
            type="hidden"
            name="reportIds"
            value={reportId}
          />
        ))}
        <p className="text-sm text-muted-foreground">
          {reportIds.length === 0
            ? "Selecciona al menos un reporte editable."
            : `${reportIds.length} reporte${reportIds.length === 1 ? " seleccionado" : "s seleccionados"}.`}
        </p>
        <Button type="submit" disabled={isPending || reportIds.length === 0}>
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SendIcon data-icon="inline-start" />
          )}
          {isPending ? "Enviando..." : "Enviar a revisión"}
        </Button>
      </form>
    </div>
  );
}

function ReportMobileCard({
  report,
  selected,
  deletePending,
  onToggle,
  onEdit,
  showMember,
}: {
  report: Report;
  selected: boolean;
  deletePending: boolean;
  onToggle: (reportId: string, checked: boolean) => void;
  onEdit: (reportId: string, trigger: HTMLButtonElement) => void;
  showMember: boolean;
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
        <CardDescription>
          {formatReportDate(report.date)}
          {showMember ? ` · ${report.userName}` : ""}
        </CardDescription>
        <CardAction>
          <ReportStatusBadge status={report.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-lg font-semibold tabular-nums">
          {formatCurrency(report.amount)}
        </p>
        {report.status === "draft" ? (
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Desglose</span>
            <ReportBreakdown amounts={report.breakdown} />
          </div>
        ) : (
          <ReportDetail report={report} />
        )}
        <ReportMetadata report={report} hideEmpty />
      </CardContent>
      {isEditable(report) ? (
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-report-edit={report.id}
            onClick={(event) => onEdit(report.id, event.currentTarget)}
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
        </CardFooter>
      ) : null}
    </Card>
  );
}

function ReportBreakdown({ amounts }: { amounts: number[] }) {
  return (
    <span className="tabular-nums">
      {amounts
        .map((amount) => breakdownNumberFormatter.format(amount))
        .join(" + ")}
    </span>
  );
}

function ReportDetail({ report }: { report: Report }) {
  if (report.status === "rejected" && report.rejectionNote) {
    return <span>Motivo: {report.rejectionNote}</span>;
  }

  if (
    report.status === "accepted" &&
    report.startAmount !== null &&
    report.endAmount !== null
  ) {
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

function ReportMetadata({
  report,
  hideEmpty = false,
}: {
  report: Report;
  hideEmpty?: boolean;
}) {
  const automaticallySubmitted = report.submissionOrigin === "automatic";

  if (!automaticallySubmitted) {
    return hideEmpty ? null : <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="secondary">auto</Badge>
    </div>
  );
}

function isEditable(report: Report) {
  return report.status === "draft" || report.status === "rejected";
}
