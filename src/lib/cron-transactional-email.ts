export async function runTransactionalEmailCron(request: Request): Promise<Response> {
  const { handleTransactionalEmailCron } = await import("@/server/mail/http");
  return handleTransactionalEmailCron(request);
}
