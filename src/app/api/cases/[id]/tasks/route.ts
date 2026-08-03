import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskPriority } from "@prisma/client";
import { authorize, ok, created, badRequest, unprocessable } from "@/lib/api";
import { AccessError, requireCaseAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/cases/:id/tasks — lista de tareas del expediente.
 * POST /api/cases/:id/tasks — crea una tarea en el expediente.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("task:read");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  try {
    await requireCaseAccess(session, id);
    const tasks = await prisma.task.findMany({
      where: { caseId: id },
      orderBy: { createdAt: "desc" },
    });
    return ok(tasks);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeUserId: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueAt: z.coerce.date().optional(),
  authorizedMethod: z.string().optional(),
  expectedEvidence: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await authorize("task:write");
  if ("error" in a) return a.error;
  const { session } = a;
  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest("Cuerpo de la solicitud no válido.");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) return unprocessable(parsed.error.flatten().fieldErrors);

  try {
    const current = await requireCaseAccess(session, id);
    const task = await prisma.task.create({
      data: {
        organizationId: current.organizationId,
        caseId: id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        assigneeUserId: parsed.data.assigneeUserId ?? null,
        priority: parsed.data.priority ?? "MEDIUM",
        dueAt: parsed.data.dueAt ?? null,
        authorizedMethod: parsed.data.authorizedMethod ?? null,
        expectedEvidence: parsed.data.expectedEvidence ?? null,
      },
    });
    return created(task);
  } catch (err) {
    if (err instanceof AccessError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    throw err;
  }
}
