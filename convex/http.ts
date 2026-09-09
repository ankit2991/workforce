/**
 * HTTP Actions — Seamless Wallet callback endpoints for the iGaming provider.
 *
 * The provider will POST to these URLs in real-time during gameplay:
 *
 *   POST https://enchanted-oriole-185.convex.site/igaming/balance
 *   POST https://enchanted-oriole-185.convex.site/igaming/debit
 *   POST https://enchanted-oriole-185.convex.site/igaming/credit
 *   POST https://enchanted-oriole-185.convex.site/igaming/rollback
 *
 * ── Request format (adapt to your provider's actual spec) ────────────────────
 * Each request body is JSON with at minimum:
 *   { "token": "<session_token>", "transactionId": "...", "amount": 10.00, "currency": "MYR" }
 *
 * ── Signature verification ────────────────────────────────────────────────────
 * Replace verifySignature() below with your provider's actual HMAC scheme.
 * Common patterns:
 *   - X-Signature: HMAC-SHA256(body, callbackSecret)
 *   - Authorization: Bearer <apiKey>
 *   - MD5(operatorId + transactionId + amount + callbackSecret)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// ── CORS helper ───────────────────────────────────────────────────────────────

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Signature",
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(corsHeaders()), "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ error: code, message }, status);
}

// ── Signature verification ────────────────────────────────────────────────────
// TODO: replace this stub with your provider's actual signing scheme.
// Return true to allow, false to reject.
async function verifySignature(
  _req: Request,
  _body: string,
  _callbackSecret: string,
): Promise<boolean> {
  // EXAMPLE for HMAC-SHA256 in X-Signature header:
  //
  // const sig = req.headers.get("X-Signature") ?? "";
  // const key = await crypto.subtle.importKey(
  //   "raw", new TextEncoder().encode(callbackSecret),
  //   { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  // );
  // const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  // const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, "0")).join("");
  // return sig === expected;

  // ⚠️  Stub — always passes until you implement the above.
  return true;
}

// ── Extract session token from request ───────────────────────────────────────
// Providers typically send the token in the JSON body as "token" or "sessionToken".
// Adjust the field names to match your provider's spec.
function extractToken(body: Record<string, unknown>): string | null {
  return (body.token ?? body.sessionToken ?? body.session_token ?? null) as string | null;
}

// ── OPTIONS (pre-flight) ──────────────────────────────────────────────────────

const handleOptions = httpAction(async () => {
  return new Response(null, { status: 204, headers: corsHeaders() });
});

// ── BALANCE ───────────────────────────────────────────────────────────────────

const handleBalance = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return errorResponse("INVALID_JSON", "Body must be JSON"); }

  const token = extractToken(body);
  if (!token) return errorResponse("MISSING_TOKEN", "token is required");

  // Signature check — needs callbackSecret from provider config
  // We pass an empty string here; in production fetch the config and pass the real secret.
  const valid = await verifySignature(req, rawBody, "");
  if (!valid) return errorResponse("UNAUTHORIZED", "Invalid signature", 401);

  try {
    const result: { balance: number; currency: string } = await ctx.runMutation(internal.igamingProvider.handleBalance, {
      token,
      rawPayload: rawBody,
    });
    // Adapt the response shape to your provider's expected format.
    // Common formats:
    //   { "balance": 100.00, "currency": "MYR" }
    //   { "status": "OK", "balance": 10000 }  ← some providers use integer cents
    return jsonResponse({ status: "OK", balance: result.balance, currency: result.currency });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("PROCESSING_ERROR", msg, 422);
  }
});

// ── DEBIT ─────────────────────────────────────────────────────────────────────

const handleDebit = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return errorResponse("INVALID_JSON", "Body must be JSON"); }

  const token = extractToken(body);
  if (!token) return errorResponse("MISSING_TOKEN", "token is required");

  // Adapt these field names to your provider's spec
  const transactionId = (body.transactionId ?? body.transaction_id ?? body.txId) as string | undefined;
  const roundId       = (body.roundId ?? body.round_id ?? body.betId) as string | undefined;
  const amount        = Number(body.amount ?? body.bet_amount ?? 0);
  const currency      = (body.currency ?? "MYR") as string;

  if (!transactionId) return errorResponse("MISSING_TRANSACTION_ID", "transactionId is required");
  if (!amount || amount <= 0) return errorResponse("INVALID_AMOUNT", "amount must be positive");

  const valid = await verifySignature(req, rawBody, "");
  if (!valid) return errorResponse("UNAUTHORIZED", "Invalid signature", 401);

  try {
    const result: { balance: number; currency: string; transactionId: string } = await ctx.runMutation(internal.igamingProvider.handleDebit, {
      token,
      transactionId,
      roundId,
      amount,
      currency,
      rawPayload: rawBody,
    });
    return jsonResponse({ status: "OK", balance: result.balance, currency: result.currency, transactionId: result.transactionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Insufficient")) return errorResponse("INSUFFICIENT_FUNDS", msg, 422);
    return errorResponse("PROCESSING_ERROR", msg, 422);
  }
});

// ── CREDIT ────────────────────────────────────────────────────────────────────

const handleCredit = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return errorResponse("INVALID_JSON", "Body must be JSON"); }

  const token = extractToken(body);
  if (!token) return errorResponse("MISSING_TOKEN", "token is required");

  const transactionId = (body.transactionId ?? body.transaction_id ?? body.txId) as string | undefined;
  const roundId       = (body.roundId ?? body.round_id) as string | undefined;
  const amount        = Number(body.amount ?? body.win_amount ?? 0);
  const currency      = (body.currency ?? "MYR") as string;
  // Providers usually send a "type" field: "win" | "bonus" | "refund"
  const rawType       = (body.type ?? body.transaction_type ?? "win") as string;
  const type = (["win", "bonus", "refund"].includes(rawType) ? rawType : "win") as "win" | "bonus" | "refund";

  if (!transactionId) return errorResponse("MISSING_TRANSACTION_ID", "transactionId is required");
  if (amount < 0) return errorResponse("INVALID_AMOUNT", "amount must be non-negative");

  const valid = await verifySignature(req, rawBody, "");
  if (!valid) return errorResponse("UNAUTHORIZED", "Invalid signature", 401);

  try {
    const result: { balance: number; currency: string; transactionId: string } = await ctx.runMutation(internal.igamingProvider.handleCredit, {
      token,
      transactionId,
      roundId,
      amount,
      currency,
      type,
      rawPayload: rawBody,
    });
    return jsonResponse({ status: "OK", balance: result.balance, currency: result.currency, transactionId: result.transactionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("PROCESSING_ERROR", msg, 422);
  }
});

// ── ROLLBACK ──────────────────────────────────────────────────────────────────

const handleRollback = httpAction(async (ctx, req) => {
  const rawBody = await req.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody); } catch { return errorResponse("INVALID_JSON", "Body must be JSON"); }

  const token = extractToken(body);
  if (!token) return errorResponse("MISSING_TOKEN", "token is required");

  const transactionId         = (body.transactionId ?? body.transaction_id) as string | undefined;
  const originalTransactionId = (body.originalTransactionId ?? body.original_transaction_id ?? body.refTransactionId) as string | undefined;

  if (!transactionId || !originalTransactionId) {
    return errorResponse("MISSING_FIELDS", "transactionId and originalTransactionId are required");
  }

  const valid = await verifySignature(req, rawBody, "");
  if (!valid) return errorResponse("UNAUTHORIZED", "Invalid signature", 401);

  try {
    const result: { balance: number; currency: string; transactionId: string } = await ctx.runMutation(internal.igamingProvider.handleRollback, {
      token,
      transactionId,
      originalTransactionId,
      rawPayload: rawBody,
    });
    return jsonResponse({ status: "OK", balance: result.balance, currency: result.currency, transactionId: result.transactionId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("PROCESSING_ERROR", msg, 422);
  }
});

// ── Demo game (placeholder until provider config is set) ──────────────────────

const handleDemo = httpAction(async (_ctx, req) => {
  const url = new URL(req.url);
  const game = url.searchParams.get("game") ?? "Demo Game";
  const token = url.searchParams.get("token") ?? "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${game} — Demo</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; }
    body { font-family: system-ui, sans-serif; background: #0f0f1a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; text-align: center; }
    .card { background: #1a1a2e; border: 1px solid #7c3aed; border-radius: 1.5rem; padding: 2.5rem; max-width: 420px; width: 100%; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #c084fc; }
    p { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin: 0.75rem 0; }
    .badge { display: inline-block; background: #7c3aed22; border: 1px solid #7c3aed; border-radius: 0.5rem; padding: 0.25rem 0.75rem; font-size: 0.75rem; color: #c084fc; margin: 1rem 0; }
    .token { font-family: monospace; font-size: 0.7rem; color: #64748b; word-break: break-all; background: #0f0f1a; padding: 0.5rem; border-radius: 0.5rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎮 ${game}</h1>
    <span class="badge">SANDBOX MODE</span>
    <p>This is a placeholder game frame.<br/>
    Configure your real iGaming provider in the <strong>Admin → iGaming → Provider Config</strong> panel and this will be replaced with the live game.</p>
    <p>Your seamless wallet endpoints are ready at:</p>
    <div style="text-align:left;font-size:0.75rem;color:#a78bfa;line-height:2">
      POST /igaming/balance<br/>
      POST /igaming/debit<br/>
      POST /igaming/credit<br/>
      POST /igaming/rollback
    </div>
    <div class="token">Session token: ${token}</div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// ── Register routes ───────────────────────────────────────────────────────────

http.route({ path: "/igaming/balance",  method: "POST",    handler: handleBalance  });
http.route({ path: "/igaming/debit",    method: "POST",    handler: handleDebit    });
http.route({ path: "/igaming/credit",   method: "POST",    handler: handleCredit   });
http.route({ path: "/igaming/rollback", method: "POST",    handler: handleRollback });
http.route({ path: "/igaming/demo",     method: "GET",     handler: handleDemo     });

// Pre-flight OPTIONS for all igaming routes
http.route({ path: "/igaming/balance",  method: "OPTIONS", handler: handleOptions  });
http.route({ path: "/igaming/debit",    method: "OPTIONS", handler: handleOptions  });
http.route({ path: "/igaming/credit",   method: "OPTIONS", handler: handleOptions  });
http.route({ path: "/igaming/rollback", method: "OPTIONS", handler: handleOptions  });

export default http;
