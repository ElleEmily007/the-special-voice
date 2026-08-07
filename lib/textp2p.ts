/**
 * TextP2P Ringless Voicemail (RVM) API client.
 *
 * Docs: https://textp2p.zendesk.com/hc/en-us/articles/4417701920276-API-Send-RVM
 * Endpoint: POST https://app.textp2p.com/api-sendrvm.php
 * Params: AUTH_USERNAME, AUTH_SECRET, PHONE, AUDIOFILE, CALLERID? (optional), SENDDATE? (optional)
 *
 * IMPORTANT: TextP2P's documented RVM endpoint requires the AUDIOFILE to be a
 * publicly accessible .wav file, under 1 MB and under 1 minute long. The
 * story clips in this project are .mp3. Before going live, either confirm
 * with TextP2P that .mp3 is accepted for your account, or convert clips to
 * .wav during the audio pipeline.
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

/**
 * Sends a ringless voicemail drop to a phone number.
 * In DRY_RUN mode (default, until TEXTP2P credentials are approved and
 * DRY_RUN=false is set), this only logs the intended send and returns ok.
 */
export async function sendRvm(phone: string, audioUrl: string): Promise<SendRvmResult> {
  const dryRun = isDryRun();

  if (dryRun) {
    console.log(`[textp2p][DRY_RUN] Would send RVM to ${phone}: ${audioUrl}`);
    return { ok: true, dryRun: true };
  }

  const username = process.env.TEXTP2P_API_KEY;
  const secret = process.env.TEXTP2P_ACCOUNT_ID;

  if (!username || !secret) {
    return { ok: false, dryRun: false, error: "Missing TEXTP2P_API_KEY or TEXTP2P_ACCOUNT_ID" };
  }

  try {
    const body = new URLSearchParams({
      AUTH_USERNAME: username,
      AUTH_SECRET: secret,
      PHONE: phone,
      AUDIOFILE: audioUrl,
    });

    const res = await fetch(TEXTP2P_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, dryRun: false, status: res.status, error: text || `HTTP ${res.status}` };
    }

    return { ok: true, dryRun: false, status: res.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, dryRun: false, error: message };
  }
}
