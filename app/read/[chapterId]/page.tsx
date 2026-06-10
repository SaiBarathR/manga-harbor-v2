import { Reader } from "@/components/reader/reader";

export default async function ReadPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  // Key by chapterId so navigating between chapters remounts the reader,
  // resetting page/scroll state cleanly without effect-driven setState.
  return <Reader key={chapterId} chapterId={chapterId} />;
}
