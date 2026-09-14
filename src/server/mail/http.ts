import { authenticateCronRequest } from "./cron-auth.ts";
import { processTransactionalEmailOutbox, type ProcessOutboxResult } from "./processor.ts";

const PROCESSOR_BATCH_SIZE = 10;

export type TransactionalEmailCronOptions = {
  process?: () => Promise<ProcessOutboxResult>;
};

/**
 * Protected HTTP entry for Vercel Cron. Batch size is fixed; query params are ignored.
 */
export async function handleTransactionalEmailCron(
  request: Request,
  options: TransactionalEmailCronOptions = {},
): Promise<Response> {
  const denied = await authenticateCronRequest(request);
  if (denied) return denied;

  const process = options.process ?? (() => processTransactionalEmailOutbox({ limit: PROCESSOR_BATCH_SIZE }));
  const result = await process();

  return Response.json(
    {
      claimed: result.claimed,
      sent: result.sent,
      retryScheduled: result.retryScheduled,
      permanentlyFailed: result.permanentlyFailed,
    },
    { status: 200 },
  );
}
