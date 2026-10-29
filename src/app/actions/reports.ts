"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import {
  actionFailure,
  actionSuccess,
  getFormString,
  getFormStrings,
  type ActionState,
} from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  DomainError,
  formatDateOnly,
  getTodayDate,
  parseDateOnly,
} from "@/lib/domain";
import {
  buildReportDraftKey,
  MAXIMUM_REPORT_AMOUNT,
  sumReportAmounts,
} from "@/lib/report-breakdown";
import {
  assertReportCreationAllowed,
  REPORT_CREATION_INTENTS,
} from "@/lib/report-creation-policy";
import { assertReportDateAllowed } from "@/lib/report-date-policy";
import {
  buildReportEvent,
  getSubmissionEventType,
  reportEventSnapshotSelect,
} from "@/lib/report-events";
import { getReportManagementScope } from "@/lib/report-scope";
import { withSerializableTransaction } from "@/lib/transaction";

const amountSchema = z
  .string()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Introduce un importe válido con hasta dos decimales.")
  .refine((value) => new Prisma.Decimal(value).greaterThan(0), "El importe debe ser mayor que cero.");

const reportDetailsSchema = z.object({
  reportId: z.string().optional(),
  intent: z.enum(REPORT_CREATION_INTENTS).default("standard"),
  ownerId: z.string().optional(),
  websiteId: z.string().min(1, "Selecciona un sitio."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida.")
    .optional(),
});

const breakdownSchema = z
  .array(amountSchema)
  .min(1, "El borrador debe conservar al menos una entrada.")
  .max(100, "El desglose no puede superar las 100 entradas.");
const selectionSchema = z.array(z.string().min(1)).min(1).max(100);

export async function saveReportAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireCurrentUser(["user", "leader"]);
    const parsed = reportDetailsSchema.safeParse({
      reportId: getFormString(formData, "reportId") || undefined,
      intent: getFormString(formData, "intent") || undefined,
      ownerId:
        user.role === "leader"
          ? getFormString(formData, "ownerId") || undefined
          : undefined,
      websiteId: getFormString(formData, "websiteId"),
      date:
        user.role === "leader"
          ? getFormString(formData, "date") || undefined
          : undefined,
    });

    if (!parsed.success) {
      return {
        status: "error",
        message: "Revisa los datos del reporte.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    if (!user.teamId) {
      throw new DomainError("Debes pertenecer a un equipo para registrar ganancias.");
    }

    const editableReport = parsed.data.reportId
      ? await db.report.findFirst({
          where: {
            id: parsed.data.reportId,
            ...getReportManagementScope(user),
            status: { in: ["draft", "rejected"] },
          },
          select: {
            status: true,
            date: true,
            userId: true,
            createdById: true,
          },
        })
      : null;

    if (parsed.data.reportId && !editableReport) {
      throw new DomainError("Este reporte ya no se puede editar.");
    }

    if (
      editableReport &&
      parsed.data.ownerId &&
      parsed.data.ownerId !== editableReport.userId
    ) {
      throw new DomainError("No puedes cambiar el miembro de un reporte existente.");
    }

    const ownerId = editableReport?.userId ??
      (user.role === "leader" ? parsed.data.ownerId : user.id);
    if (!ownerId) {
      return {
        status: "error",
        message: "Revisa los datos del reporte.",
        fieldErrors: { ownerId: ["Selecciona un miembro del equipo."] },
      };
    }
    assertReportCreationAllowed({
      role: user.role,
      actorId: user.id,
      ownerId,
      intent: parsed.data.intent,
      editing: Boolean(editableReport),
    });
    const isBackfill = parsed.data.intent === "backfill";

    const breakdownResult = editableReport?.status === "draft"
      ? breakdownSchema.safeParse(getRawFormStrings(formData, "entryAmounts"))
      : amountSchema.safeParse(getFormString(formData, "amount"));

    if (!breakdownResult.success) {
      return {
        status: "error",
        message: "Revisa los datos del reporte.",
        fieldErrors: {
          [editableReport?.status === "draft" ? "entryAmounts" : "amount"]:
            breakdownResult.error.issues.map((issue) => issue.message),
        },
      };
    }

    const entryAmounts = Array.isArray(breakdownResult.data)
      ? breakdownResult.data
      : [breakdownResult.data];
    const totalAmount = sumReportAmounts(entryAmounts);
    if (totalAmount.greaterThan(MAXIMUM_REPORT_AMOUNT)) {
      return {
        status: "error",
        message: "Revisa los datos del reporte.",
        fieldErrors: {
          [editableReport?.status === "draft" ? "entryAmounts" : "amount"]: [
            "El importe total no puede superar 9,999,999,999.99 USD.",
          ],
        },
      };
    }

    const today = getTodayDate();
    const requestedDate =
      user.role === "user"
        ? editableReport
          ? formatDateOnly(editableReport.date)
          : today
        : parsed.data.date;
    if (!requestedDate) {
      return {
        status: "error",
        message: "Revisa los datos del reporte.",
        fieldErrors: { date: ["Selecciona una fecha válida."] },
      };
    }

    const reportDate = parseDateOnly(requestedDate);
    assertReportDateAllowed({
      role: user.role,
      requestedDate,
      today,
      originalDate: editableReport
        ? formatDateOnly(editableReport.date)
        : undefined,
    });

    const creatorId = editableReport?.createdById ?? user.id;
    const draftKey = buildReportDraftKey(
      ownerId,
      creatorId,
      user.teamId,
      parsed.data.websiteId,
      requestedDate,
    );
    const mergedExistingDraft = await withSerializableTransaction(
      async (transaction) => {
        const owner = await transaction.user.findFirst({
          where: { id: ownerId, teamId: user.teamId! },
          select: { id: true, role: true },
        });
        const siteAccount = await transaction.siteAccount.findUnique({
          where: {
            teamId_websiteId: {
              teamId: user.teamId!,
              websiteId: parsed.data.websiteId,
            },
          },
          include: { website: { select: { active: true } } },
        });

        if (!owner) {
          throw new DomainError(
            "El miembro seleccionado no pertenece a tu equipo.",
          );
        }

        if (isBackfill && owner.role !== "user") {
          throw new DomainError(
            "Solo puedes completar reportes faltantes de usuarios de tu equipo.",
          );
        }

        if (!siteAccount || !siteAccount.website.active) {
          throw new DomainError("El sitio no está habilitado para tu equipo.");
        }

        if (isBackfill) {
          const existingReport = await transaction.report.findFirst({
            where: {
              userId: ownerId,
              teamId: user.teamId!,
              websiteId: parsed.data.websiteId,
              date: reportDate,
            },
            select: { id: true },
          });

          if (existingReport) {
            throw new DomainError(
              "Ya existe un reporte para este miembro, sitio y fecha.",
            );
          }
        }

        if (parsed.data.reportId) {
          const report = await transaction.report.findFirst({
            where: {
              id: parsed.data.reportId,
              ...getReportManagementScope(user),
              status: { in: ["draft", "rejected"] },
            },
            select: {
              ...reportEventSnapshotSelect,
              draftKey: true,
            },
          });

          if (
            !report ||
            report.status !== editableReport?.status ||
            report.userId !== ownerId ||
            report.createdById !== creatorId
          ) {
            throw new DomainError(
              "Este reporte cambió mientras lo editabas. Inténtalo de nuevo.",
            );
          }

          assertReportDateAllowed({
            role: user.role,
            requestedDate,
            today,
            originalDate: formatDateOnly(report.date),
          });

          if (report.submissionCount > 0 || report.draftKey === draftKey) {
            const savedReport = await transaction.report.update({
              where: { id: report.id },
              data: {
                teamId: user.teamId!,
                websiteId: parsed.data.websiteId,
                date: reportDate,
                amount: totalAmount,
                breakdown: { set: entryAmounts },
                draftKey: report.submissionCount > 0 ? null : draftKey,
                status: "draft",
                submissionOrigin: null,
                rejectionNote: null,
                reviewedAt: null,
                reviewedById: null,
                sentAt: null,
                startAmount: null,
                endAmount: null,
              },
              select: reportEventSnapshotSelect,
            });
            await transaction.reportEvent.create({
              data: buildReportEvent(savedReport, {
                type: "edited",
                actor: user,
              }),
            });
            return false;
          }

          const targetDraft = await transaction.report.findUnique({
            where: { draftKey },
            select: { id: true, amount: true },
          });

          if (!targetDraft) {
            const savedReport = await transaction.report.update({
              where: { id: report.id },
              data: {
                teamId: user.teamId!,
                websiteId: parsed.data.websiteId,
                date: reportDate,
                amount: totalAmount,
                breakdown: { set: entryAmounts },
                draftKey,
                status: "draft",
                submissionOrigin: null,
                rejectionNote: null,
                reviewedAt: null,
                reviewedById: null,
                sentAt: null,
                startAmount: null,
                endAmount: null,
              },
              select: reportEventSnapshotSelect,
            });
            await transaction.reportEvent.create({
              data: buildReportEvent(savedReport, {
                type: "edited",
                actor: user,
              }),
            });
            return false;
          }

          assertAggregateFits(targetDraft.amount, totalAmount);
          await transaction.reportEvent.create({
            data: buildReportEvent(report, {
              type: "merged",
              actor: user,
              relatedReportId: targetDraft.id,
            }),
          });
          await transaction.report.delete({ where: { id: report.id } });
          const savedReport = await transaction.report.update({
            where: { id: targetDraft.id },
            data: {
              amount: { increment: totalAmount },
              breakdown: { push: entryAmounts },
              submissionOrigin: null,
            },
            select: reportEventSnapshotSelect,
          });
          await transaction.reportEvent.create({
            data: buildReportEvent(savedReport, {
              type: "entry_added",
              actor: user,
              relatedReportId: report.id,
            }),
          });
          return true;
        }

        const targetDraft = await transaction.report.findUnique({
          where: { draftKey },
          select: { id: true, amount: true },
        });
        assertAggregateFits(targetDraft?.amount, totalAmount);

        if (targetDraft) {
          const savedReport = await transaction.report.update({
            where: { id: targetDraft.id },
            data: {
              amount: { increment: totalAmount },
              breakdown: { push: entryAmounts },
              submissionOrigin: null,
            },
            select: reportEventSnapshotSelect,
          });
          await transaction.reportEvent.create({
            data: buildReportEvent(savedReport, {
              type: "entry_added",
              actor: user,
            }),
          });
          return true;
        }

        let savedReport;
        try {
          savedReport = await transaction.report.create({
            data: {
              userId: ownerId,
              createdById: creatorId,
              teamId: user.teamId!,
              websiteId: parsed.data.websiteId,
              date: reportDate,
              amount: totalAmount,
              breakdown: entryAmounts,
              draftKey,
            },
            select: reportEventSnapshotSelect,
          });
        } catch (error) {
          if (isBackfill && isPrismaError(error, "P2002")) {
            throw new DomainError(
              "Ya existe un reporte para este miembro, sitio y fecha.",
            );
          }

          throw error;
        }
        await transaction.reportEvent.create({
          data: buildReportEvent(savedReport, {
            type: "created",
            actor: user,
          }),
        });
        return false;
      },
    );

    revalidateReportViews();
    if (isBackfill) {
      return actionSuccess("Reporte faltante guardado como borrador.");
    }
    if (parsed.data.reportId) {
      return actionSuccess(
        mergedExistingDraft ? "Borradores combinados." : "Borrador actualizado.",
      );
    }
    return actionSuccess(
      mergedExistingDraft ? "Entrada agregada al borrador existente." : "Borrador guardado.",
    );
  } catch (error) {
    return actionFailure(error);
  }
}

