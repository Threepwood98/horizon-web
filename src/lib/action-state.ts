import { AuthorizationError, DomainError } from "@/lib/domain";

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}

export function actionFailure(error: unknown): ActionState {
  if (error instanceof DomainError || error instanceof AuthorizationError) {
    return { status: "error", message: error.message };
  }

  console.error(error);
  return {
    status: "error",
    message: "No pudimos completar la operación. Inténtalo de nuevo.",
  };
}

export function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function getFormStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}
