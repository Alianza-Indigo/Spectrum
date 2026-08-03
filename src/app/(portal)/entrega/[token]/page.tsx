import type { Metadata } from "next";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill, DescList } from "@/components/console/ui";
import {
  resolveDeliveryByToken,
  markDeliveryViewed,
} from "@/lib/services/delivery";
import { deliveryStatusLabels, deliveryStatusTone } from "@/lib/status";

export const metadata: Metadata = {
  title: "Entrega confidencial",
  robots: { index: false, follow: false },
};

const reasonMessages: Record<string, string> = {
  not_found: "Enlace no válido.",
  revoked: "Este acceso fue revocado.",
  expired: "Este enlace ha expirado.",
};

export default async function EntregaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await resolveDeliveryByToken(token);

  if (!res.ok) {
    return (
      <Card>
        <CardTitle>Acceso no disponible</CardTitle>
        <CardDescription>
          {reasonMessages[res.reason] ?? "Enlace no válido."}
        </CardDescription>
      </Card>
    );
  }

  await markDeliveryViewed(token);

  const { delivery } = res;
  const report = delivery.report;
  const folio = report?.case.folio;
  const title = report?.title;

  return (
    <Card className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Entrega SPECTRUM</CardTitle>
          <CardDescription>
            Documentación confidencial preparada para usted.
          </CardDescription>
        </div>
        <StatusPill
          label={deliveryStatusLabels[delivery.status]}
          tone={deliveryStatusTone[delivery.status]}
        />
      </div>

      {report ? (
        <>
          <DescList
            items={[
              { label: "Expediente", value: folio ?? "—" },
              { label: "Informe", value: title ?? "—" },
            ]}
          />

          <div>
            <ButtonLink href={`/entrega/${token}/download`}>
              Descargar informe (PDF)
            </ButtonLink>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          El informe asociado a esta entrega aún no está disponible.
        </div>
      )}

      <p className="border-t border-border/50 pt-4 text-xs text-muted">
        Uso confidencial. No compartas este enlace.
      </p>
    </Card>
  );
}