export async function deleteReportAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireCurrentUser(["user", "leader"]);
    const reportId = getFormString(formData, "reportId");

    await withSerializableTransaction(async (transaction) => {
      const report = await transaction.report.findFirst({
        where: {
          id: reportId,
          ...getReportManagementScope(user),
          status: { in: ["draft", "rejected"] },
        },
        select: reportEventSnapshotSelect,
      });

      if (!report) {
        throw new DomainError("Este reporte ya no se puede eliminar.");
      }

      await transaction.reportEvent.create({
        data: buildReportEvent(report, {
          type: "deleted",
          actor: user,
        }),
      });
      await transaction.report.delete({ where: { id: report.id } });
    });

    revalidateReportViews();
    return actionSuccess("Reporte eliminado.");
  } catch (error) {
    return actionFailure(error);
  }
}

export async function submitReportsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireCurrentUser(["user", "leader"]);
    const reportIds = parseSelection(formData);
    if (!user.teamId) {
      throw new DomainError("Debes pertenecer a un equipo para enviar reportes.");
    }

    await withSerializableTransaction(async (transaction) => {
      const reports = await transaction.report.findMany({
        where: {
          id: { in: reportIds },
          ...getReportManagementScope(user),
          teamId: user.teamId!,
          status: { in: ["draft", "rejected"] },
        },
        select: { id: true, websiteId: true },
      });

      if (reports.length !== reportIds.length) {
        throw new DomainError("Alguno de los reportes seleccionados ya no se puede enviar.");
      }

      const websiteIds = [...new Set(reports.map((report) => report.websiteId))];
      const availableAccounts = await transaction.siteAccount.count({
        where: {
          teamId: user.teamId!,
          websiteId: { in: websiteIds },
          website: { active: true },
        },
      });

      if (availableAccounts !== websiteIds.length) {
        throw new DomainError("Uno de los sitios seleccionados ya no está habilitado para tu equipo.");
      }

      const submittedAt = new Date();
      const updated = await transaction.report.updateMany({
        where: {
          id: { in: reportIds },
          ...getReportManagementScope(user),
          teamId: user.teamId!,
          status: { in: ["draft", "rejected"] },
        },
        data: {
          status: "sent",
          draftKey: null,
          sentAt: submittedAt,
          submissionOrigin: "manual",
          rejectionNote: null,
          reviewedAt: null,
          reviewedById: null,
          submissionCount: { increment: 1 },
        },
      });

      if (updated.count !== reportIds.length) {
        throw new DomainError("Alguno de los reportes seleccionados cambió mientras se enviaba.");
      }

      const submittedReports = await transaction.report.findMany({
        where: { id: { in: reportIds }, status: "sent" },
        select: reportEventSnapshotSelect,
      });
      if (submittedReports.length !== reportIds.length) {
        throw new DomainError(
          "No se pudo registrar el historial de todos los reportes enviados.",
        );
      }

      for (const report of submittedReports) {
        await transaction.reportEvent.create({
          data: buildReportEvent(report, {
            type: getSubmissionEventType(report.submissionCount),
            actor: user,
            occurredAt: submittedAt,
          }),
        });
      }
    });

    revalidateReportViews();
    return actionSuccess(`${reportIds.length} reporte${reportIds.length === 1 ? "" : "s"} enviado${reportIds.length === 1 ? "" : "s"}.`);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function acceptReportsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const reviewer = await requireCurrentUser(["leader"]);
    const reportIds = parseSelection(formData);

    if (!reviewer.teamId) {
      throw new DomainError("No tienes un equipo asignado.");
    }

    await withSerializableTransaction(async (transaction) => {
      const reports = await transaction.report.findMany({
        where: {
          id: { in: reportIds },
          teamId: reviewer.teamId!,
          status: "sent",
        },
        orderBy: [{ websiteId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          ...reportEventSnapshotSelect,
          createdAt: true,
        },
      });

      if (reports.length !== reportIds.length) {
        throw new DomainError("Alguno de los reportes seleccionados ya fue procesado.");
      }

      const reportsByWebsite = Map.groupBy(reports, (report) => report.websiteId);
      const reviewedAt = new Date();

      for (const [websiteId, websiteReports] of reportsByWebsite) {
        const siteAccount = await transaction.siteAccount.findUnique({
          where: {
            teamId_websiteId: { teamId: reviewer.teamId!, websiteId },
          },
        });
        const acceptedTotal = await transaction.report.aggregate({
          where: {
            teamId: reviewer.teamId!,
            websiteId,
            status: "accepted",
          },
          _sum: { amount: true },
        });

        if (!siteAccount) {
          throw new DomainError("Falta la cuenta del sitio para uno de los reportes.");
        }

        let balance = siteAccount.openingBalance.plus(acceptedTotal._sum.amount ?? 0);

        for (const report of websiteReports) {
          const endAmount = balance.plus(report.amount);
          const acceptedReport = await transaction.report.update({
            where: { id: report.id },
            data: {
              status: "accepted",
              startAmount: balance,
              endAmount,
              rejectionNote: null,
              reviewedById: reviewer.id,
              reviewedAt,
            },
            select: reportEventSnapshotSelect,
          });
          await transaction.reportEvent.create({
            data: buildReportEvent(acceptedReport, {
              type: "accepted",
              actor: reviewer,
              occurredAt: reviewedAt,
            }),
          });
          balance = endAmount;
        }
      }
    });

    revalidateReportViews();
    return actionSuccess(`${reportIds.length} reporte${reportIds.length === 1 ? "" : "s"} aceptado${reportIds.length === 1 ? "" : "s"}.`);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function rejectReportsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const reviewer = await requireCurrentUser(["leader"]);
    const reportIds = parseSelection(formData);
    const rejectionNote = getFormString(formData, "rejectionNote");

    if (!reviewer.teamId) {
      throw new DomainError("No tienes un equipo asignado.");
    }

    if (rejectionNote.length < 3 || rejectionNote.length > 500) {
      throw new DomainError("Explica el rechazo en un texto de 3 a 500 caracteres.");
    }

    await withSerializableTransaction(async (transaction) => {
      const reports = await transaction.report.findMany({
        where: {
          id: { in: reportIds },
          teamId: reviewer.teamId!,
          status: "sent",
        },
        select: { id: true },
      });

      if (reports.length !== reportIds.length) {
        throw new DomainError("Alguno de los reportes seleccionados ya fue procesado.");
      }

      const reviewedAt = new Date();
      const rejected = await transaction.report.updateMany({
        where: {
          id: { in: reportIds },
          teamId: reviewer.teamId!,
          status: "sent",
        },
        data: {
          status: "rejected",
          rejectionNote,
          reviewedById: reviewer.id,
          reviewedAt,
          startAmount: null,
          endAmount: null,
        },
      });

      if (rejected.count !== reportIds.length) {
        throw new DomainError(
          "Alguno de los reportes seleccionados cambió mientras se rechazaba.",
        );
      }

      const rejectedReports = await transaction.report.findMany({
        where: { id: { in: reportIds }, status: "rejected" },
        select: reportEventSnapshotSelect,
      });
      if (rejectedReports.length !== reportIds.length) {
        throw new DomainError(
          "No se pudo registrar el historial de todos los reportes rechazados.",
        );
      }

      for (const report of rejectedReports) {
        await transaction.reportEvent.create({
          data: buildReportEvent(report, {
            type: "rejected",
            actor: reviewer,
            occurredAt: reviewedAt,
          }),
        });
      }
    });

    revalidateReportViews();
    return actionSuccess(`${reportIds.length} reporte${reportIds.length === 1 ? "" : "s"} rechazado${reportIds.length === 1 ? "" : "s"}.`);
  } catch (error) {
    return actionFailure(error);
  }
}

function parseSelection(formData: FormData) {
  const result = selectionSchema.safeParse([...new Set(getFormStrings(formData, "reportIds"))]);

  if (!result.success) {
    throw new DomainError("Selecciona entre 1 y 100 reportes.");
  }

  return result.data;
}

function getRawFormStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""));
}

function assertAggregateFits(
  currentAmount: Prisma.Decimal | null | undefined,
  addedAmount: Prisma.Decimal,
) {
  if ((currentAmount ?? new Prisma.Decimal(0)).plus(addedAmount).greaterThan(MAXIMUM_REPORT_AMOUNT)) {
    throw new DomainError("El importe total del borrador supera 9,999,999,999.99 USD.");
  }
}

function isPrismaError(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function revalidateReportViews() {
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/approvals");
  revalidatePath("/history");
  revalidatePath("/statistics");
}
