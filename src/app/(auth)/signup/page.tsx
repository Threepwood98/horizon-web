import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea tus credenciales de acceso a Horizon.",
};

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell section="Registro">
      <SignupForm />
    </AuthShell>
  );
}
