import type { MailDriver, SendTransactionalEmailInput, SentTransactionalEmail } from "./types.ts";

const captured: SentTransactionalEmail[] = [];

export function getCapturedEmails(): readonly SentTransactionalEmail[] {
  return captured;
}

export function resetCapturedEmails(): void {
  captured.length = 0;
}

export const captureMailDriver: MailDriver = {
  name: "capture",
  async send(input: SendTransactionalEmailInput): Promise<SentTransactionalEmail> {
    const recorded: SentTransactionalEmail = {
      ...input,
      capturedAt: new Date().toISOString(),
      delivered: false,
    };
    captured.push(recorded);
    return recorded;
  },
};
