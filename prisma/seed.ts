import "dotenv/config";

import { z } from "zod";

import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";

const seedEnvironment = z
  .object({
    SEED_ADMIN_EMAIL: z.email(),
    SEED_ADMIN_NAME: z.string().trim().min(1),
    SEED_ADMIN_PASSWORD: z.string().min(8).max(128),
  })
  .parse(process.env);

async function main() {
  const email = seedEnvironment.SEED_ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await db.user.findUnique({ where: { email } });

  if (!existingAdmin) {
    await auth.api.signUpEmail({
      body: {
        email,
        name: seedEnvironment.SEED_ADMIN_NAME,
        password: seedEnvironment.SEED_ADMIN_PASSWORD,
      },
    });

    const createdAdmin = await db.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });
    await db.session.deleteMany({ where: { userId: createdAdmin.id } });
  }

  await db.user.update({
    where: { email },
    data: {
      name: seedEnvironment.SEED_ADMIN_NAME,
      role: "admin",
      teamId: null,
    },
  });

  console.log(`Administrator ready: ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
