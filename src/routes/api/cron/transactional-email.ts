import { createFileRoute } from "@tanstack/react-router";
import { runTransactionalEmailCron } from "@/lib/cron-transactional-email";

export const Route = createFileRoute("/api/cron/transactional-email")({
  server: {
    handlers: {
      GET: async ({ request }) => runTransactionalEmailCron(request),
      POST: async ({ request }) => runTransactionalEmailCron(request),
    },
  },
});
