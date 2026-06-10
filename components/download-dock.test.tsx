import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DownloadDock } from "./download-dock";
import { useDownloadQueue, type DownloadJob } from "@/lib/store/download-queue";

function job(overrides: Partial<DownloadJob>): DownloadJob {
  return {
    id: Math.random().toString(),
    mangaId: "m",
    mangaTitle: "Test Manga",
    coverUrl: null,
    kind: "chapter",
    label: "Chapter 1",
    fileName: "a.cbz",
    chapters: [],
    status: "queued",
    pagesDone: 0,
    pagesTotal: 0,
    bytes: 0,
    ...overrides,
  };
}

describe("DownloadDock", () => {
  beforeEach(() => useDownloadQueue.setState({ jobs: [] }));
  afterEach(() => cleanup());

  it("renders nothing when the queue is empty", () => {
    const { container } = render(<DownloadDock />);
    expect(container.firstChild).toBeNull();
  });

  it("shows active progress, completed, and error states", () => {
    useDownloadQueue.setState({
      jobs: [
        job({ status: "active", pagesDone: 5, pagesTotal: 10, bytes: 1024 }),
        job({ label: "Chapter 2", status: "done", bytes: 2048 }),
        job({ label: "Chapter 3", status: "error", error: "Boom" }),
      ],
    });
    render(<DownloadDock />);

    expect(screen.getByText("Downloads")).toBeInTheDocument();
    expect(screen.getByText(/5\/10 pages/)).toBeInTheDocument();
    expect(screen.getByText(/saved/)).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });
});
