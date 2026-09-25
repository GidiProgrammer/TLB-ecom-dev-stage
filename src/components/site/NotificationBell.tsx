import { Bell } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  accountSearchFromNotificationHref,
  useCustomerNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotificationCount,
  type CustomerNotification,
} from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";

function UnreadCount({ count }: { count: number }) {
  if (!count) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
      {label}
    </span>
  );
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: CustomerNotification;
  onOpen: (item: CustomerNotification) => void;
}) {
  const unread = !item.readAt;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full min-h-11 flex-col items-start gap-0.5 rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        unread ? "bg-muted/60" : "bg-transparent",
      )}
    >
      <span className={cn("font-medium", unread ? "text-foreground" : "text-muted-foreground")}>
        {item.title}
        {unread ? <span className="sr-only"> (unread)</span> : null}
      </span>
      <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
    </button>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const list = useCustomerNotifications(user?.id);
  const unread = useUnreadNotificationCount(user?.id);
  const markOne = useMarkNotificationRead(user?.id);
  const markAll = useMarkAllNotificationsRead(user?.id);

  if (!user) return null;

  const recent = (list.data ?? []).slice(0, 8);
  const unreadCount = unread.data ?? 0;

  const openItem = async (item: CustomerNotification) => {
    if (!item.readAt) {
      try {
        await markOne.mutateAsync(item.id);
      } catch {
        // Navigation still proceeds; history page can retry mark-read.
      }
    }
    navigate({
      to: "/account",
      search: accountSearchFromNotificationHref(item.href),
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 min-h-11 w-11"
          aria-label={
            unreadCount
              ? `Notifications, ${unreadCount} unread`
              : "Notifications, none unread"
          }
        >
          <Bell className="h-4 w-4" aria-hidden />
          <UnreadCount count={unreadCount} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] rounded-lg p-0 shadow-pop">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-11 px-2 text-xs"
            disabled={!unreadCount || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {list.isLoading ? (
            <div className="space-y-2 p-3" aria-busy="true">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : list.isError ? (
            <p className="px-3 py-4 text-sm text-destructive">Could not load notifications.</p>
          ) : recent.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            recent.map((item) => <NotificationRow key={item.id} item={item} onOpen={openItem} />)
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button asChild variant="outline" className="w-full">
            <Link to="/account/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
