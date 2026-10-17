import Link from "next/link";
import type { ReactNode } from "react";

const LEDGER_ROWS = Array.from({ length: 18 });
const LEDGER_COLUMNS = Array.from({ length: 8 });

function LedgerBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 mx-auto max-w-6xl border-x border-border/70">
        <div className="grid h-full grid-cols-4 sm:grid-cols-8">
          {LEDGER_COLUMNS.map((_, index) => (
            <span
              key={index}
              className="border-l border-border/60 first:border-l-0"
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col">
        {LEDGER_ROWS.map((_, index) => (
          <span key={index} className="flex-1 border-b border-border/60" />
        ))}
      </div>
      <div className="absolute inset-x-8 top-6 hidden items-center justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex">
        <span>Libro diario / 001</span>
        <span>Debe · Haber · Saldo</span>
      </div>
      <div className="absolute inset-x-8 bottom-6 hidden items-center justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex">
        <span>Periodo abierto</span>
        <span>Horizon / Control interno</span>
      </div>
    </div>
  );
}

type AuthShellProps = {
  children: ReactNode;
  section: string;
};

export function AuthShell({ children, section }: AuthShellProps) {
  return (
    <main
      lang="es"
      className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-muted/40 px-4 py-10 sm:px-6 sm:py-12"
    >
      <LedgerBackdrop />

      <div className="relative flex w-full max-w-md flex-col gap-6">
        <Link
          href="/"
          className="mx-auto flex w-fit items-center gap-3 text-foreground outline-none focus-visible:rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Horizon, volver al inicio"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-lg border border-foreground bg-background font-mono text-sm font-semibold shadow-sm"
          >
            H
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide">Horizon</span>
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Gestión financiera
            </span>
          </span>
        </Link>

        <div className="flex items-center justify-between border-y border-border/80 bg-background/60 px-2 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground backdrop-blur-sm">
          <span>Cuenta / 001</span>
          <span>{section}</span>
        </div>

        {children}

        <p className="m-0 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Sistema financiero interno · Acceso seguro
        </p>
      </div>
    </main>
  );
}
