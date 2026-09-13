import { createServerFn } from "@tanstack/react-start";

function clientIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim() ?? "";
  return first.length > 0 ? first : null;
}

export const submitContact = createServerFn({ method: "POST" })
  .validator((data: unknown) => data)
  .handler(async ({ data }) => {
  const { mapContactError, submitContactEnquiry } = await import("@/server/mail/contact");

  let clientIp: string | null = null;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    clientIp = clientIpFromRequest(getRequest());
  } catch {
    clientIp = null;
  }

  try {
    await submitContactEnquiry(data, { clientIp });
    return { accepted: true as const };
  } catch (error) {
    throw new Error(mapContactError(error));
  }
});
