import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const UpdateClipSchema = z.object({
  secret: z.string().optional(),
  status: z.enum(["draft", "live", "retired"]).optional(),
  role: z.enum(["story", "welcome", "trialEnd", "chargeStart"]).optional(),
  label: z.string().max(80).nullish(),
  /** Renames the parent story, since the title is shared by all of its takes. */
  title: z.string().min(1).max(200).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const auth = requireAdmin(req, (body as { secret?: string }).secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = UpdateClipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((issue) => issue.message).join("; ") },
      { status: 400 },
    );
  }

  const existing = await prisma.clip.findUnique({ where: { id }, select: { storyId: true } });
  if (!existing) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  const { status, role, label, title } = parsed.data;

  if (title) {
    await prisma.story.update({ where: { id: existing.storyId }, data: { title } });
  }

  const clip = await prisma.clip.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(label !== undefined ? { label: label ?? null } : {}),
    },
    include: { story: { select: { title: true, storyNumber: true, testament: true } } },
  });

  return NextResponse.json({ ok: true, clip });
}

/**
 * Removes a clip. Refuses once the clip has actually been delivered, since
 * deleting it would drop that history from the audit log.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const clip = await prisma.clip.findUnique({
    where: { id },
    include: { _count: { select: { deliveries: true } } },
  });
  if (!clip) {
    return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  }

  if (clip._count.deliveries > 0) {
    return NextResponse.json(
      {
        error: `This clip has already been delivered ${clip._count.deliveries} time(s). Retire it instead of deleting it.`,
      },
      { status: 409 },
    );
  }

  await prisma.clip.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
