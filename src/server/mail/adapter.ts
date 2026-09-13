import { captureMailDriver } from "./capture-driver.ts";
import type { MailDriver, SendTransactionalEmailInput, SentTransactionalEmail } from "./types.ts";

function resolveDriver(): MailDriver {
  const requested = process.env["MAIL_DRIVER"]?.trim().toLowerCase();
  if (!requested || requested === "capture") {
    return captureMailDriver;
  }
  // Production providers are not implemented in Phase 1. Never send real mail.
  throw new Error(`Mail driver "${requested}" is not available. Use MAIL_DRIVER=capture.`);
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SentTransactionalEmail> {
  const driver = resolveDriver();
  return driver.send(input);
}
