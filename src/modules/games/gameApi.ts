import { api } from "../../lib/api";

const rawApiBase = (import.meta as any)?.env?.VITE_API_BASE_URL ? String((import.meta as any).env.VITE_API_BASE_URL) : "";
const backendAssetBase = rawApiBase.trim().replace(/\/+$/, "").replace(/\/api$/i, "") || window.location.origin;
const evolutionCloudinaryBase = (import.meta as any)?.env?.VITE_EVOLUTION_CLOUDINARY_BASE_URL
  ? String((import.meta as any).env.VITE_EVOLUTION_CLOUDINARY_BASE_URL).trim().replace(/\/+$/, "")
  : "";
const evolutionCloudinaryVersion = (import.meta as any)?.env?.VITE_EVOLUTION_CLOUDINARY_VERSION
  ? String((import.meta as any).env.VITE_EVOLUTION_CLOUDINARY_VERSION).trim().replace(/^v/i, "")
  : "";

export type GameProvider = {
  id: string;
  name: string;
  catalog?: string;
  raw?: any;
};

export type LiveGame = {
  id: string;
  uid: string;
  name: string;
  image: string;
  provider: string;
  providerId?: string;
  isNew?: boolean;
  fairness?: boolean;
  raw?: any;
};

const GAME_PROVIDERS: GameProvider[] = [
  { id: "all", name: "All" },
  { id: "king5", name: "King5", catalog: "/games/silent-king5.json" },
  { id: "spribe", name: "SPRIBE", catalog: "/games/silent-spribe.json" },
  { id: "smartsoft", name: "SmartSoft", catalog: "/games/silent-smartsoft.json" },
  { id: "evolution", name: "Evolution", catalog: "/games/silent-evolution.json" },
  { id: "galaxsys", name: "Galaxsys", catalog: "/games/silent-galaxsys.json" },
  { id: "inout", name: "InOut", catalog: "/games/silent-inout.json" },
];

type SilentCatalogGame = {
  gameNameEn?: string;
  gameID?: string;
  vendorCode?: number | string;
  vendorId?: number | string;
  img?: string;
  imgUrl2?: string;
};

function resolveGameImage(image: string) {
  const trimmed = String(image || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("/game-assets/evolution/") && evolutionCloudinaryBase) {
    const cloudinaryFileName = (trimmed.split("/").pop() || "").replace(/\s+/g, "_");
    return `${evolutionCloudinaryBase}/${encodeURIComponent(cloudinaryFileName)}`;
  }
  if (trimmed.startsWith("/game-assets/")) return `${backendAssetBase}${encodeURI(trimmed)}`;
  return trimmed;
}

export async function fetchGameProviders(): Promise<GameProvider[]> {
  return GAME_PROVIDERS;
}

async function fetchCatalog(provider: GameProvider): Promise<LiveGame[]> {
  if (!provider.catalog) return [];

  const res = await fetch(provider.catalog);
  if (!res.ok) throw new Error("Unable to load game catalog.");

  const catalog = (await res.json()) as SilentCatalogGame[];
  return catalog
    .map((game, index) => {
      const uid = String(game.gameID || "").trim();
      const name = String(game.gameNameEn || uid || "Untitled Game").trim();
      return {
        id: `${provider.id}:${uid || index}`,
        uid,
        name,
        image: resolveGameImage(String(game.img || game.imgUrl2 || "")),
        provider: provider.name,
        providerId: provider.id,
        isNew: provider.id === "spribe",
        fairness: provider.id === "spribe" || provider.id === "smartsoft" || provider.id === "galaxsys" || provider.id === "inout",
        raw: game,
      };
    })
    .filter((game) => game.uid);
}

export async function fetchProviderGames(provider: GameProvider): Promise<LiveGame[]> {
  if (provider.id !== "all") return fetchCatalog(provider);

  const catalogs = await Promise.all(GAME_PROVIDERS.filter((item) => item.catalog).map(fetchCatalog));
  return sortAllGames(catalogs.flat());
}

const ALL_GAMES_TOP_ORDER: Array<{ names: string[]; providerId?: string }> = [
  { names: ["fast keno"], providerId: "king5" },
  { names: ["aviator"], providerId: "spribe" },
  { names: ["multi hot 5", "multihot 5", "multihot5"], providerId: "smartsoft" },
  { names: ["multi hot ways", "multihot ways"], providerId: "smartsoft" },
  { names: ["tower rush"], providerId: "inout" },
  { names: ["chicken road 2 0", "chicken road 2"], providerId: "inout" },
  { names: ["chicken road"], providerId: "inout" },
  { names: ["plinkox", "plankox"], providerId: "smartsoft" },
  { names: ["jetx"], providerId: "smartsoft" },
  { names: ["penalty unlimited", "penalty", "penality"], providerId: "inout" },
  { names: ["roulette"], providerId: "inout" },
  { names: ["rollx"], providerId: "smartsoft" },
];

function normalizeGameName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getAllGamesPriority(game: LiveGame) {
  const name = normalizeGameName(game.name);
  return ALL_GAMES_TOP_ORDER.findIndex(
    (entry) =>
      (!entry.providerId || entry.providerId === game.providerId) &&
      entry.names.some((alias) => name === normalizeGameName(alias)),
  );
}

function sortAllGames(games: LiveGame[]) {
  return [...games].sort((a, b) => {
    const aPriority = getAllGamesPriority(a);
    const bPriority = getAllGamesPriority(b);
    if (aPriority !== bPriority) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }
    return 0;
  });
}

export async function ensureGameMember(user: any) {
  if (!user?.id) return;
}

export function extractLaunchUrl(result: any) {
  return (
    result?.data?.payload?.game_launch_url ||
    result?.data?.game_launch_url ||
    result?.data?.url ||
    result?.payload?.game_launch_url ||
    result?.game_launch_url ||
    result?.url ||
    ""
  );
}

export async function launchLiveGame(game: LiveGame, user: any) {
  if (!user?.id) throw new Error("Please log in to play live games.");

  if (game.providerId === "king5" && game.uid === "king5-fast-keno") {
    return `${window.location.origin}${window.location.pathname}#/casino/fast-keno`;
  }

  const { data } = await api.post("/games/launch", {
    game_uid: game.uid,
    home_url: window.location.origin,
  });

  const url = extractLaunchUrl(data);
  if (!url) throw new Error(data?.msg || data?.message || "Game launch failed.");
  return url;
}
