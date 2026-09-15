import { MAIL_MAX_ATTEMPTS, MAIL_STALE_SENDING_MS, nextAttemptAtAfterFailure } from "./policy.ts";
import type { EnqueueTransactionalEmailInput, TransactionalOutboxRow } from "./types.ts";

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

function toRow(input: EnqueueTransactionalEmailInput, now = new Date()): TransactionalOutboxRow {
  const created = nowIso(now);
  return {
    id: newId(),
    eventKey: input.eventKey,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    recipientEmail: input.recipientEmail,
    templateId: input.templateId,
    payload: input.payload ?? {},
    deliveryStatus: "pending",
    attemptCount: 0,
    lastError: null,
    createdAt: created,
    updatedAt: created,
    nextAttemptAt: created,
    sentAt: null,
  };
}

const memoryRows = new Map<string, TransactionalOutboxRow>();
const memoryById = new Map<string, TransactionalOutboxRow>();

export function resetMemoryOutbox(): void {
  memoryRows.clear();
  memoryById.clear();
}

export function listMemoryOutbox(): TransactionalOutboxRow[] {
  return [...memoryRows.values()];
}

export function enqueueInMemory(
  input: EnqueueTransactionalEmailInput,
  now = new Date(),
): { row: TransactionalOutboxRow; created: boolean } {
  const existing = memoryRows.get(input.eventKey);
  if (existing) {
    return { row: existing, created: false };
  }
  const row = toRow(input, now);
  memoryRows.set(input.eventKey, row);
  memoryById.set(row.id, row);
  return { row, created: true };
}

function isDue(iso: string, now: Date): boolean {
  return new Date(iso).getTime() <= now.getTime();
}

function isStaleSending(row: TransactionalOutboxRow, now: Date, staleAfterMs: number): boolean {
  if (row.deliveryStatus !== "sending") return false;
  return now.getTime() - new Date(row.updatedAt).getTime() >= staleAfterMs;
}

export type ClaimOptions = {
  now?: Date;
  staleAfterMs?: number;
  maxAttempts?: number;
};

/**
 * Compare-and-swap claim for the in-memory backend. A row is taken only if it
 * is still pending+due or stale sending at the moment of this call.
 */
export function claimPendingInMemory(limit = 10, options: ClaimOptions = {}): TransactionalOutboxRow[] {
  const now = options.now ?? new Date();
  const staleAfterMs = options.staleAfterMs ?? MAIL_STALE_SENDING_MS;
  const maxAttempts = options.maxAttempts ?? MAIL_MAX_ATTEMPTS;
  const claimed: TransactionalOutboxRow[] = [];

  for (const row of memoryRows.values()) {
    if (
      row.deliveryStatus === "sending" &&
      isStaleSending(row, now, staleAfterMs) &&
      row.attemptCount >= maxAttempts
    ) {
      row.deliveryStatus = "failed";
      row.updatedAt = nowIso(now);
    }
  }


  const candidates = [...memoryRows.values()]
    .filter((row) => row.attemptCount < maxAttempts)
    .filter(
      (row) =>
        (row.deliveryStatus === "pending" && isDue(row.nextAttemptAt, now)) ||
        isStaleSending(row, now, staleAfterMs),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const row of candidates) {
    if (claimed.length >= limit) break;
    if (row.deliveryStatus === "sent" || row.deliveryStatus === "failed") continue;
    if (row.deliveryStatus === "sending" && !isStaleSending(row, now, staleAfterMs)) continue;
    if (row.deliveryStatus === "pending" && !isDue(row.nextAttemptAt, now)) continue;
    if (row.attemptCount >= maxAttempts) continue;

    row.deliveryStatus = "sending";
    row.attemptCount += 1;
    row.updatedAt = nowIso(now);
    claimed.push(row);
  }

  return claimed;
}

export function transactionalOutboxBackendKind(): "memory" | "supabase" {
  if (process.env["MAIL_OUTBOX_BACKEND"] === "memory" || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    return "memory";
  }
  return "supabase";
}

