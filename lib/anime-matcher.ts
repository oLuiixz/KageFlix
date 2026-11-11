type AnimeRecord = { title?: string; synonyms?: string[] };
type AnimeDatabase = { data?: AnimeRecord[] };

const DATA_URL = "https://github.com/cedya77/anime-offline-database/releases/download/latest/anime-offline-database-minified.json";

function normalizeAnimeTitle(value: string): string {
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

const knownAnimeTitles = new Set([
  "One Piece", "Demon Slayer", "Kimetsu no Yaiba", "Jujutsu Kaisen",
  "My Hero Academia", "Boku no Hero Academia", "Naruto", "Naruto Shippuden",
  "Dragon Ball", "Dragon Ball Z", "Dragon Ball Super", "Attack on Titan",
  "Shingeki no Kyojin", "Death Note", "Hunter x Hunter", "Bleach",
  "Black Clover", "Chainsaw Man", "Spy x Family", "Solo Leveling",
  "Fullmetal Alchemist Brotherhood", "Tokyo Revengers", "Haikyuu",
  "Blue Lock", "One Punch Man", "Sword Art Online", "Fairy Tail",
  "The Seven Deadly Sins", "Nanatsu no Taizai", "Mob Psycho 100",
  "Dr Stone", "Vinland Saga", "JoJo's Bizarre Adventure"
].map(normalizeAnimeTitle));

let titleIndex: Promise<Set<string>> | null = null;

async function getAnimeTitleIndex(): Promise<Set<string>> {
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
      const index = new Set<string>();
      for (const entry of database.data) {
        if (typeof entry.title === "string") {
          const title = normalizeAnimeTitle(entry.title);
          if (title) index.add(title);
        }
        for (const synonym of Array.isArray(entry.synonyms) ? entry.synonyms : []) {
          if (typeof synonym !== "string") continue;
          const title = normalizeAnimeTitle(synonym);
          if (title) index.add(title);
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


export async function filterAnimeItems<T extends { title?: string } & Record<string, unknown>>(items: T[]): Promise<T[]> {
  let index: Set<string>;
  try {
    index = await getAnimeTitleIndex();
  } catch (error) {
    console.error("KageFlix anime index unavailable; using provider metadata:", error);
    return items.filter(item => knownAnimeTitles.has(normalizeAnimeTitle(typeof item.title === "string" ? item.title : "")));
  }

  return items.filter(item => {
    const title = typeof item.title === "string" ? normalizeAnimeTitle(item.title) : "";
    return title.length >= 2 && index.has(title);
  });
}
