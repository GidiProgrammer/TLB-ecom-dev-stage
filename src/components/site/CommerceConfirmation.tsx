import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmationMissing({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild className="min-h-11">
          <Link to="/account">Go to your account</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    </div>
  );
}

export function ConfirmationFound({
  heading,
  accountLabel,
  accountSearch,
  children,
}: {
  heading: string;
  accountLabel: string;
  accountSearch: { tab: "orders" | "quotes"; ref: string };
  children: ReactNode;
}) {
  return (
    <div className="container-page py-12">
      <h1 className="text-center text-2xl font-semibold tracking-tight">{heading}</h1>
      <div className="mx-auto mt-8 max-w-3xl rounded-lg border border-border bg-card">{children}</div>
      <div className="mt-6 flex justify-center">
        <Button asChild className="min-h-11">
          <Link to="/account" search={accountSearch}>
            {accountLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
