import { cache } from "react";
import { headers } from "next/headers";

import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuthorizationError } from "@/lib/domain";

export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      teamId: true,
      team: { select: { name: true } },
    },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireCurrentUser(roles?: readonly UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("Debes iniciar sesión para continuar.");
  }

  if (roles && !roles.includes(user.role)) {
    throw new AuthorizationError("No tienes permiso para realizar esta acción.");
  }

  return user;
}
