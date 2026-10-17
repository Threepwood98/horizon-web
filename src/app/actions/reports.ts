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
import { DomainError, getTodayDate, parseDateOnly } from "@/lib/domain";
import { withSerializableTransaction } from "@/lib/transaction";

const amountSchema = z
  .string()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Introduce un importe válido con hasta dos decimales.")
  .refine((value) => new Prisma.Decimal(value).greaterThan(0), "El importe debe ser mayor que cero.");

const reportSchema = z.object({
  reportId: z.string().optional(),
  websiteId: z.string().min(1, "Selecciona un sitio."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha válida."),
  amount: amountSchema,
});

const selectionSchema = z.array(z.string().min(1)).min(1).max(100);

export async function saveReportAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireCurrentUser(["user", "leader"]);
    const parsed = reportSchema.safeParse({
      reportId: getFormString(formData, "reportId") || undefined,
      websiteId: getFormString(formData, "websiteId"),
      date: getFormString(formData, "date"),
      amount: getFormString(formData, "amount"),
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

    const reportDate = parseDateOnly(parsed.data.date);
    if (parsed.data.date > getTodayDate()) {
      throw new DomainError("No puedes registrar ganancias en una fecha futura.");
    }

    const siteAccount = await db.siteAccount.findUnique({
      where: {
        teamId_websiteId: {
          teamId: user.teamId,
          websiteId: parsed.data.websiteId,
        },
      },
      include: { website: { select: { active: true } } },
    });

    if (!siteAccount || !siteAccount.website.active) {
      throw new DomainError("El sitio no está habilitado para tu equipo.");
    }

    if (parsed.data.reportId) {
      const report = await db.report.findFirst({
        where: {
          id: parsed.data.reportId,
          userId: user.id,
          status: { in: ["draft", "rejected"] },
        },
        select: { id: true },
      });

      if (!report) {
        throw new DomainError("Este reporte ya no se puede editar.");
      }

      await db.report.update({
        where: { id: report.id },
        data: {
          teamId: user.teamId,
          websiteId: parsed.data.websiteId,
          date: reportDate,
          amount: parsed.data.amount,
          status: "draft",
          rejectionNote: null,
          reviewedAt: null,
          reviewedById: null,
          sentAt: null,
        },
      });
    } else {
      await db.report.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          websiteId: parsed.data.websiteId,
          date: reportDate,
          amount: parsed.data.amount,
        },
      });
    }

    revalidateReportViews();
    return actionSuccess(parsed.data.reportId ? "Reporte actualizado." : "Borrador guardado.");
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

    const deleted = await db.report.deleteMany({
      where: {
        id: reportId,
        userId: user.id,
        status: { in: ["draft", "rejected"] },
      },
    });

    if (deleted.count !== 1) {
      throw new DomainError("Este reporte ya no se puede eliminar.");
    }

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
          userId: user.id,
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

      const updated = await transaction.report.updateMany({
        where: {
          id: { in: reportIds },
          userId: user.id,
          teamId: user.teamId!,
          status: { in: ["draft", "rejected"] },
        },
        data: {
          status: "sent",
          sentAt: new Date(),
          rejectionNote: null,
          reviewedAt: null,
          reviewedById: null,
        },
      });

      if (updated.count !== reportIds.length) {
        throw new DomainError("Alguno de los reportes seleccionados cambió mientras se enviaba.");
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
      });

      if (reports.length !== reportIds.length) {
        throw new DomainError("Alguno de los reportes seleccionados ya fue procesado.");
      }

      const reportsByWebsite = Map.groupBy(reports, (report) => report.websiteId);

      for (const [websiteId, websiteReports] of reportsByWebsite) {
        const [siteAccount, acceptedTotal] = await Promise.all([
          transaction.siteAccount.findUnique({
            where: {
              teamId_websiteId: { teamId: reviewer.teamId!, websiteId },
            },
          }),
          transaction.report.aggregate({
            where: {
              teamId: reviewer.teamId!,
              websiteId,
              status: "accepted",
            },
            _sum: { amount: true },
          }),
        ]);

        if (!siteAccount) {
          throw new DomainError("Falta la cuenta del sitio para uno de los reportes.");
        }

        let balance = siteAccount.openingBalance.plus(acceptedTotal._sum.amount ?? 0);

        for (const report of websiteReports) {
          const endAmount = balance.plus(report.amount);
          await transaction.report.update({
            where: { id: report.id },
            data: {
              status: "accepted",
              startAmount: balance,
              endAmount,
              rejectionNote: null,
              reviewedById: reviewer.id,
              reviewedAt: new Date(),
            },
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

      await transaction.report.updateMany({
        where: { id: { in: reportIds } },
        data: {
          status: "rejected",
          rejectionNote,
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
          startAmount: null,
          endAmount: null,
        },
      });
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

function revalidateReportViews() {
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/approvals");
  revalidatePath("/statistics");
}
