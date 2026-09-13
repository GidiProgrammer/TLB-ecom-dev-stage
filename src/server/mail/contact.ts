import { createHash } from "node:crypto";
import { z } from "zod";
import { transactionalEventKey } from "./events.ts";
import { enqueueTransactionalEmail } from "./outbox.ts";
import type { EnqueueTransactionalEmailInput, TransactionalOutboxRow } from "./types.ts";

export const CONTACT_SUBMITTED_TEMPLATE_ID = "contact-submitted";
export const CONTACT_RATE_LIMIT_MAX = 5;
export const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_BUCKETS = 5000;
const CONTACT_IP_RATE_LIMIT_MAX = 20;

const noControlChars = (value: string) => !/[\r\n\0]/.test(value);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .refine(noControlChars, { message: "Invalid characters" })
    .transform((value) => (value.length === 0 ? undefined : value));

export const contactInputSchema = z.object({
  name: z
    .string()
    .max(200)
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Required").max(200))
    .refine(noControlChars, { message: "Invalid characters" }),
  email: z
    .string()
    .max(200)
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Required").email().max(200))
    .refine(noControlChars, { message: "Invalid characters" }),
  phone: optionalTrimmed(50).optional(),
  institution: optionalTrimmed(200).optional(),
  message: z
    .string()
    .max(2000)
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Required").max(2000))
    .refine(noControlChars, { message: "Invalid characters" }),
  website: z.string().max(200).optional(),
});

export type ParsedContactInput = z.infer<typeof contactInputSchema>;

export class ContactValidationError extends Error {
  constructor(message = "Please check the form and try again.") {
    super(message);
    this.name = "ContactValidationError";
  }
}

export class ContactRateLimitError extends Error {
  constructor(message = "Too many messages. Please wait and try again.") {
    super(message);
    this.name = "ContactRateLimitError";
  }
}

export class ContactConfigError extends Error {
  constructor(message = "Contact form is temporarily unavailable.") {
    super(message);
    this.name = "ContactConfigError";
  }
}

export function parseContactInput(data: unknown): ParsedContactInput {
  const parsed = contactInputSchema.safeParse(data);
  if (!parsed.success) {
    throw new ContactValidationError();
  }
  return parsed.data;
}

const rateBuckets = new Map<string, number[]>();

export function resetContactRateLimit(): void {
  rateBuckets.clear();
}

function pruneRateBuckets(now: number): void {
  for (const [key, stamps] of rateBuckets) {
    const kept = stamps.filter((stamp) => now - stamp < CONTACT_RATE_LIMIT_WINDOW_MS);
    if (kept.length === 0) rateBuckets.delete(key);
    else rateBuckets.set(key, kept);
  }
  while (rateBuckets.size > CONTACT_RATE_LIMIT_MAX_BUCKETS) {
    const oldest = rateBuckets.keys().next().value;
    if (oldest === undefined) break;
    rateBuckets.delete(oldest);
  }
}

function consumeRateLimit(key: string, max: number, now: number): boolean {
  pruneRateBuckets(now);
  const stamps = (rateBuckets.get(key) ?? []).filter((stamp) => now - stamp < CONTACT_RATE_LIMIT_WINDOW_MS);
  if (stamps.length >= max) {
    rateBuckets.set(key, stamps);
    return false;
  }
  stamps.push(now);
  rateBuckets.set(key, stamps);
  return true;
}

function emailBucketKey(email: string): string {
  return `email:${createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 24)}`;
}

function ipBucketKey(ip: string): string {
  return `ip:${createHash("sha256").update(ip).digest("hex").slice(0, 24)}`;
}

const staffEmailSchema = z.string().trim().email().max(200).refine(noControlChars);

export function staffContactRecipient(): string {
  const raw = process.env["CONTACT_RECIPIENT_EMAIL"];
  if (raw === undefined || raw.trim() === "") {
    throw new ContactConfigError();
  }
  const parsed = staffEmailSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ContactConfigError();
  }
  return parsed.data;
}

export function mapContactError(error: unknown): string {
  if (error instanceof ContactValidationError) return error.message;
  if (error instanceof ContactRateLimitError) return error.message;
  if (error instanceof ContactConfigError) return error.message;
  return "Could not submit your message. Please try again or call us.";
}

export type SubmitContactOptions = {
  clientIp?: string | null;
  now?: Date;
  enquiryId?: string;
  enqueue?: (input: EnqueueTransactionalEmailInput) => Promise<{ row: TransactionalOutboxRow; created: boolean }>;
};

export type SubmitContactResult = {
  accepted: true;
  enquiryId: string;
};

/**
 * Validate, rate-limit, then enqueue contact.submitted.
 * Success means the enquiry is in the outbox pipeline, not that email was delivered.
 */
export async function submitContactEnquiry(
  data: unknown,
  options: SubmitContactOptions = {},
): Promise<SubmitContactResult> {
  const parsed = parseContactInput(data);

  if (parsed.website !== undefined && parsed.website.trim() !== "") {
    throw new ContactValidationError("Could not submit your message. Please try again or call us.");
  }

  const recipientEmail = staffContactRecipient();

  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  if (!consumeRateLimit(emailBucketKey(parsed.email), CONTACT_RATE_LIMIT_MAX, nowMs)) {
    throw new ContactRateLimitError();
  }
  const ip = options.clientIp?.trim();
  if (ip && !consumeRateLimit(ipBucketKey(ip), CONTACT_IP_RATE_LIMIT_MAX, nowMs)) {
    throw new ContactRateLimitError();
  }
  const enquiryId = options.enquiryId ?? crypto.randomUUID();

  const payload: Record<string, unknown> = {
    enquiryId,
    name: parsed.name,
    email: parsed.email,
    message: parsed.message,
    replyTo: parsed.email,
  };
  if (parsed.phone) payload["phone"] = parsed.phone;
  if (parsed.institution) payload["institution"] = parsed.institution;

  const input: EnqueueTransactionalEmailInput = {
    eventKey: transactionalEventKey("contact.submitted", enquiryId),
    eventType: "contact.submitted",
    entityType: "contact",
    entityId: enquiryId,
    recipientEmail,
    templateId: CONTACT_SUBMITTED_TEMPLATE_ID,
    payload,
  };

  try {
    const enqueue = options.enqueue ?? enqueueTransactionalEmail;
    await enqueue(input);
  } catch (error) {
    console.error("[contact] enqueue failed", enquiryId);
    throw new Error("Could not submit your message. Please try again or call us.");
  }

  return { accepted: true, enquiryId };
}
