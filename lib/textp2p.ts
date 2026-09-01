/**
 * TextP2P Ringless Voicemail (RVM) API client.
 *
 * Docs: https://textp2p.zendesk.com/hc/en-us/articles/4417701920276-API-Send-RVM
 * Endpoint: POST https://app.textp2p.com/api-sendrvm.php
 * Params: AUTH_USERNAME, AUTH_SECRET, PHONE, AUDIOFILE, CALLERID? (optional), SENDDATE? (optional)
 *
 * Cleveribility's TextP2P account accepts public .mp3 URLs. TextP2P docs also
 * mention .wav under 1 MB and under 1 minute — keep clips within those limits.
 */

const TEXTP2P_ENDPOINT = "https://app.textp2p.com/api-sendrvm.php";

export interface SendRvmResult {
  ok: boolean;
  dryRun: boolean;
  status?: number;
  error?: string;
}

function isDryRun(): boolean {
  return process.env.DRY_RUN !== "false";
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}

/**
 * Sends a ringless voicemail drop to a phone number.
 * When DRY_RUN is not "false", logs the intended send and returns ok without calling TextP2P.
 */
export async function sendRvm(phone: string, audioUrl: string): Promise<SendRvmResult> {
  const dryRun = isDryRun();

  if (dryRun) {
    console.log(`[textp2p][DRY_RUN] Would send RVM to ${maskPhone(phone)}: ${audioUrl}`);
    return { ok: true, dryRun: true };
  }

  const username = process.env.TEXTP2P_API_KEY;
  const secret = process.env.TEXTP2P_ACCOUNT_ID;
  const callerId = process.env.TEXTP2P_CALLER_ID?.replace(/\D/g, "");

  if (!username || !secret) {
    console.error("[textp2p] Missing TEXTP2P_API_KEY or TEXTP2P_ACCOUNT_ID");
    return { ok: false, dryRun: false, error: "Missing TEXTP2P_API_KEY or TEXTP2P_ACCOUNT_ID" };
  }

  try {
    const body = new URLSearchParams({
      AUTH_USERNAME: username,
      AUTH_SECRET: secret,
      PHONE: phone,
      AUDIOFILE: audioUrl,
    });
    if (callerId) {
      body.set("CALLERID", callerId);
    }

    console.log(
      `[textp2p] Sending RVM to ${maskPhone(phone)}${callerId ? ` callerId=${callerId}` : ""}: ${audioUrl}`,
    );

    const res = await fetch(TEXTP2P_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[textp2p] RVM failed HTTP ${res.status} to ${maskPhone(phone)}: ${text || "(empty body)"}`);
      return { ok: false, dryRun: false, status: res.status, error: text || `HTTP ${res.status}` };
    }

    console.log(`[textp2p] RVM accepted HTTP ${res.status} for ${maskPhone(phone)}`);
    return { ok: true, dryRun: false, status: res.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[textp2p] RVM error for ${maskPhone(phone)}: ${message}`);
    return { ok: false, dryRun: false, error: message };
  }
}
