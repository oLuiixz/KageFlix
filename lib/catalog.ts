import { createCipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

export type ParsedPlaylistItem = {
  title: string;
  groupTitle: "Crunchyroll" | "Funimation Now";
  streamUrl: string;
  logoUrl: string | null;
  tvgId: string | null;
  tvgName: string | null;
};

function normalizeGroup(value: string): ParsedPlaylistItem["groupTitle"] | null {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
  if (normalized === "crunchyroll") return "Crunchyroll";
  if (normalized === "funimation now") return "Funimation Now";
  return null;
}

function attribute(line: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = line.match(new RegExp(`(?:^|\\s)${escaped}="([^"]*)"`, "i"));
  return match?.[1]?.trim() || null;
}

export function parseM3U(playlist: string): ParsedPlaylistItem[] {
  const lines = playlist.replace(/^\uFEFF/, "").split(/\r?\n/);
  const items: ParsedPlaylistItem[] = [];
  let pending: { line: string; title: string; group: ParsedPlaylistItem["groupTitle"] } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      const group = normalizeGroup(attribute(line, "group-title") || "");
      if (!group) {
        pending = null;
        continue;
      }
      const comma = line.indexOf(",");
      const title = (comma >= 0 ? line.slice(comma + 1).trim() : "") || attribute(line, "tvg-name") || "Sem título";
      pending = { line, title, group };
      continue;
    }

    if (line.startsWith("#") || !pending) continue;

    try {
      const parsed = new URL(line);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        pending = null;
        continue;
      }
      items.push({
        title: pending.title.slice(0, 500),
        groupTitle: pending.group,
        streamUrl: parsed.toString(),
        logoUrl: safeHttpUrl(attribute(pending.line, "tvg-logo")),
        tvgId: attribute(pending.line, "tvg-id"),
        tvgName: attribute(pending.line, "tvg-name")
      });
    } catch {
      // Ignore malformed playlist entries without exposing their URL.
    }
    pending = null;
  }

  return items;
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function encryptStreamUrl(streamUrl: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado.");
  const key = Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(secret, "utf8"),
    Buffer.from("kageflix-streams-v1", "utf8"),
    Buffer.from("catalog-item-stream-url", "utf8"),
    32
  ));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(streamUrl, "utf8"), cipher.final()]);
  return { encrypted, iv, authTag: cipher.getAuthTag() };
}

export function sourceItemKey(streamUrl: string): string {
  return createHash("sha256").update(streamUrl).digest("hex");
}
