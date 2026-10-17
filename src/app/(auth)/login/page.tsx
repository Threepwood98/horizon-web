import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/current-user";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu espacio de gestión financiera en Horizon.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell section="Inicio de sesión">
      <LoginForm />
    </AuthShell>
  );
}
