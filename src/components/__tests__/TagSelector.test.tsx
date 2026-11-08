import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TagSelector } from "../TagSelector";

vi.mock("@/hooks/useTags", () => ({
  useTags: () => ({
    tags: [{ id: "research", name: "Research", color: "#E2622E" }],
    addTag: vi.fn(),
  }),
}));

const containers: HTMLElement[] = [];

afterEach(() => {
  for (const container of containers) container.remove();
  containers.length = 0;
});

describe("tag selector", () => {
  it("keeps its menu inside a dialog panel and selects a tag", async () => {
    const panel = document.createElement("div");
    panel.setAttribute("data-modal-panel", "");
    document.body.append(panel);
    containers.push(panel);
    const onChange = vi.fn();
    const root = createRoot(panel);

    await act(async () => {
      root.render(<TagSelector value={[]} onChange={onChange} />);
    });
    const input = panel.querySelector<HTMLInputElement>("#tag-search");
    expect(input).not.toBeNull();
    await act(async () => input?.focus());

    const menu = panel.querySelector<HTMLElement>("#tag-options");
    expect(menu).not.toBeNull();
    expect(menu?.parentElement).toBe(panel);
    await act(async () => menu?.querySelector("button")?.click());
    expect(onChange).toHaveBeenCalledWith(["research"]);

    await act(async () => root.unmount());
  });
});
