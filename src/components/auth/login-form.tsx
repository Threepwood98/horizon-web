"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

function getLoginErrorMessage(code?: string) {
  if (code === "TOO_MANY_REQUESTS") {
    return "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.";
  }

  return "No pudimos iniciar sesión. Revisa el correo y la contraseña e inténtalo de nuevo.";
}

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextErrors: LoginErrors = {};

    if (!email) {
      nextErrors.email = "Introduce tu correo electrónico.";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "Introduce un correo electrónico válido.";
    }

    if (!password) {
      nextErrors.password = "Introduce tu contraseña.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const { error } = await authClient.signIn.email({
          email,
          password,
        });

        if (error) {
          setErrors({ form: getLoginErrorMessage(error.code) });
          return;
        }

        router.replace("/dashboard");
      } catch {
        setErrors({
          form: "No pudimos conectar con el servicio. Comprueba tu conexión e inténtalo de nuevo.",
        });
      }
    });
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <span>Folio 001</span>
          <span>Acceso</span>
        </div>
        <div className="flex flex-col gap-1 text-center">
          <CardTitle>
            <h1 className="m-0 text-xl font-semibold tracking-tight">
              Bienvenido de nuevo
            </h1>
          </CardTitle>
          <CardDescription>
            Introduce tus credenciales para abrir tu espacio de trabajo.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          aria-busy={isPending}
          aria-describedby={errors.form ? "login-form-error" : undefined}
          onSubmit={handleSubmit}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="nombre@empresa.com"
                className="h-10"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                required
              />
              <FieldError id="login-email-error">{errors.email}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-10"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "login-password-error" : undefined
                }
                required
              />
              <FieldError id="login-password-error">
                {errors.password}
              </FieldError>
            </Field>

            {errors.form ? (
              <Field data-invalid>
                <FieldError id="login-form-error">{errors.form}</FieldError>
              </Field>
            ) : null}

            <Field>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Spinner
                      data-icon="inline-start"
                      aria-label="Comprobando acceso"
                    />
                    Comprobando acceso…
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
              <FieldDescription className="text-center">
                ¿Aún no tienes una cuenta?{" "}
                <Link href="/signup">Crear cuenta</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
