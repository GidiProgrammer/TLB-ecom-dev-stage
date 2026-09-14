/**
 * Bearer authentication for the transactional email processor HTTP endpoint.
 * Uses server-only CRON_SECRET (not LOVABLE_CRON_SECRET, not customer JWTs).
 */
export async function authenticateCronRequest(request: Request): Promise<Response | null> {
  const currentSecret = process.env["CRON_SECRET"];

  if (!currentSecret) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  const providedDigest = digest(token);
  const expectedDigest = digest(currentSecret);

  if (providedDigest.length !== expectedDigest.length || !timingSafeEqual(providedDigest, expectedDigest)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
