import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlaskConical, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/lib/store";
import { formatGHS, productById, products } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/experiments")({
  head: () => ({
    meta: [
      { title: "My experiments — saved product lists | TLB Enterprise" },
      {
        name: "description",
        content: "Save recurring reagent and consumable lists as experiments and reorder them in one click.",
      },
      { property: "og:title", content: "My experiments — TLB Enterprise" },
      { property: "og:description", content: "Reusable laboratory product lists for fast reordering." },
    ],
  }),
  component: Experiments,
});

type ExpItem = { id: string; qty: number };

function Experiments() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { addToCart, addToQuote } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: ["experiments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["experiments", user?.id] });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("experiments")
        .insert({ user_id: user!.id, name, description: description || null, items: [] });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      toast.success("Experiment created");
      invalidate();
    },
    onError: (e: Error) => toast.error("Could not create experiment", { description: e.message }),
  });

  const saveItems = useMutation({
    mutationFn: async ({ id, items }: { id: string; items: ExpItem[] }) => {
      const { error } = await supabase
        .from("experiments")
        .update({ items: items as unknown as never, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Could not update experiment", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("experiments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Experiment deleted");
      invalidate();
    },
  });

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">My experiments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Group the reagents, glassware and consumables a protocol needs, then add the whole list to your
            cart or quote request when you need to reorder.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/account">Back to dashboard</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {list.isLoading && <p className="text-sm text-muted-foreground">Loading experiments…</p>}
          {list.data?.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-10 text-center">
              <FlaskConical className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No experiments yet — create your first saved list on the right.
              </p>
            </div>
          )}

          {list.data?.map((exp) => {
            const items = (exp.items as unknown as ExpItem[]) ?? [];
            const total = items.reduce((sum, i) => sum + (productById(i.id)?.price ?? 0) * i.qty, 0);
            return (
              <section key={exp.id} className="rounded-md border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-bold">{exp.name}</h2>
                    {exp.description && <p className="mt-1 text-xs text-muted-foreground">{exp.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={items.length === 0}
                      onClick={() => {
                        items.forEach((i) => addToCart(i.id, i.qty));
                        toast.success("Added to cart", { description: exp.name });
                      }}
                    >
                      <ShoppingCart className="h-4 w-4" /> Add all to cart
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={items.length === 0}
                      onClick={() => {
                        items.forEach((i) => addToQuote(i.id, i.qty));
                        toast.success("Added to quote request", { description: exp.name });
                      }}
                    >
                      Quote
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete experiment" onClick={() => remove.mutate(exp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <ul className="mt-4 divide-y divide-border border-y border-border">
                    {items.map((i) => {
                      const p = productById(i.id);
                      return (
                        <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                          <span className="flex-1">{p?.name ?? i.id}</span>
                          <Input
                            type="number"
                            min={1}
                            aria-label={`Quantity for ${p?.name ?? i.id}`}
                            value={i.qty}
                            onChange={(e) =>
                              saveItems.mutate({
                                id: exp.id,
                                items: items.map((it) =>
                                  it.id === i.id ? { ...it, qty: Math.max(1, Number(e.target.value) || 1) } : it,
                                ),
                              })
                            }
                            className="w-20"
                          />
                          <span className="w-28 text-right text-xs text-muted-foreground">
                            {p ? formatGHS(p.price * i.qty) : "—"}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remove item"
                            onClick={() =>
                              saveItems.mutate({ id: exp.id, items: items.filter((it) => it.id !== i.id) })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Select
                    value={pick[exp.id] ?? ""}
                    onValueChange={(v) => setPick((s) => ({ ...s, [exp.id]: v }))}
                  >
                    <SelectTrigger className="w-72">
                      <SelectValue placeholder="Add a product…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const id = pick[exp.id];
                      if (!id) return;
                      if (items.some((i) => i.id === id)) {
                        toast.info("Already in this experiment");
                        return;
                      }
                      saveItems.mutate({ id: exp.id, items: [...items, { id, qty: 1 }] });
                      setPick((s) => ({ ...s, [exp.id]: "" }));
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add item
                  </Button>
                  <span className="ml-auto font-display text-sm font-bold text-primary">
                    {formatGHS(total)}
                  </span>
                </div>
              </section>
            );
          })}
        </div>

        <aside className="h-fit space-y-4 rounded-md border border-border bg-primary-soft p-5">
          <h2 className="font-display text-base font-bold">New experiment</h2>
          <div>
            <Label htmlFor="exp-name">Name</Label>
            <Input
              id="exp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Water hardness titration"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="exp-desc">Description</Label>
            <Textarea
              id="exp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reagents and glassware for the routine weekly run"
              className="mt-1.5"
            />
          </div>
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Create experiment
          </Button>
        </aside>
      </div>
    </div>
  );
}
