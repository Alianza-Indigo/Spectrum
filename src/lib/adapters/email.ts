import { prisma } from "@/lib/db";

/**
 * Adaptador de correo transaccional.
 *
 * - Con `EMAIL_PROVIDER=resend` y `EMAIL_API_KEY`, envía vía la API de Resend.
 * - Sin credenciales, funciona en modo autocontenido: registra el mensaje (log)
 *   para no bloquear la operación. La plataforma nunca depende del correo para
 *   funcionar.
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  organizationId?: string | null;
};

export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean; provider: string }> {
  const provider = process.env.EMAIL_PROVIDER ?? "log";
  const apiKey = process.env.EMAIL_API_KEY;

  if (provider === "resend" && apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "SPECTRUM <no-reply@spectrum.local>",
          to: message.to,
          subject: message.subject,
          text: message.text,
        }),
      });
      return { delivered: res.ok, provider: "resend" };
    } catch (err) {
      console.error("[email] fallo al enviar por Resend:", err);
      return { delivered: false, provider: "resend" };
    }
  }

  // Modo autocontenido: dejamos constancia como notificación interna.
  console.info(`[email:log] Para ${message.to} — ${message.subject}`);
  if (message.organizationId) {
    await prisma.notification
      .create({
        data: {
          organizationId: message.organizationId,
          kind: "email",
          title: message.subject,
          body: `Destinatario: ${message.to}\n\n${message.text}`,
        },
      })
      .catch(() => undefined);
  }
  return { delivered: true, provider: "log" };
}
