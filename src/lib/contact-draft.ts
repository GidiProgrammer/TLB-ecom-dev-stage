export type ContactSeed = {
  name: string;
  email: string;
  phone: string;
};

export function contactSeedFromProfile(
  profile: { full_name: string | null; phone: string | null } | null | undefined,
  email: string | null | undefined,
): ContactSeed {
  return {
    name: profile?.full_name?.trim() ?? "",
    email: email?.trim() ?? "",
    phone: profile?.phone?.trim() ?? "",
  };
}

export function mergeEmptyContact<T extends ContactSeed>(current: T, seed: ContactSeed): T {
  return {
    ...current,
    name: current.name || seed.name,
    email: current.email || seed.email,
    phone: current.phone || seed.phone,
  };
}

/**
 * A stored draft is returned unchanged, including blank fields the customer cleared.
 * Profile values fill only a missing draft.
 */
export function resolveCommerceContact<T extends ContactSeed>(
  stored: T | null,
  seed: ContactSeed,
  fallback: T,
): T {
  if (stored) return stored;
  return mergeEmptyContact(fallback, seed);
}
