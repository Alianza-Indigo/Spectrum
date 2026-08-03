import { z } from "zod";
import { authorize, created, badRequest, unprocessable, notFoundJson } from "@/lib/api";
import { orgScope } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/client-portal/requests — el cliente solicita información (RFI) sobre
 * un expediente de su organización.
 */
const schema = z.object({
  caseId: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().optional(),
});

export async function POST(request: Request) {
  const a = await authorize("portal:request");
  if ("error" in a) return a.error;
  const { session } = a;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Cuerpo de la solicitud no válido.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  const found = await prisma.case.findFirst({
    where: { id: parsed.data.caseId, ...orgScope(session) },
    select: { id: true, organizationId: true },
  });
  if (!found) return notFoundJson();

  const rfi = await prisma.requestForInformation.create({
    data: {
      organizationId: found.organizationId,
      caseId: found.id,
      title: parsed.data.title,
      detail: parsed.data.detail ?? null,
      requestedByUser: session.userId,
    },
  });

  return created(rfi);
}
