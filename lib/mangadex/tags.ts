import { mdGet } from "./client";
import { localized } from "./manga";
import type { MdEntity, Tag } from "./types";

/** Fetch the full MangaDex tag list (genres, themes, formats, content). */
export async function getTags(): Promise<Tag[]> {
  const res = await mdGet<{ data: MdEntity[] }>("/manga/tag");
  return res.data
    .map<Tag>((t) => ({
      id: t.id,
      name: localized(t.attributes?.name) ?? t.id,
      group: (t.attributes?.group as string) ?? "other",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
