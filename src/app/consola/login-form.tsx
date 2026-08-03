"use client";

import { useActionState } from "react";
import { authenticate, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label, Input, FieldError } from "@/components/ui/field";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(authenticate, {});

  return (
    <form action={formAction} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <FieldError>{state.error}</FieldError>
      <div>
        <Label htmlFor="email" required>Correo</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </div>
      <div>
        <Label htmlFor="password" required>Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Verificando…" : "Ingresar a la consola"}
      </Button>
    </form>
  );
}
