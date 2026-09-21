/**
 * Checks the delivery sequencing end to end against the real database:
 * no repeats, correct daily quota, trial-end and charge-start injection,
 * content exhaustion, and that preview mode writes nothing.
 *
 *   npm run verify-delivery
 *
 * Creates one throwaway customer and deletes it again. Refuses to run with
 * DRY_RUN=false so it can never send a real voicemail.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { deliverToCustomer } from "../lib/delivery";
import { getRunway, getTightestSubscriberRunway } from "../lib/content";

const MARKER = "verify-delivery@example.invalid";

let failures = 0;
function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label} ${detail}`);
  }
}

async function cleanup() {
  const existing = await prisma.customer.findUnique({ where: { email: MARKER } });
  if (existing) {
    await prisma.delivery.deleteMany({ where: { customerId: existing.id } });
    await prisma.customer.delete({ where: { id: existing.id } });
  }
}

async function makeCustomer(trialEndsAt: Date | null, status: string) {
  await cleanup();
  return prisma.customer.create({
    data: {
      stripeId: `verify_${Date.now()}`,
      name: "Verify Tester",
      email: MARKER,
      phone: "5555550100",
      voice: "female",
      testament: "new",
      trackKey: "new",
      frequency: 3,
      status,
      trialEndsAt,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      voice: true,
      trackKey: true,
      frequency: true,
      status: true,
      trialEndsAt: true,
    },
  });
}

async function main() {
  if (process.env.DRY_RUN === "false") {
    throw new Error("Refusing to run with DRY_RUN=false — this would send real voicemails.");
  }

  const runway = await getRunway("new");
  console.log(`\nTrack "new": ${runway?.liveClips} sequenced live clips`);
  console.log(`  days of content: 1x=${runway?.days.once} 2x=${runway?.days.twice} 3x=${runway?.days.thrice}\n`);

  console.log("Case A — 3x/day trial customer, trial still running");
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let customer = await makeCustomer(future, "trial");

  const runA1 = await deliverToCustomer(customer);
  check("run 1 sends exactly 3 clips", runA1.sent === 3, `sent=${runA1.sent}`);
  check(
    "run 1 sends no trial-end or charge-start clip",
    runA1.clips.every((c) => c.role === "story" || c.role === "welcome"),
    runA1.clips.map((c) => c.role).join(","),
  );

  const runA2 = await deliverToCustomer(customer);
  check("run 2 sends exactly 3 clips", runA2.sent === 3, `sent=${runA2.sent}`);

  const idsA1 = runA1.clips.map((c) => c.clipId);
  const idsA2 = runA2.clips.map((c) => c.clipId);
  check(
    "run 2 repeats nothing from run 1",
    idsA2.every((id) => !idsA1.includes(id)),
    `${idsA1.join(",")} vs ${idsA2.join(",")}`,
  );

  const runA3 = await deliverToCustomer(customer);
  check("run 3 finds no content left", runA3.sent === 0, `sent=${runA3.sent}`);
  check("run 3 reports out of content", runA3.outOfContent);

  const delivered = await prisma.delivery.count({ where: { customerId: customer.id, ok: true } });
  check("6 sequenced clips delivered in total, no duplicates", delivered === 6, `count=${delivered}`);

  const tightest = await getTightestSubscriberRunway();
  check(
    "runway reports 0 days left once a subscriber is exhausted",
    tightest !== null && tightest.daysLeft === 0,
    JSON.stringify(tightest),
  );

  console.log("\nCase B — trial ends today, trial-end narration is injected");
  customer = await makeCustomer(new Date(), "trial");
  const runB = await deliverToCustomer(customer);
  check("first clip of the run is the trial-end clip", runB.clips[0]?.role === "trialEnd", runB.clips[0]?.role);
  check("still only 3 clips total", runB.sent === 3, `sent=${runB.sent}`);

  console.log("\nCase C — trial has passed and billing started, charge-start is injected");
  customer = await makeCustomer(new Date(Date.now() - 24 * 60 * 60 * 1000), "active");
  const runC = await deliverToCustomer(customer);
  check("first clip of the run is the charge-start clip", runC.clips[0]?.role === "chargeStart", runC.clips[0]?.role);

  const runC2 = await deliverToCustomer(customer);
  check(
    "charge-start is not repeated on the next run",
    runC2.clips.every((c) => c.role !== "chargeStart"),
    runC2.clips.map((c) => c.role).join(","),
  );

  console.log("\nCase D — preview mode writes nothing");
  customer = await makeCustomer(future, "trial");
  const preview1 = await deliverToCustomer(customer, { preview: true });
  const preview2 = await deliverToCustomer(customer, { preview: true });
  check("preview returns 3 clips", preview1.clips.length === 3, `${preview1.clips.length}`);
  check(
    "two previews return the same clips",
    JSON.stringify(preview1.clips.map((c) => c.clipId)) ===
      JSON.stringify(preview2.clips.map((c) => c.clipId)),
  );
  const previewRows = await prisma.delivery.count({ where: { customerId: customer.id } });
  check("preview recorded no delivery rows", previewRows === 0, `count=${previewRows}`);

  await cleanup();

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch(async (err) => {
    console.error("\nVerification error:", err);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
