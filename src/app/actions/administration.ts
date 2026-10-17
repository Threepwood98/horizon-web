"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import {
  actionFailure,
  actionSuccess,
  getFormString,
  type ActionState,
} from "@/lib/action-state";
import { requireCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { DomainError } from "@/lib/domain";
import { withSerializableTransaction } from "@/lib/transaction";

const optionalId = z.string().trim().optional();
const teamSchema = z.object({
  teamId: optionalId,
  name: z.string().trim().min(2).max(80),
  leaderId: optionalId,
});
const websiteSchema = z.object({
  websiteId: optionalId,
  name: z.string().trim().min(2).max(80),
  logoUrl: z.union([z.literal(""), z.url().max(500)]),
});
const accountSchema = z.object({
  teamId: z.string().min(1),
  websiteId: z.string().min(1),
  openingBalance: z
    .string()
    .regex(/^-?\d{1,10}(?:\.\d{1,2})?$/, "Introduce un saldo válido con hasta dos decimales."),
});
const accessSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "leader", "manager", "admin"]),
  teamId: optionalId,
});

export async function saveTeamAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireCurrentUser(["manager", "admin"]);
    const parsed = teamSchema.safeParse({
      teamId: getFormString(formData, "teamId") || undefined,
      name: getFormString(formData, "name"),
      leaderId: getFormString(formData, "leaderId") || undefined,
    });

    if (!parsed.success) {
      return invalidForm(parsed.error.flatten().fieldErrors);
    }

    const team = await withSerializableTransaction(async (transaction) => {
      const existingTeam = parsed.data.teamId
        ? await transaction.team.findUnique({
            where: { id: parsed.data.teamId },
            select: { id: true, leaderId: true },
          })
        : null;

      if (parsed.data.teamId && !existingTeam) {
        throw new DomainError("El equipo ya no existe.");
      }

      const savedTeam = existingTeam
        ? await transaction.team.update({
            where: { id: existingTeam.id },
            data: { name: parsed.data.name },
          })
        : await transaction.team.create({ data: { name: parsed.data.name } });

      if (parsed.data.leaderId) {
        const leader = await transaction.user.findUnique({
          where: { id: parsed.data.leaderId },
          select: {
            id: true,
            role: true,
            ledTeam: { select: { id: true } },
          },
        });

        if (!leader || leader.role === "admin" || leader.role === "manager") {
          throw new DomainError("Selecciona un usuario elegible como líder.");
        }

        if (leader.ledTeam && leader.ledTeam.id !== savedTeam.id) {
          throw new DomainError("Ese usuario ya lidera otro equipo.");
        }

        await transaction.user.update({
          where: { id: leader.id },
          data: { role: "leader", teamId: savedTeam.id },
        });
      }

      if (existingTeam?.leaderId && existingTeam.leaderId !== parsed.data.leaderId) {
        await transaction.user.update({
          where: { id: existingTeam.leaderId },
          data: { role: "user" },
        });
      }

      return transaction.team.update({
        where: { id: savedTeam.id },
        data: { leaderId: parsed.data.leaderId ?? null },
      });
    });

    revalidateAdministrationViews();
    return actionSuccess(`Equipo ${team.name} guardado.`);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function saveWebsiteAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireCurrentUser(["manager", "admin"]);
    const parsed = websiteSchema.safeParse({
      websiteId: getFormString(formData, "websiteId") || undefined,
      name: getFormString(formData, "name"),
      logoUrl: getFormString(formData, "logoUrl"),
    });

    if (!parsed.success) {
      return invalidForm(parsed.error.flatten().fieldErrors);
    }

    const data = {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl || null,
    };
    const website = parsed.data.websiteId
      ? await db.website.update({ where: { id: parsed.data.websiteId }, data })
      : await db.website.create({ data });

    revalidateAdministrationViews();
    return actionSuccess(`Sitio ${website.name} guardado.`);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function setWebsiteActiveAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireCurrentUser(["manager", "admin"]);
    const websiteId = getFormString(formData, "websiteId");
    const active = getFormString(formData, "active") === "true";
    const website = await db.website.update({
      where: { id: websiteId },
      data: { active },
    });

    revalidateAdministrationViews();
    return actionSuccess(`${website.name} quedó ${active ? "activo" : "inactivo"}.`);
  } catch (error) {
    return actionFailure(error);
  }
}

