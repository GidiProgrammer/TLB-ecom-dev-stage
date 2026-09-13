export { sendTransactionalEmail } from "./adapter.ts";
export { captureMailDriver, getCapturedEmails, resetCapturedEmails } from "./capture-driver.ts";
export {
  claimPendingTransactionalEmails,
  enqueueInMemory,
  enqueueTransactionalEmail,
  listMemoryOutbox,
  resetMemoryOutbox,
} from "./outbox.ts";
export { processTransactionalEmailOutbox } from "./processor.ts";
export {
  MAIL_MAX_ATTEMPTS,
  MAIL_STALE_SENDING_MS,
  backoffMsAfterAttempt,
  nextAttemptAtAfterFailure,
} from "./policy.ts";
export {
  enqueueOrderCreatedFromRecord,
  enqueueOrderLifecycleFromTransition,
  enqueueProfileApprovalFromTransition,
  enqueueQuoteCreatedFromRecord,
  enqueueQuoteLifecycleFromTransition,
  notifyAfterCommerceCommit,
} from "./commerce.ts";
export { TRANSACTIONAL_EVENT_TYPES, transactionalEventKey } from "./events.ts";
export {
  CONTACT_RATE_LIMIT_MAX,
  CONTACT_SUBMITTED_TEMPLATE_ID,
  parseContactInput,
  resetContactRateLimit,
  submitContactEnquiry,
} from "./contact.ts";
