import type { UserRole } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/domain";

export const REPORT_CREATION_INTENTS = ["standard", "backfill"] as const;

export type ReportCreationIntent =
  (typeof REPORT_CREATION_INTENTS)[number];

export function assertReportCreationAllowed({
  role,
  actorId,
  ownerId,
  intent,
  editing,
}: {
  role: UserRole;
  actorId: string;
  ownerId: string;
  intent: ReportCreationIntent;
  editing: boolean;
}) {
  if (role !== "user" && role !== "leader") {
    throw new DomainError("No puedes crear reportes.");
  }

  if (editing) {
    if (intent === "backfill") {
      throw new DomainError(
        "No puedes cambiar el tipo de un reporte existente.",
      );
    }

    return;
  }

  if (role === "user") {
    if (intent !== "standard" || ownerId !== actorId) {
      throw new DomainError(
        "Solo un líder puede completar reportes faltantes.",
      );
    }

    return;
  }

  if (intent === "standard" && ownerId !== actorId) {
    throw new DomainError(
      "Usa Completar reporte faltante para registrar a nombre de otro miembro.",
    );
  }

  if (intent === "backfill" && ownerId === actorId) {
    throw new DomainError(
      "Usa Nuevo reporte para registrar tus propias ganancias.",
    );
  }
}
