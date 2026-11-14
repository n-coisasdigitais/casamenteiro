import { describe, expect, it } from "vitest";
import { categoryDuplicateDraft } from "@/lib/categoryDuplicate";

describe("duplicação de categorias", () => {
  it("gera uma nova categoria sem reutilizar a identidade da original", () => {
    const original = { id: "origem", name: "Convites", slug: "convites", active: true, icon: "mail" };
    const draft = categoryDuplicateDraft(original);
    expect(draft).not.toHaveProperty("id");
    expect(draft.slug).not.toBe(original.slug);
    expect(draft.active).toBe(true);
    expect(draft.icon).toBe("mail");
    expect(original.id).toBe("origem");
  });
});