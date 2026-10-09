import type { Finding } from "./types";

export function findingLink(f: Finding) {
  return f.kind === "profile"
    ? ({ to: "/social/$id", params: { id: f.id } } as const)
    : ({ to: "/apps/$id", params: { id: f.id } } as const);
}
