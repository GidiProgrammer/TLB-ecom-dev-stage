import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { customerReturnPath } from "@/lib/safe-redirect";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: customerReturnPath(location.pathname, location.searchStr, location.hash),
        },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
