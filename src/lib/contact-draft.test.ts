import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { contactSeedFromProfile, resolveCommerceContact } from "./contact-draft.ts";

const fallback = {
  name: "",
  email: "",
  phone: "",
  institution: "",
  address: "",
  city: "",
  notes: "",
};

describe("resolveCommerceContact", () => {
  test("empty draft is filled from the profile", () => {
    const seed = contactSeedFromProfile(
      { full_name: "Ama Mensah", phone: "0244000000" },
      "ama@example.test",
    );
    assert.deepEqual(resolveCommerceContact(null, seed, fallback), {
      ...fallback,
      name: "Ama Mensah",
      email: "ama@example.test",
      phone: "0244000000",
    });
  });

  test("an existing draft is returned unchanged, including blank fields", () => {
    const stored = {
      ...fallback,
      name: "Draft Person",
      email: "",
      phone: "0200000000",
      address: "1 Draft Road",
    };
    const seed = contactSeedFromProfile(
      { full_name: "Ama Mensah", phone: "0244000000" },
      "ama@example.test",
    );
    assert.equal(resolveCommerceContact(stored, seed, fallback), stored);
    assert.equal(stored.email, "");
    assert.equal(stored.address, "1 Draft Road");
  });

  test("typed contact fields are not replaced when there is no stored draft", () => {
    const seed = contactSeedFromProfile(
      { full_name: "Ama Mensah", phone: "0244000000" },
      "ama@example.test",
    );
    const typed = { ...fallback, name: "Typed Name", email: "typed@example.test" };
    assert.deepEqual(resolveCommerceContact(null, seed, typed), {
      ...typed,
      phone: "0244000000",
    });
  });
});
