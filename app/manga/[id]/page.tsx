import { MangaDetailView } from "@/components/manga-detail-view";

export default async function MangaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MangaDetailView id={id} />;
}
