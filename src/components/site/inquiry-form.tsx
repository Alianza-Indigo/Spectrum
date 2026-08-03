"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Input, Textarea, Select, Checkbox, FieldError } from "@/components/ui/field";
import { serviceTypes, serviceTypeLabels } from "@/lib/validation/inquiry";
import { CheckCircle2 } from "lucide-react";

type FieldErrors = Record<string, string[] | undefined>;

const urgencies = [
  { value: "LOW", label: "Baja" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "Alta" },
  { value: "CRITICAL", label: "Crítica" },
];

export function InquiryForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrors({});
    setMessage("");

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    // Los checkboxes ausentes no llegan en FormData; los normalizamos a boolean.
    const payload = {
      ...data,
      authorizationConfirmed: data.authorizationConfirmed === "on",
      contactConsent: data.contactConsent === "on",
    };

    try {
      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(body.message ?? "Solicitud recibida.");
        form.reset();
        return;
      }

      if (res.status === 422 && body.fieldErrors) {
        setErrors(body.fieldErrors);
        setStatus("error");
        setMessage("Revisa los campos marcados.");
        return;
      }

      setStatus("error");
      setMessage(body.message ?? "No fue posible enviar la solicitud. Intenta más tarde.");
    } catch {
      setStatus("error");
      setMessage("Error de conexión. Intenta más tarde.");
    }
  }

  if (status === "success") {
    return (
      <div className="spx-card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">Solicitud recibida</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{message}</p>
        <p className="mx-auto mt-4 max-w-md text-xs text-muted">
          Un miembro del equipo evaluará tu solicitud de forma confidencial y definirá el canal seguro
          para continuar. No compartas documentos ni información sensible por este medio.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="spx-card space-y-6 p-6 sm:p-8" noValidate>
      {status === "error" && message && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {message}
        </p>
      )}

      {/* Honeypot anti-spam (oculto) */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Nombre</Label>
          <Input id="name" name="name" autoComplete="name" required />
          <FieldError>{errors.name?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="organizationName">Organización</Label>
          <Input id="organizationName" name="organizationName" autoComplete="organization" />
          <FieldError>{errors.organizationName?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="email" required>Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError>{errors.email?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
          <FieldError>{errors.phone?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="serviceType" required>Tipo de servicio</Label>
          <Select id="serviceType" name="serviceType" required defaultValue="">
            <option value="" disabled>Selecciona…</option>
            {serviceTypes.map((t) => (
              <option key={t} value={t}>{serviceTypeLabels[t]}</option>
            ))}
          </Select>
          <FieldError>{errors.serviceType?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="urgency">Nivel de urgencia</Label>
          <Select id="urgency" name="urgency" defaultValue="NORMAL">
            {urgencies.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="country">País / Estado</Label>
          <Input id="country" name="country" />
          <FieldError>{errors.country?.[0]}</FieldError>
        </div>
        <div>
          <Label htmlFor="relationship">Tu relación con el asunto</Label>
          <Input id="relationship" name="relationship" placeholder="Ej. representante legal" />
          <FieldError>{errors.relationship?.[0]}</FieldError>
        </div>
      </div>

      <div>
        <Label htmlFor="summary" required>Descripción general del asunto</Label>
        <Textarea
          id="summary"
          name="summary"
          required
          placeholder="Describe el asunto en términos generales. No incluyas documentos ni datos altamente sensibles en esta etapa."
        />
        <FieldError>{errors.summary?.[0]}</FieldError>
      </div>

      <div className="space-y-3">
        <Checkbox
          id="authorizationConfirmed"
          name="authorizationConfirmed"
          label="Confirmo que cuento con autorización para proporcionar la información relacionada con este asunto."
        />
        <FieldError>{errors.authorizationConfirmed?.[0]}</FieldError>
        <Checkbox
          id="contactConsent"
          name="contactConsent"
          label="Doy mi consentimiento para ser contactado por SPECTRUM en relación con esta solicitud."
        />
        <FieldError>{errors.contactConsent?.[0]}</FieldError>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? "Enviando…" : "Enviar solicitud confidencial"}
        </Button>
        <p className="text-xs text-muted">Tratamos tu solicitud con discreción.</p>
      </div>
    </form>
  );
}
