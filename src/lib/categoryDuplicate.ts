import { slugify } from "@/lib/slugify";

export function categoryDuplicateDraft<T extends { id?: string; name: string; slug: string }>(category: T) {
  const { id, ...draft } = category;
  const name = `${category.name} (cópia)`;
  return { ...draft, name, slug: slugify(name) };
}