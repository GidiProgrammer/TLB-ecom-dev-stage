export type TransactionalEmailData = Record<string, unknown>;

export type SendTransactionalEmailInput = {
  to: string;
  /** Untrusted customer address for staff replies. Never used as From or `to`. */
  replyTo?: string;
  subject: string;
  templateId: string;
  data: TransactionalEmailData;
  idempotencyKey: string;
};

export type SentTransactionalEmail = SendTransactionalEmailInput & {
  capturedAt: string;
  delivered: boolean;
};

export type MailDriver = {
  name: string;
  send: (input: SendTransactionalEmailInput) => Promise<SentTransactionalEmail>;
};

export type TransactionalEmailStatus = "pending" | "sending" | "sent" | "failed";

export type TransactionalOutboxRow = {
  id: string;
  eventKey: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  templateId: string;
  payload: TransactionalEmailData;
  deliveryStatus: TransactionalEmailStatus;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  sentAt: string | null;
};

export type EnqueueTransactionalEmailInput = {
  eventKey: string;
  eventType: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  templateId: string;
  payload?: TransactionalEmailData;
};
