"use client";

import Link from "next/link";
import { RotateCcwIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center p-4 sm:p-6">
      <Alert variant="destructive">
        <AlertTitle>No pudimos cargar esta sección</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-4">
          <span>
            El servidor no pudo completar la solicitud. Puedes volver a intentarlo
            sin perder tu sesión.
          </span>
          <span className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              Reintentar
            </Button>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "ghost" })}
            >
              Volver al panel
            </Link>
          </span>
        </AlertDescription>
      </Alert>
    </main>
  );
}
