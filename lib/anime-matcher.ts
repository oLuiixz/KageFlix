type AnimeRecord = { title?: string; synonyms?: string[]; sources?: string[]; type?: "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL" | "UNKNOWN" };
type AnimeDatabase = { data?: AnimeRecord[] };
type CatalogKind = "vod" | "series";

const DATA_URL = "https://github.com/cedya77/anime-offline-database/releases/download/latest/anime-offline-database-minified.json";

export function normalizeAnimeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/\[[^\]]*(?:1080p|720p|480p|dub|legendado|dual audio|x265|hevc)[^\]]*\]/gi, " ")
    .replace(/\([^)]*(?:1080p|720p|480p|dub|legendado|dual audio|x265|hevc)[^)]*\)/gi, " ")
    .replace(/\b(?:season|temporada|s)\s*\d+\b.*$/i, " ")
    .replace(/\b\d{3,4}p\b/gi, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const knownAnime: Array<{ type: AnimeRecord["type"]; titles: string[] }> = [
  { type: "TV", titles: ["One Piece", "Demon Slayer", "Kimetsu no Yaiba", "Jujutsu Kaisen", "My Hero Academia", "Boku no Hero Academia", "Naruto", "Naruto Shippuden", "Dragon Ball", "Dragon Ball Z", "Dragon Ball Super", "Attack on Titan", "Shingeki no Kyojin", "Death Note", "Hunter x Hunter", "Bleach", "Black Clover", "Chainsaw Man", "Spy x Family", "Solo Leveling", "Fullmetal Alchemist Brotherhood", "Tokyo Revengers", "Haikyuu", "Blue Lock", "One Punch Man", "Sword Art Online", "Fairy Tail", "The Seven Deadly Sins", "Nanatsu no Taizai", "Mob Psycho 100", "Dr Stone", "Vinland Saga", "JoJo's Bizarre Adventure"] },
  { type: "MOVIE", titles: ["Spirited Away", "A Viagem de Chihiro", "Your Name", "Kimi no Na wa", "A Silent Voice", "Koe no Katachi", "Weathering With You", "Tenki no Ko", "Princess Mononoke", "Mononoke Hime", "Howl's Moving Castle", "Akira", "Suzume", "The Boy and the Heron", "O Menino e a Garça", "My Neighbor Totoro", "Meu Amigo Totoro", "Grave of the Fireflies", "Túmulo dos Vagalumes"] }
];

const fallbackIndex = new Map<string, AnimeRecord["type"]>();
for (const group of knownAnime) for (const title of group.titles) fallbackIndex.set(normalizeAnimeTitle(title), group.type);

type TitleMatch = { type: NonNullable<AnimeRecord["type"]>; canonical: boolean; sourceCount: number; recordTitle: string };
let titleIndex: Promise<Map<string, TitleMatch[]>> | null = null;

async function getAnimeTitleIndex(): Promise<Map<string, TitleMatch[]>> {
  if (!titleIndex) {
    titleIndex = (async () => {
      const response = await fetch(DATA_URL, {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`Anime metadata source returned HTTP ${response.status}.`);
      const database = await response.json() as AnimeDatabase;
      if (!Array.isArray(database.data)) throw new Error("Anime metadata source returned an invalid dataset.");
      const index = new Map<string, TitleMatch[]>();
      for (const entry of database.data) {
        const type = entry.type;
        if (!type || type === "UNKNOWN") continue;
        const sourceCount = Array.isArray(entry.sources) ? entry.sources.length : 0;
        const titles: Array<{ value: unknown; canonical: boolean }> = [
          { value: entry.title, canonical: true },
          ...(Array.isArray(entry.synonyms) ? entry.synonyms.map(value => ({ value, canonical: false })) : [])
        ];
        for (const candidate of titles) {
          if (typeof candidate.value !== "string") continue;
          const title = normalizeAnimeTitle(candidate.value);
          if (!title) continue;
          const matches = index.get(title) ?? [];
          matches.push({ type, canonical: candidate.canonical, sourceCount, recordTitle: String(entry.title ?? "") });
          index.set(title, matches);
        }
      }
      return index;
    })().catch(error => {
      titleIndex = null;
      throw error;
    });
  }
  return titleIndex;
}

function isExpectedFormat(type: string, kind: CatalogKind): boolean {
  return kind === "vod"
    ? type === "MOVIE"
    : ["TV", "OVA", "ONA", "SPECIAL"].includes(type);
}

function isHighConfidenceMatch(matches: TitleMatch[] | undefined, kind: CatalogKind, normalizedTitle: string): boolean {
  if (!matches?.length) return false;
  const expected = matches.filter(match => isExpectedFormat(match.type, kind));
  if (!expected.length) return false;

  // Canonical titles are stronger identifiers than translated synonyms.
  const canonical = matches.filter(match => match.canonical && isExpectedFormat(match.type, kind));
  if (
    canonical.length === 1
    && matches.every(match => match.recordTitle === canonical[0].recordTitle)
    && (normalizedTitle.split(" ").length >= 2 || fallbackIndex.has(normalizedTitle))
  ) return true;

  // Generic translations such as "Sunny", "Sugar" or "Scandal" can collide
  // with live-action catalog titles. Synonyms must be unique and cross-sourced.
  const records = new Set(matches.map(match => match.recordTitle));
  const aliasWords = normalizedTitle.split(" ").filter(Boolean);
  return records.size === 1
    && expected.length === matches.length
    && expected[0].sourceCount >= 2
    && aliasWords.length >= 2
    && normalizedTitle.length >= 10;
}

export async function filterAnimeItems<T extends { title?: string } & Record<string, unknown>>(items: T[], kind: CatalogKind): Promise<T[]> {
  let index: Map<string, TitleMatch[]>;
  try {
    index = await getAnimeTitleIndex();
  } catch (error) {
    console.error("KageFlix anime database unavailable; using curated title fallback:", error);
    return items.filter(item => {
      const type = fallbackIndex.get(normalizeAnimeTitle(typeof item.title === "string" ? item.title : ""));
      return kind === "vod" ? type === "MOVIE" : ["TV", "OVA", "ONA", "SPECIAL"].includes(type ?? "");
    });
  }

  return items.filter(item => {
    const title = typeof item.title === "string" ? normalizeAnimeTitle(item.title) : "";
    const types = index.get(title);
    if (isHighConfidenceMatch(types, kind, title)) return true;
    const fallbackType = fallbackIndex.get(title);
    return kind === "vod" ? fallbackType === "MOVIE" : ["TV", "OVA", "ONA", "SPECIAL"].includes(fallbackType ?? "");
  });
}

type ApiAnimeMatch = { aliases: string[]; kind: CatalogKind };
const apiAliasCache = new Map<string, { expiresAt: number; aliases: string[] }>();

function matchesRequestedTitle(candidateTitles: string[], wanted: string): boolean {
  return candidateTitles.some(title => normalizeAnimeTitle(title) === wanted);
}

/**
 * Uses AniList and Jikan as a cached alias resolver for direct title searches.
 * It does not run for every catalogue item, avoiding public API rate-limit bursts.
 */
export async function getAnimeSearchAliases(query: string, expectedKind: CatalogKind): Promise<string[]> {
  const wanted = normalizeAnimeTitle(query);
  if (wanted.length < 2) return [query];
  const cacheKey = expectedKind + ":" + wanted;
  const cached = apiAliasCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.aliases;

  const anilist = async (): Promise<ApiAnimeMatch | null> => {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: `query ($search: String) { Media(search: $search, type: ANIME) { format title { romaji english native } synonyms } }`,
        variables: { search: query }
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
    const payload = await response.json();
    const media = payload?.data?.Media;
    if (!media) return null;
    const aliases = [...Object.values(media.title ?? {}), ...(Array.isArray(media.synonyms) ? media.synonyms : [])].filter((v): v is string => typeof v === "string" && v.length > 0);
    if (!matchesRequestedTitle(aliases, wanted)) return null;
    const format = String(media.format ?? "");
    const isMovie = format === "MOVIE";
    const isSeries = ["TV", "TV_SHORT", "OVA", "ONA", "SPECIAL"].includes(format);
    if ((expectedKind === "vod" && !isMovie) || (expectedKind === "series" && !isSeries)) return null;
    return { aliases, kind: expectedKind };
  };

  const jikan = async (): Promise<ApiAnimeMatch | null> => {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=10`;
    const response = await fetch(url, { next: { revalidate: 604800 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Jikan HTTP ${response.status}`);
    const payload = await response.json();
    for (const anime of Array.isArray(payload?.data) ? payload.data : []) {
      const aliases = [
        anime.title,
        anime.title_english,
        anime.title_japanese,
        ...(Array.isArray(anime.title_synonyms) ? anime.title_synonyms : []),
        ...(Array.isArray(anime.titles) ? anime.titles.map((entry: any) => entry.title) : [])
      ].filter((v): v is string => typeof v === "string" && v.length > 0);
      if (!matchesRequestedTitle(aliases, wanted)) continue;
      const type = String(anime.type ?? "").toLowerCase();
      const isMovie = type === "movie";
      const isSeries = ["tv", "ova", "ona", "special"].includes(type);
      if ((expectedKind === "vod" && !isMovie) || (expectedKind === "series" && !isSeries)) continue;
      return { aliases, kind: expectedKind };
    }
    return null;
  };

  const kitsu = async (): Promise<ApiAnimeMatch | null> => {
    const url = `https://kitsu.io/api/edge/anime?filter%5Btext%5D=${encodeURIComponent(query)}&page%5Blimit%5D=10`;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.api+json" },
      next: { revalidate: 604800 },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Kitsu HTTP ${response.status}`);
    const payload = await response.json();
    for (const anime of Array.isArray(payload?.data) ? payload.data : []) {
      const attributes = anime?.attributes ?? {};
      const titles = attributes.titles && typeof attributes.titles === "object" ? Object.values(attributes.titles) : [];
      const aliases = [
        attributes.canonicalTitle,
        ...titles,
        ...(Array.isArray(attributes.abbreviatedTitles) ? attributes.abbreviatedTitles : [])
      ].filter((v): v is string => typeof v === "string" && v.length > 0);
      if (!matchesRequestedTitle(aliases, wanted)) continue;
      const subtype = String(attributes.subtype ?? "").toLowerCase();
      const isMovie = subtype === "movie";
      const isSeries = ["tv", "ova", "ona", "special", "music"].includes(subtype);
      if ((expectedKind === "vod" && !isMovie) || (expectedKind === "series" && !isSeries)) continue;
      return { aliases, kind: expectedKind };
    }
    return null;
  };

  let resolved: string[] = [query];
  for (const source of [anilist, jikan, kitsu]) {
    try {
      const match = await source();
      if (match?.kind === expectedKind) {
        resolved = [...new Set([query, ...match.aliases])];
        break;
      }
    } catch (error) {
      console.warn("KageFlix anime metadata lookup failed; trying next source:", error);
    }
  }

  apiAliasCache.set(cacheKey, {
    aliases: resolved,
    expiresAt: Date.now() + (resolved.length > 1 ? 7 : 1) * 86400000
  });
  return resolved;
}
