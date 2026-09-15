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
        <Button asChild>
          <Link to="/account">Go to your account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    </div>
  );
}

export function ConfirmationFound({
  heading,
  accountLabel,
  children,
}: {
  heading: string;
  accountLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
      <Button asChild className="mt-6">
        <Link to="/account">{accountLabel}</Link>
      </Button>
    </div>
  );
}
