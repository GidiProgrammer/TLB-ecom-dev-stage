export function CommerceExplainer({ className }: { className?: string }) {
  return (
    <p className={className}>
      <span className="font-semibold text-foreground">Order</span>
      {" — buy from listed catalogue pricing. "}
      <span className="font-semibold text-foreground">Quote</span>
      {" — request pricing for items or quantities that need a quotation."}
    </p>
  );
}
