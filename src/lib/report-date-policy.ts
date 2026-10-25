import type { UserRole } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/domain";

export function assertReportDateAllowed({
  role,
  requestedDate,
  today,
  originalDate,
}: {
  role: UserRole;
  requestedDate: string;
  today: string;
  originalDate?: string;
}) {
  if (requestedDate > today) {
    throw new DomainError("No puedes registrar ganancias en una fecha futura.");
  }

  if (role !== "user") {
    return;
  }

  if (originalDate && requestedDate !== originalDate) {
    throw new DomainError("No puedes cambiar la fecha de un reporte existente.");
  }

  if (!originalDate && requestedDate !== today) {
    throw new DomainError("Solo puedes registrar ganancias del día actual.");
  }
}
