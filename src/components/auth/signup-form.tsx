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

type SignupErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

function getSignupErrorMessage(code?: string) {
  if (
    code === "USER_ALREADY_EXISTS" ||
    code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
  ) {
    return "Ya existe una cuenta con este correo. Inicia sesión para continuar.";
  }

  if (code === "TOO_MANY_REQUESTS") {
    return "Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.";
  }

  return "No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.";
}

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<SignupErrors>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextErrors: SignupErrors = {};

    if (!name) {
      nextErrors.name = "Introduce tu nombre completo.";
    }

    if (!email) {
      nextErrors.email = "Introduce tu correo electrónico.";
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = "Introduce un correo electrónico válido.";
    }

    if (!password) {
      nextErrors.password = "Crea una contraseña.";
    } else if (password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    } else if (password.length > 128) {
      nextErrors.password = "La contraseña no puede superar los 128 caracteres.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirma tu contraseña.";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      try {
        const { error } = await authClient.signUp.email({
          name,
          email,
          password,
        });

        if (error) {
          setErrors({ form: getSignupErrorMessage(error.code) });
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
          <span>Folio 002</span>
          <span>Alta</span>
        </div>
        <div className="flex flex-col gap-1 text-center">
          <CardTitle>
            <h1 className="m-0 text-xl font-semibold tracking-tight">
              Crea tu cuenta
            </h1>
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Registra tus credenciales. Después, un administrador deberá
            asignarte un equipo antes de que puedas operar.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          aria-busy={isPending}
          aria-describedby={errors.form ? "signup-form-error" : undefined}
          onSubmit={handleSubmit}
        >
          <FieldGroup>
            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="signup-name">Nombre completo</FieldLabel>
              <Input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nombre y apellidos"
                className="h-10"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "signup-name-error" : undefined}
                required
              />
              <FieldError id="signup-name-error">{errors.name}</FieldError>
            </Field>

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="signup-email">Correo electrónico</FieldLabel>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="nombre@empresa.com"
                className="h-10"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "signup-email-error" : undefined}
                required
              />
              <FieldError id="signup-email-error">{errors.email}</FieldError>
            </Field>

            <Field>
              <FieldGroup className="gap-4 sm:grid sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.password)}>
                  <FieldLabel htmlFor="signup-password">Contraseña</FieldLabel>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className="h-10"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "signup-password-error" : undefined
                    }
                    required
                  />
                  <FieldError id="signup-password-error">
                    {errors.password}
                  </FieldError>
                </Field>

                <Field data-invalid={Boolean(errors.confirmPassword)}>
                  <FieldLabel htmlFor="signup-confirm-password">
                    Confirmar
                  </FieldLabel>
                  <Input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    className="h-10"
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={
                      errors.confirmPassword
                        ? "signup-confirm-password-error"
                        : undefined
                    }
                    required
                  />
                  <FieldError id="signup-confirm-password-error">
                    {errors.confirmPassword}
                  </FieldError>
                </Field>
              </FieldGroup>
              <FieldDescription>
                Usa entre 8 y 128 caracteres.
              </FieldDescription>
            </Field>

            {errors.form ? (
              <Field data-invalid>
                <FieldError id="signup-form-error">{errors.form}</FieldError>
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
                      aria-label="Creando cuenta"
                    />
                    Creando cuenta…
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
              <FieldDescription className="text-center">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/login">Iniciar sesión</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