export async function saveSiteAccountAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireCurrentUser(["manager", "admin"]);
    const parsed = accountSchema.safeParse({
      teamId: getFormString(formData, "teamId"),
      websiteId: getFormString(formData, "websiteId"),
      openingBalance: getFormString(formData, "openingBalance"),
    });

    if (!parsed.success) {
      return invalidForm(parsed.error.flatten().fieldErrors);
    }

    await withSerializableTransaction(async (transaction) => {
      const [team, website, existingAccount] = await Promise.all([
        transaction.team.findUnique({ where: { id: parsed.data.teamId }, select: { id: true } }),
        transaction.website.findUnique({ where: { id: parsed.data.websiteId }, select: { id: true } }),
        transaction.siteAccount.findUnique({
          where: {
            teamId_websiteId: {
              teamId: parsed.data.teamId,
              websiteId: parsed.data.websiteId,
            },
          },
        }),
      ]);

      if (!team || !website) {
        throw new DomainError("El equipo o el sitio seleccionado ya no existe.");
      }

      const openingBalance = new Prisma.Decimal(parsed.data.openingBalance);

      if (!existingAccount) {
        await transaction.siteAccount.create({
          data: {
            teamId: parsed.data.teamId,
            websiteId: parsed.data.websiteId,
            openingBalance,
          },
        });
        return;
      }

      const delta = openingBalance.minus(existingAccount.openingBalance);
      if (delta.isZero()) {
        return;
      }

      const invalidSnapshots = await transaction.report.count({
        where: {
          teamId: parsed.data.teamId,
          websiteId: parsed.data.websiteId,
          status: "accepted",
          OR: [{ startAmount: null }, { endAmount: null }],
        },
      });

      if (invalidSnapshots > 0) {
        throw new DomainError("Hay reportes aceptados sin saldos históricos; corrígelos antes de cambiar el saldo inicial.");
      }

      await transaction.siteAccount.update({
        where: {
          teamId_websiteId: {
            teamId: parsed.data.teamId,
            websiteId: parsed.data.websiteId,
          },
        },
        data: { openingBalance },
      });
      await transaction.report.updateMany({
        where: {
          teamId: parsed.data.teamId,
          websiteId: parsed.data.websiteId,
          status: "accepted",
        },
        data: {
          startAmount: { increment: delta },
          endAmount: { increment: delta },
        },
      });
    });

    revalidateAdministrationViews();
    return actionSuccess("Cuenta y saldo inicial guardados.");
  } catch (error) {
    return actionFailure(error);
  }
}

export async function updateUserAccessAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireCurrentUser(["admin"]);
    const parsed = accessSchema.safeParse({
      userId: getFormString(formData, "userId"),
      role: getFormString(formData, "role"),
      teamId: getFormString(formData, "teamId") || undefined,
    });

    if (!parsed.success) {
      return invalidForm(parsed.error.flatten().fieldErrors);
    }

    if (actor.id === parsed.data.userId && parsed.data.role !== "admin") {
      throw new DomainError("No puedes retirar tu propio acceso de administrador.");
    }

    await withSerializableTransaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, role: true, ledTeam: { select: { id: true } } },
      });

      if (!target) {
        throw new DomainError("El usuario ya no existe.");
      }

      if (target.role === "admin" && parsed.data.role !== "admin") {
        const adminCount = await transaction.user.count({ where: { role: "admin" } });
        if (adminCount === 1) {
          throw new DomainError("Debe permanecer al menos un administrador.");
        }
      }

      if (parsed.data.role === "leader") {
        if (!parsed.data.teamId) {
          throw new DomainError("Un líder debe tener un equipo asignado.");
        }

        const team = await transaction.team.findUnique({
          where: { id: parsed.data.teamId },
          select: { id: true, leaderId: true },
        });

        if (!team) {
          throw new DomainError("El equipo seleccionado ya no existe.");
        }

        if (team.leaderId && team.leaderId !== target.id) {
          throw new DomainError("Ese equipo ya tiene un líder.");
        }

        if (target.ledTeam && target.ledTeam.id !== team.id) {
          await transaction.team.update({
            where: { id: target.ledTeam.id },
            data: { leaderId: null },
          });
        }

        await transaction.user.update({
          where: { id: target.id },
          data: { role: "leader", teamId: team.id },
        });
        await transaction.team.update({
          where: { id: team.id },
          data: { leaderId: target.id },
        });
        return;
      }

      if (target.ledTeam) {
        await transaction.team.update({
          where: { id: target.ledTeam.id },
          data: { leaderId: null },
        });
      }

      await transaction.user.update({
        where: { id: target.id },
        data: {
          role: parsed.data.role,
          teamId:
            parsed.data.role === "user" ? (parsed.data.teamId ?? null) : null,
        },
      });
    });

    revalidateAdministrationViews();
    return actionSuccess("Acceso del usuario actualizado.");
  } catch (error) {
    return actionFailure(error);
  }
}

function invalidForm(fieldErrors: Record<string, string[] | undefined>): ActionState {
  return {
    status: "error",
    message: "Revisa los datos del formulario.",
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
    ),
  };
}

function revalidateAdministrationViews() {
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/statistics");
  revalidatePath("/administration");
}
