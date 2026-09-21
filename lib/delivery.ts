/**
 * Shared delivery engine for the daily cron job and the manual deliver route.
 *
 * A customer's progress lives in their Delivery rows, so this never writes a
 * position back to the Customer record. Failed sends are recorded but not
 * marked successful, which means the next run retries the same clip instead of
 * skipping past it.
 */
import { prisma } from "./prisma";
import { getNextClipsForCustomer, recordDelivery, type DeliverableClip } from "./content";
import { sendRvm } from "./textp2p";

export const DELIVERY_CUSTOMER_SELECT = {
  id: true,
  name: true,
  phone: true,
  voice: true,
  trackKey: true,
  frequency: true,
  status: true,
  trialEndsAt: true,
} as const;

export interface DeliveryCustomer {
  id: string;
  name: string;
  phone: string;
  voice: string;
  trackKey: string;
  frequency: number;
  status: string;
  trialEndsAt: Date | null;
}

export interface ClipOutcome {
  clipId: string;
  storyNumber: number;
  title: string;
  role: string;
  ok: boolean;
  dryRun: boolean;
  error?: string;
}

export interface CustomerDeliveryResult {
  customerId: string;
  name: string;
  requested: number;
  sent: number;
  /** True when the track ran out of clips before the customer's daily quota. */
  outOfContent: boolean;
  clips: ClipOutcome[];
}

function describe(clip: DeliverableClip): string {
  const base = `${clip.storyTitle}${clip.label ? ` (${clip.label})` : ""}`;
  return clip.take > 1 && !clip.label ? `${base} — take ${clip.take}` : base;
}

/**
 * Sends one customer their clips for today.
 *
 * `preview` computes what would be sent without contacting TextP2P or writing
 * any Delivery rows, which is how the sequence can be inspected safely.
 */
export async function deliverToCustomer(
  customer: DeliveryCustomer,
  options: { preview?: boolean; now?: Date } = {},
): Promise<CustomerDeliveryResult> {
  const now = options.now ?? new Date();
  const requested = Math.max(1, customer.frequency);
  const clips = await getNextClipsForCustomer(customer, requested, now);

  const outcomes: ClipOutcome[] = [];

  for (const clip of clips) {
    if (options.preview) {
      outcomes.push({
        clipId: clip.clipId,
        storyNumber: clip.storyNumber,
        title: describe(clip),
        role: clip.role,
        ok: true,
        dryRun: true,
      });
      continue;
    }

    const result = await sendRvm(customer.phone, clip.audioUrl);

    await recordDelivery({
      customerId: customer.id,
      clipId: clip.clipId,
      voice: customer.voice,
      audioUrl: clip.audioUrl,
      ok: result.ok,
      providerStatus: result.status,
      error: result.error,
      sentAt: now,
    });

    outcomes.push({
      clipId: clip.clipId,
      storyNumber: clip.storyNumber,
      title: describe(clip),
      role: clip.role,
      ok: result.ok,
      dryRun: result.dryRun,
      error: result.error,
    });

    // Stop on the first failure rather than working through the rest of the
    // day's quota against what is probably a provider-wide problem.
    if (!result.ok) break;
  }

  const sent = outcomes.filter((outcome) => outcome.ok).length;

  if (!options.preview && sent > 0) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastDeliveredAt: now },
    });
  }

  if (clips.length < requested) {
    console.warn(
      `[delivery] ${customer.name} (${customer.id}) is out of content on track "${customer.trackKey}": wanted ${requested}, found ${clips.length}`,
    );
  }

  return {
    customerId: customer.id,
    name: customer.name,
    requested,
    sent,
    outOfContent: clips.length < requested,
    clips: outcomes,
  };
}

/** Every customer eligible for a delivery run. */
export async function findDeliverableCustomers(): Promise<DeliveryCustomer[]> {
  return prisma.customer.findMany({
    where: { status: { in: ["trial", "active"] }, optedOut: false },
    select: DELIVERY_CUSTOMER_SELECT,
  });
}

export interface RunSummary {
  customers: number;
  clipsSent: number;
  outOfContent: string[];
  failures: string[];
  results: CustomerDeliveryResult[];
}

export async function deliverToAll(
  options: { preview?: boolean; now?: Date } = {},
): Promise<RunSummary> {
  const customers = await findDeliverableCustomers();
  const results: CustomerDeliveryResult[] = [];

  for (const customer of customers) {
    results.push(await deliverToCustomer(customer, options));
  }

  return {
    customers: results.length,
    clipsSent: results.reduce((total, result) => total + result.sent, 0),
    outOfContent: results.filter((r) => r.outOfContent).map((r) => r.name),
    failures: results
      .filter((r) => r.clips.some((clip) => !clip.ok))
      .map((r) => r.name),
    results,
  };
}
