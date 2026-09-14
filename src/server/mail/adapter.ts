import { captureMailDriver } from "./capture-driver.ts";
import { resendMailDriver } from "./resend-driver.ts";
import { MailProviderError, type MailDriver, type SendTransactionalEmailInput, type SentTransactionalEmail } from "./types.ts";

export function resolveMailDriver(): MailDriver {
  const requested = process.env["MAIL_DRIVER"]?.trim().toLowerCase();
  if (!requested || requested === "capture") {
    return captureMailDriver;
  }
  if (requested === "resend") {
    return resendMailDriver;
  }
  throw new MailProviderError(
    `Unknown MAIL_DRIVER "${requested}". Use MAIL_DRIVER=capture or MAIL_DRIVER=resend.`,
    { retryable: false },
  );
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SentTransactionalEmail> {
  const driver = resolveMailDriver();
  return driver.send(input);
}
