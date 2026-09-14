import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseRedirectSearch, safeInternalPath } from "@/lib/safe-redirect";
import { privatePageHead } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type AuthSearch = { redirect?: string | undefined };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect: parseRedirectSearch(search),
  }),
  head: () =>
    privatePageHead(
      "Sign in or open an account — TLB Enterprise",
      "Sign in to track orders and quotes, or open an individual or institutional account with TLB Enterprise.",
    ),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const afterAuth = safeInternalPath(search.redirect ?? "/account");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot" | "update">("auth");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    accountType: "individual",
    institutionName: "",
    institutionType: "",
  });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && mode !== "update") {
      void navigate({ href: afterAuth, replace: true });
    }
  }, [user, mode, afterAuth, navigate]);

  const goAfterAuth = () => {
    void navigate({ href: afterAuth });
  };

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(signIn);
    setBusy(false);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      return;
    }
    toast.success("Welcome back");
    goAfterAuth();
  };

  const doSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: signUp.email,
      password: signUp.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: signUp.fullName,
          phone: signUp.phone,
          account_type: signUp.accountType,
          institution_name: signUp.institutionName,
          institution_type: signUp.institutionType,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Could not create account", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Check your email", { description: "Confirm your address to activate your account." });
      return;
    }
    toast.success("Account created");
    goAfterAuth();
  };

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    setRecoverySent(true);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      toast.error("Could not update password", { description: error.message });
      return;
    }
    toast.success("Password updated");
    setMode("auth");
    goAfterAuth();
  };

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1.1fr]">
      <div className="hidden rounded-lg hero-surface p-10 text-primary-foreground lg:block">
        <FlaskConical className="h-8 w-8" />
        <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight">
          Accounts built for laboratories
        </h1>
        <ul className="mt-6 space-y-3 text-sm text-primary-foreground/85">
          <li>• Track orders and quotation requests in one dashboard</li>
          <li>• Save recurring reagent lists as reusable experiments after you sign in</li>
          <li>• Add institutional details so we can prepare quotations and invoicing</li>
          <li>• Request batch documentation when you order analytical-grade items</li>
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        {mode === "forgot" ? (
          <div>
            <h2 className="font-display text-xl font-extrabold">Reset your password</h2>
            {recoverySent ? (
              <p className="mt-4 text-sm text-muted-foreground">
                If an account exists for that email, we&apos;ll send instructions to reset your password.
              </p>
            ) : (
              <form onSubmit={requestReset} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {busy ? "Sending…" : "Send reset instructions"}
                </Button>
              </form>
            )}
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                setMode("auth");
                setRecoverySent(false);
              }}
            >
              Back to sign in
            </button>
          </div>
        ) : mode === "update" ? (
          <form onSubmit={updatePassword} className="space-y-4">
            <h2 className="font-display text-xl font-extrabold">Choose a new password</h2>
            <div>
              <Label htmlFor="new-pass">New password</Label>
              <Input
                id="new-pass"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={doSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">Email</Label>
                  <Input
                    id="si-email"
                    type="email"
                    required
                    value={signIn.email}
                    onChange={(e) => setSignIn((s) => ({ ...s, email: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="si-pass">Password</Label>
                  <Input
                    id="si-pass"
                    type="password"
                    required
                    value={signIn.password}
                    onChange={(e) => setSignIn((s) => ({ ...s, password: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={doSignUp} className="space-y-4">
                <RadioGroup
                  value={signUp.accountType}
                  onValueChange={(v) => setSignUp((s) => ({ ...s, accountType: v }))}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    ["individual", "Individual", "Ready to use after sign-up"] as const,
                    ["institutional", "Institutional", "Reviewed by our team"] as const,
                  ].map(([value, label, note]) => (
                    <Label
                      key={value}
                      htmlFor={`acct-${value}`}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
                    >
                      <RadioGroupItem id={`acct-${value}`} value={value} className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="block text-xs font-normal text-muted-foreground">{note}</span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="su-name">Full name</Label>
                    <Input
                      id="su-name"
                      required
                      value={signUp.fullName}
                      onChange={(e) => setSignUp((s) => ({ ...s, fullName: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="su-phone">Phone</Label>
                    <Input
                      id="su-phone"
                      value={signUp.phone}
                      onChange={(e) => setSignUp((s) => ({ ...s, phone: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {signUp.accountType === "institutional" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="su-inst">Institution name</Label>
                      <Input
                        id="su-inst"
                        required
                        value={signUp.institutionName}
                        onChange={(e) => setSignUp((s) => ({ ...s, institutionName: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="su-insttype">Institution type</Label>
                      <Input
                        id="su-insttype"
                        placeholder="University, hospital, industry…"
                        value={signUp.institutionType}
                        onChange={(e) => setSignUp((s) => ({ ...s, institutionType: e.target.value }))}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      required
                      value={signUp.email}
                      onChange={(e) => setSignUp((s) => ({ ...s, email: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="su-pass">Password</Label>
                    <Input
                      id="su-pass"
                      type="password"
                      required
                      minLength={6}
                      value={signUp.password}
                      onChange={(e) => setSignUp((s) => ({ ...s, password: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={busy} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {busy ? "Creating account…" : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Institutional accounts stay in review until our team verifies your organisation. You can
                  still browse and request quotes in the meantime.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our supply terms.{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Need help?
          </Link>
        </p>
      </div>
    </div>
  );
}
