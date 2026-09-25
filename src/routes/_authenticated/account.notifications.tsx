import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  accountSearchFromNotificationHref,
  useCustomerNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type CustomerNotification,
} from "@/lib/queries/notifications";
import { privatePageHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account/notifications")({
  head: () =>
    privatePageHead(
      "Notifications — TLB Enterprise",
      "Your order, quote, and account notices.",
    ),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const list = useCustomerNotifications(user?.id);
  const markOne = useMarkNotificationRead(user?.id);
  const markAll = useMarkAllNotificationsRead(user?.id);
  const unreadCount = (list.data ?? []).filter((item) => !item.readAt).length;

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/account" className="hover:text-foreground">
              Account
            </Link>
            <span aria-hidden> / </span>
            Notifications
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Order, quote, and account notices for this signed-in customer.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!unreadCount || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Mark all as read
        </Button>
      </div>

      <div className="mt-8 space-y-2">
        {list.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : list.isError ? (
          <p className="text-sm text-destructive">Could not load notifications.</p>
        ) : !list.data?.length ? (
          <p className="border border-border bg-card p-6 text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          list.data.map((item) => (
            <NotificationArticle
              key={item.id}
              item={item}
              onMark={() => markOne.mutate(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationArticle({
  item,
  onMark,
}: {
  item: CustomerNotification;
  onMark: () => void;
}) {
  const unread = !item.readAt;
  return (
    <article
      className={cn(
        "flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between",
        unread ? "border-l-4 border-l-primary" : "",
      )}
    >
      <div>
        <h2 className="text-base font-semibold">
          {item.title}
          {unread ? <span className="sr-only"> (unread)</span> : null}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleString("en-GB")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {unread ? (
          <Button type="button" variant="ghost" onClick={onMark}>
            Mark as read
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to="/account" search={accountSearchFromNotificationHref(item.href)}>
            Open
          </Link>
        </Button>
      </div>
    </article>
  );
}