export async function enqueueTransactionalEmail(
  input: EnqueueTransactionalEmailInput,
): Promise<{ row: TransactionalOutboxRow; created: boolean }> {
  if (transactionalOutboxBackendKind() === "memory") {
    return enqueueInMemory(input);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const insert = {
    event_key: input.eventKey,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    recipient_email: input.recipientEmail,
    template_id: input.templateId,
    payload: (input.payload ?? {}) as Json,
  };

  const { data, error } = await supabaseAdmin
    .from("transactional_email_outbox")
    .insert(insert)
    .select()
    .maybeSingle();

  if (!error && data) {
    return { row: mapDbRow(data as DbOutboxRow), created: true };
  }

  const duplicate =
    error?.code === "23505" ||
    error?.message?.toLowerCase().includes("duplicate") ||
    error?.message?.toLowerCase().includes("unique");

  if (!duplicate) {
    throw new Error(error?.message ?? "Failed to enqueue transactional email");
  }

  const { data: existing, error: readError } = await supabaseAdmin
    .from("transactional_email_outbox")
    .select()
    .eq("event_key", input.eventKey)
    .maybeSingle();

  if (readError || !existing) {
    throw new Error(readError?.message ?? "Outbox event exists but could not be loaded");
  }

  return { row: mapDbRow(existing as DbOutboxRow), created: false };
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type DbOutboxRow = {
  id: string;
  event_key: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  recipient_email: string;
  template_id: string;
  payload: Json;
  delivery_status: TransactionalOutboxRow["deliveryStatus"];
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  next_attempt_at: string;
  sent_at: string | null;
};

function jsonObject(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function mapDbRow(row: DbOutboxRow): TransactionalOutboxRow {
  return {
    id: row.id,
    eventKey: row.event_key,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    recipientEmail: row.recipient_email,
    templateId: row.template_id,
    payload: jsonObject(row.payload),
    deliveryStatus: row.delivery_status,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextAttemptAt: row.next_attempt_at,
    sentAt: row.sent_at,
  };
}

export async function markOutboxSent(id: string, now = new Date()): Promise<void> {
  if (transactionalOutboxBackendKind() === "memory") {
    const row = memoryById.get(id);
    if (!row) throw new Error("Outbox row not found");
    row.deliveryStatus = "sent";
    row.sentAt = nowIso(now);
    row.updatedAt = nowIso(now);
    row.lastError = null;
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("transactional_email_outbox")
    .update({
      delivery_status: "sent",
      sent_at: nowIso(now),
      updated_at: nowIso(now),
      last_error: null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function markOutboxAttemptFailed(
  id: string,
  input: { now: Date; attemptCount: number; lastError: string; permanent: boolean },
): Promise<void> {
  const nextAttempt = input.permanent
    ? input.now.toISOString()
    : nextAttemptAtAfterFailure(input.attemptCount, input.now).toISOString();
  const status = input.permanent ? "failed" : "pending";

  if (transactionalOutboxBackendKind() === "memory") {
    const row = memoryById.get(id);
    if (!row) throw new Error("Outbox row not found");
    row.deliveryStatus = status;
    row.lastError = input.lastError;
    row.nextAttemptAt = nextAttempt;
    row.updatedAt = nowIso(input.now);
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("transactional_email_outbox")
    .update({
      delivery_status: status,
      last_error: input.lastError,
      next_attempt_at: nextAttempt,
      updated_at: nowIso(input.now),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Claim pending / stale-sending rows. Not scheduled.
 * Postgres path uses claim_transactional_email_outbox (FOR UPDATE SKIP LOCKED).
 */
export async function claimPendingTransactionalEmails(
  limit = 10,
  options: ClaimOptions = {},
): Promise<TransactionalOutboxRow[]> {
  if (transactionalOutboxBackendKind() === "memory") {
    return claimPendingInMemory(limit, options);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const staleAfterMs = options.staleAfterMs ?? MAIL_STALE_SENDING_MS;
  const maxAttempts = options.maxAttempts ?? MAIL_MAX_ATTEMPTS;
  const staleSeconds = Math.max(1, Math.floor(staleAfterMs / 1000));

  const { data, error } = await supabaseAdmin.rpc("claim_transactional_email_outbox", {
    p_limit: limit,
    p_stale_after: `${staleSeconds} seconds`,
    p_max_attempts: maxAttempts,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapDbRow(row as DbOutboxRow));
}
