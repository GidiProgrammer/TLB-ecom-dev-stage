/**
 * Build a PostgREST `or` filter for catalogue text search.
 * Values are double-quoted so commas, parentheses, and other filter
 * grammar characters stay inside the ilike pattern.
 */
const SEARCH_COLUMNS = ["name", "description", "sku", "slug"] as const;

export function catalogueSearchTerm(value: string): string {
  return value.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim();
}

export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function productSearchOrFilter(search: string): string | null {
  const term = catalogueSearchTerm(search);
  if (!term) return null;
  const pattern = quotePostgrestValue(`%${term}%`);
  return SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(",");
}
