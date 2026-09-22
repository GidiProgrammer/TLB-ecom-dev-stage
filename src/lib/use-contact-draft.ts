import { useEffect, useRef, useState } from "react";
import { contactSeedFromProfile, mergeEmptyContact } from "@/lib/contact-draft";
import { hasFormDraft, readFormDraft, writeFormDraft } from "@/lib/form-draft";

type ContactFields = {
  name: string;
  email: string;
  phone: string;
};

type ContactSource = {
  authLoading: boolean;
  profile: { full_name: string | null; phone: string | null } | null | undefined;
  profileLoading: boolean;
  email: string | undefined;
};

export function usePreservedContactForm<T extends Record<string, string> & ContactFields>(
  key: string,
  fallback: T,
  source: ContactSource,
): [T, (value: T | ((current: T) => T)) => void] {
  const fallbackRef = useRef(fallback);
  const draftLocked = useRef(false);
  const decided = useRef(false);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(fallback);

  useEffect(() => {
    if (hasFormDraft(key)) {
      draftLocked.current = true;
      setForm(readFormDraft(key, fallbackRef.current));
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    if (draftLocked.current) {
      writeFormDraft(key, form);
      return;
    }
    if (!decided.current) {
      if (source.authLoading) return;
      if (source.email && source.profileLoading) return;
      decided.current = true;
      const seed = contactSeedFromProfile(source.profile, source.email);
      setForm((current) => {
        const next = mergeEmptyContact(current, seed);
        if (next.name === current.name && next.email === current.email && next.phone === current.phone) {
          return current;
        }
        return next;
      });
      return;
    }
    writeFormDraft(key, form);
  }, [ready, form, key, source.authLoading, source.profile, source.profileLoading, source.email]);

  return [form, setForm];
}
