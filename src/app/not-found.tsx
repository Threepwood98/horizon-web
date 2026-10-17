import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Error 404
          </p>
          <CardTitle className="font-serif text-3xl">Página no encontrada</CardTitle>
          <CardDescription>
            La dirección no corresponde a ninguna sección disponible en Horizon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Comprueba el enlace o vuelve al inicio para continuar.
          </p>
        </CardContent>
        <CardFooter className="justify-end">
          <Link href="/" className={buttonVariants()}>
            Volver al inicio
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
