import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Smartphone, X, Trophy, Globe, Clock, CircleHelp, FileText, Search, Phone } from "lucide-react";
import { Match, BetSelection } from "./types";
import { useActiveOddsProvider, useBanners, useFixtures, useFixturesInfinite, useMezzoTopEvents, usePissbetTopEventsStream, useRefreshVisibleOdds } from "./modules/betting/hooks";
import { useMe } from "./modules/auth/hooks";
import { useQueryClient } from "@tanstack/react-query";

// Modular Components
import Header from "./components/layout/Header";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import MobileBottomNav from "./components/layout/MobileBottomNav";
import Betslip from "./components/betting/Betslip";
import BettingFilters from "./components/betting/BettingFilters";
import MatchCard from "./components/betting/MatchCard";
import MatchDetail from "./components/betting/MatchDetail";
import AuthModal from "./components/betting/AuthModal";
import AccountPanelPage from "./components/betting/AccountPanelPage";
import PublicTicketModal from "./components/betting/PublicTicketModal";
import { MatchCardSkeletonList } from "./components/betting/MatchCardSkeleton";
import { api } from "./lib/api";

import GamesView from "./components/games/GamesView";
import FastKenoView from "./components/games/FastKenoView";
import LiveView from "./components/live/LiveView";
import VirtualSportsView from "./components/virtual/VirtualSportsView";
import ComingSoon from "./components/common/ComingSoon";

export default function App() {
  const getInitialSlipSlot = (): 1 | 2 | 3 => {
    if (typeof window === "undefined") return 1;
    const raw = localStorage.getItem("activeSlipSlot");
    if (raw === "2") return 2;
    if (raw === "3") return 3;
    return 1;
  };
  const [activeSlipSlot, setActiveSlipSlot] = useState<1 | 2 | 3>(getInitialSlipSlot);
  const [selectedBetsBySlot, setSelectedBetsBySlot] = useState<Record<1 | 2 | 3, BetSelection[]>>({
    1: [],
    2: [],
    3: [],
  });
  const selectedBets = selectedBetsBySlot[activeSlipSlot];
  const [betslipNotice, setBetslipNotice] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(20);
  const [view, setView] = useState<string>("home");
  const [activeNavView, setActiveNavView] = useState<string>("home");
  const [comingSoonTitle, setComingSoonTitle] = useState<string>("Coming Soon");
  const [isBetslipOpen, setIsBetslipOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [activeApiFootballLeagueId, setActiveApiFootballLeagueId] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('All Time');
  const [matchSearch, setMatchSearch] = useState<string>("");
  const [fixturesTab, setFixturesTab] = useState<"upcoming" | "top">("top");
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    if ("addEventListener" in mql) mql.addEventListener("change", onChange);
    else (mql as any).addListener(onChange);
    return () => {
      if ("removeEventListener" in mql) mql.removeEventListener("change", onChange);
      else (mql as any).removeListener(onChange);
    };
  }, []);

  const queryClient = useQueryClient();
  const refreshVisibleOdds = useRefreshVisibleOdds();
  const lastBulkRefreshAtRef = useRef<number>(0);
  const bulkRefreshInFlightRef = useRef<boolean>(false);
  const { data: currentUser, isLoading: meLoading, isFetching: meFetching } = useMe();
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  const authLoading = hasToken && (meLoading || meFetching);
  const { data: activeProvider } = useActiveOddsProvider();
  const { data: remoteBanners = [] } = useBanners(true);
  const assetBase = (import.meta as any)?.env?.VITE_API_BASE_URL ? String((import.meta as any).env.VITE_API_BASE_URL).replace(/\/+$/, "") : "";
  const pissbetStream = usePissbetTopEventsStream(activeProvider === "pissbet_socket");
  // Mezzo: when no sport is selected, show all sports (sportId=0 disables sport filter server-side).
  const mezzoSportId = activeProvider === "mezzo" ? (activeSport ? Number(activeSport) : 0) : 501;
  const mezzoTopEvents = useMezzoTopEvents({
    enabled: activeProvider === "mezzo",
    sportId: mezzoSportId,
    tab: fixturesTab,
    // Mezzo sidebar entries carry provider competition IDs; pass them through for reliable filtering.
    leagueId: activeLeagueId,
    leagueName: activeLeague,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("activeSlipSlot", String(activeSlipSlot));
  }, [activeSlipSlot]);

  useEffect(() => {
    if (!authLoading) {
      setUser(currentUser || null);
    }
  }, [authLoading, currentUser]);

  const syncUserBalance = (balance: number) => {
    queryClient.invalidateQueries({ queryKey: ["user"] });
    setUser((prev: any) => {
      if (!prev) return prev;
      return { ...prev, balance: Number.isFinite(balance) ? balance : prev.balance };
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };

  const handleAuth = (type: "login" | "register") => {
    setAuthModal({ open: true, type });
  };
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    type: "login" | "register";
  }>({
    open: false,
    type: "login",
  });
  const [accountPanelTab, setAccountPanelTab] = useState<"deposit" | "withdraw" | "bets" | "ticket">("deposit");
  const [publicTicketCode, setPublicTicketCode] = useState("");
  const [publicTicket, setPublicTicket] = useState<any>(null);
  const [publicTicketLoading, setPublicTicketLoading] = useState(false);
  const [publicTicketError, setPublicTicketError] = useState("");
  const [publicTicketRefresh, setPublicTicketRefresh] = useState(0);

  const getMatchRoute = (matchId: string) => `/match/${encodeURIComponent(matchId)}`;

  const tabRoutes: Record<string, string> = {
    home: "/",
    sport: "/sport",
    live: "/live",
    games: "/games",
    "live-games": "/live-games",
    "fast-keno": "/casino/fast-keno",
    virtual: "/virtual-sports",
    promotions: "/promotions",
  };

  const comingSoonTitles: Record<string, string> = {
    live: "Live (Coming Soon)",
    "live-games": "Live Games (Coming Soon)",
    virtual: "Virtual Sports (Coming Soon)",
    promotions: "Promotions (Coming Soon)",
  };

  // Basic URL routing (no react-router): allow direct links + back button.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyPath = (rawPath: string) => {
      const raw = String(rawPath || "/");
      const p = raw.toLowerCase();
      if (p === "/ticket" || p.startsWith("/ticket/")) {
        const encodedCode = raw.split("/").slice(2).join("/");
        let code = "";
        try {
          code = encodedCode ? decodeURIComponent(encodedCode) : "";
        } catch {
          code = encodedCode;
        }
        if (code) setPublicTicketCode(code);
        return;
      }
      if (p === "/betslip" || p.startsWith("/betslip/")) {
        setIsBetslipOpen(true);
        // Keep view as-is (home/detail/etc); betslip is an overlay.
        return;
      }
      setIsBetslipOpen(false);
      if (p === "/match" || p.startsWith("/match/")) {
        const encodedId = raw.split("/").slice(2).join("/");
        let matchId = "";
        try {
          matchId = encodedId ? decodeURIComponent(encodedId) : "";
        } catch {
          matchId = encodedId;
        }
        if (matchId) {
          setActiveNavView("home");
          setSelectedMatchId(matchId);
          setView("detail");
          return;
        }
      }
      if (p === "/user/profile" || p.startsWith("/user/profile/")) {
        setActiveNavView("account");
        setAccountPanelTab("deposit");
        setView("account");
        return;
      }
      if (p === "/user/bets" || p.startsWith("/user/bets/")) {
        setActiveNavView("account");
        setAccountPanelTab("bets");
        setView("account");
        return;
      }
      if (p === "/user/withdraw" || p.startsWith("/user/withdraw/")) {
        setActiveNavView("account");
        setAccountPanelTab("withdraw");
        setView("account");
        return;
      }
      if (p === "/user/ticket" || p.startsWith("/user/ticket/")) {
        setActiveNavView("account");
        setAccountPanelTab("ticket");
        setView("account");
        return;
      }
      if (p === "/casino/fast-keno" || p.startsWith("/casino/fast-keno/")) {
        setActiveNavView("games");
        setSelectedMatchId(null);
        setView("fast-keno");
        return;
      }
      const routeView = Object.entries(tabRoutes).find(([, route]) => p === route || (route !== "/" && p.startsWith(`${route}/`)))?.[0];
      if (routeView) {
        setActiveNavView(routeView);
        setSelectedMatchId(null);
        if (routeView === "home") {
          setView("home");
          setActiveSport(null);
          setActiveLeague(null);
          setActiveLeagueId(null);
          setActiveApiFootballLeagueId(null);
          setActiveCountry(null);
          return;
        }
        if (comingSoonTitles[routeView]) {
          setComingSoonTitle(comingSoonTitles[routeView]);
          setView("coming-soon");
          return;
        }
        if (routeView === "sport" && isDesktop) {
          setView("home");
          return;
        }
        setView(routeView);
        return;
      }
      // Default route
      setActiveNavView("home");
      setView("home");
    };

    const getPath = () => {
      // Use hash routing so reloads on Vercel don't 404 (/#/user/bets, /#/betslip, etc).
      const h = String(window.location.hash || "");
      const cleaned = h.startsWith("#") ? h.slice(1) : h;
      return cleaned.startsWith("/") ? cleaned : cleaned ? `/${cleaned}` : "/";
    };

    applyPath(getPath());
    const onHash = () => applyPath(getPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [isDesktop]);

  useEffect(() => {
    if (!publicTicketCode) return;
    let cancelled = false;
    setPublicTicketLoading(true);
    setPublicTicketError("");
    setPublicTicket(null);

    api.get(`/public/tickets/${encodeURIComponent(publicTicketCode)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setPublicTicket(data?.ticket || null);
        if (!data?.ticket) setPublicTicketError("Ticket not found");
      })
      .catch((e) => {
        if (cancelled) return;
        setPublicTicketError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Ticket not found");
      })
      .finally(() => {
        if (!cancelled) setPublicTicketLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicTicketCode, publicTicketRefresh]);

  const closePublicTicket = () => {
    setPublicTicketCode("");
    setPublicTicket(null);
    setPublicTicketError("");
    if (window.location.hash.toLowerCase().startsWith("#/ticket/")) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
    }
  };

  const pushPath = (path: string) => {
    if (typeof window === "undefined") return;
    const next = path.startsWith("/") ? path : `/${path}`;
    const nextHash = `#${next}`;
    if (window.location.hash === nextHash) return;
    window.location.hash = next;
  };

  const replacePath = (path: string) => {
    if (typeof window === "undefined") return;
    const next = path.startsWith("/") ? path : `/${path}`;
    const nextHash = `#${next}`;
    try {
      window.history.replaceState(null, "", nextHash);
    } catch {
      window.location.hash = next;
    }
  };

  const toggleBet = (
    match: Match,
    market: string,
    selection: string,
    odd: number,
    outcomeId?: string,
    selectionKey?: string,
    acceptedOddsVersion?: number,
    lastFetchedAt?: string,
    status?: string,
    uiStatus?: "fresh" | "warning" | "expired" | "suspended" | "closed",
  ) => {
    // Some detail markets may render odds without a resolvable outcomeId.
    // We still allow adding them to the betslip for UX, but placement may fail until odds are refreshed.
    const safeOutcomeId = outcomeId == null ? "" : String(outcomeId).trim();
    const safeSelectionKey = selectionKey == null ? "" : String(selectionKey).trim();
    if (!safeOutcomeId && !safeSelectionKey) {
      setBetslipNotice("This selection is not available right now.");
      setTimeout(() => setBetslipNotice(null), 2000);
      return;
    }
    const safeOddsVersion = Number.isFinite(Number(acceptedOddsVersion)) ? Number(acceptedOddsVersion) : 1;
    const matchesSelection = (bet: BetSelection) => {
      if (safeOutcomeId && bet.outcomeId) return String(bet.outcomeId) === safeOutcomeId;
      if (safeSelectionKey && bet.selectionKey) return String(bet.selectionKey) === safeSelectionKey;
      return bet.matchId === match.id && bet.market === market && bet.selection === selection;
    };
    setSelectedBetsBySlot((prevBySlot) => {
      const prev = prevBySlot[activeSlipSlot];
      const exists = prev.find(matchesSelection);
      if (exists) {
        const nextSlot = prev.filter((b) => !matchesSelection(b));
        return { ...prevBySlot, [activeSlipSlot]: nextSlot };
      }

      const matchExternalEventId = match.externalEventId ?? null;
      const hasExistingForMatch = prev.some(
        (b) =>
          b.matchId === match.id ||
          (matchExternalEventId && b.externalEventId && String(b.externalEventId) === String(matchExternalEventId)),
      );
      const filteredPrev = prev.filter(
        (b) =>
          !(
            b.matchId === match.id ||
            (matchExternalEventId && b.externalEventId && String(b.externalEventId) === String(matchExternalEventId))
          ),
      );
      if (hasExistingForMatch) {
        setBetslipNotice("Selection updated for this match.");
        setTimeout(() => setBetslipNotice(null), 2000);
      }

      const nextSlot: BetSelection[] = [
        ...filteredPrev,
        {
          matchId: match.id,
          matchName: `${match.homeTeam} v ${match.awayTeam}`,
          externalEventId: matchExternalEventId,
          market,
          selection,
          odd,
          outcomeId: safeOutcomeId || undefined,
          selectionKey: safeOutcomeId ? undefined : (safeSelectionKey || undefined),
          acceptedOddsVersion: safeOddsVersion,
          lastFetchedAt,
          startsAt: match.startsAt,
          status,
          uiStatus,
        },
      ];
      if (nextSlot.length === 1) setIsBetslipOpen(true);
      if (nextSlot.length === 1) pushPath("/betslip");
      return { ...prevBySlot, [activeSlipSlot]: nextSlot };
    });
  };

  const requestRefreshOdds = async (fixtureId: string) => {
    try {
      await refreshVisibleOdds.mutateAsync([fixtureId]);
      await queryClient.invalidateQueries({ queryKey: ["fixtures"] });
    } catch {
      // Ignore; odds will remain disabled until next poll.
    }
  };

  const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  const removeBet = (matchId: string, market: string, selection: string) => {
    setSelectedBetsBySlot((prevBySlot) => ({
      ...prevBySlot,
      [activeSlipSlot]: prevBySlot[activeSlipSlot].filter(
        (b) => !(b.matchId === matchId && b.market === market && b.selection === selection),
      ),
    }));
    setBetslipNotice(null);
  };

  const [currentBanner, setCurrentBanner] = useState(0);
  const defaultBanners: any[] = [];

  const banners = (remoteBanners as any[]).map((b: any) => ({
    title: String(b?.title || ""),
    subtitle: b?.subtitle ?? "",
    highlight: b?.highlight ?? "",
    image: (() => {
      const raw = String(b?.imageUrl || "").trim();
      if (!raw) return "";
      if (raw.startsWith("/") && assetBase) return `${assetBase}${raw}`;
      return raw;
    })(),
    color: String(b?.color || "bg-brand-primary"),
  }));

  useEffect(() => {
    if (!banners.length) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleMatchClick = (matchId: string) => {
    if (activeProvider === "pissbet_socket") {
      const m = visibleFixtures.find((x: any) => String(x?.id) === String(matchId));
      const eventId = Number((m as any)?.externalEventId ?? String(matchId).split(":")[1]);
      if (Number.isFinite(eventId) && eventId > 0) {
        pissbetStream.subscribeEvent(eventId);
      }
    }
    setSelectedMatchId(matchId);
    setActiveNavView("home");
    setView("detail");
    pushPath(getMatchRoute(matchId));
  };

  const handleViewChange = (newView: string) => {
    setActiveNavView(newView);
    if (comingSoonTitles[newView]) {
      setComingSoonTitle(comingSoonTitles[newView]);
      setView("coming-soon");
      setSelectedMatchId(null);
      pushPath(tabRoutes[newView]);
      return;
    }

    setView(newView);
    setSelectedMatchId(null);
    if (newView === "sport" && isDesktop) {
      setView("home");
    }
    if (newView === 'home') {
      setActiveSport(null);
      setActiveLeague(null);
      setActiveLeagueId(null);
      setActiveApiFootballLeagueId(null);
      setActiveCountry(null);
    }
    if (tabRoutes[newView]) pushPath(tabRoutes[newView]);
    if (newView === "account") pushPath("/user/profile");
  };

  const returnToMatchList = () => {
    setActiveNavView("home");
    setView("home");
    setSelectedMatchId(null);
    replacePath("/");
  };

  const clearMatchFilters = () => {
    setActiveSport(null);
    setActiveLeague(null);
    setActiveLeagueId(null);
    setActiveApiFootballLeagueId(null);
    setActiveCountry(null);
    setTimeFilter("All Time");
    setMatchSearch("");
    setFixturesTab("top");
    setSelectedMatchId(null);
    setView("home");
    setActiveNavView("home");
    replacePath("/");
  };


  const apifbInfinite = useFixturesInfinite({
    enabled: !!activeProvider && activeProvider !== "mezzo" && activeProvider !== "pissbet_socket",
    sportId: activeSport,
    leagueName: activeLeague,
    leagueId: activeLeagueId,
    apiFootballLeagueId: activeApiFootballLeagueId,
    country: activeCountry,
    timeLimit: timeFilter,
    tab: fixturesTab,
    providerOverride: activeProvider,
    pageSize: fixturesTab === "top" ? 20 : 30,
  });

  const data = apifbInfinite.data;
  const fixturesQueryIsFetching = activeProvider === "mezzo" ? (mezzoTopEvents as any).isFetching : apifbInfinite.isFetching;
  const fixturesQueryStatus = activeProvider === "mezzo" ? (mezzoTopEvents as any).status : apifbInfinite.status;

  const fetchNextPage = activeProvider === "mezzo" ? (mezzoTopEvents as any).fetchNextPage : apifbInfinite.fetchNextPage;
  const hasNextPage = activeProvider === "mezzo" ? (mezzoTopEvents as any).hasNextPage : apifbInfinite.hasNextPage;
  const isFetchingNextPage = activeProvider === "mezzo" ? (mezzoTopEvents as any).isFetchingNextPage : apifbInfinite.isFetchingNextPage;


  const fixturesRaw =
    activeProvider === "pissbet_socket"
      ? pissbetStream.matches
      : activeProvider === "mezzo"
        ? ((mezzoTopEvents as any).data?.matches || [])
        : (data?.pages.flatMap(page => page.fixtures) || []);
  // Backend dedupes by canonical identity, but keep a client-side guard too.
  const normalizeText = (value: any) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\s+vs\s+/g, " v ")
      .replace(/\s+v\s+/g, " v ");

  const canonicalKey = (f: any) => {
    const provider = String(f?.externalProvider || f?.external_provider || "unknown").trim();
    const externalId = f?.externalEventId ?? f?.external_event_id ?? f?.sourceEventId ?? f?.source_event_id;
    if (externalId) return `${provider}:${String(externalId)}`;

    const sport = f?.sportName || f?.Sport?.name || "";
    const league = f?.league || f?.League?.name || "";
    const home = f?.homeTeam || f?.homeTeamName || "";
    const away = f?.awayTeam || f?.awayTeamName || "";
    const startsAt = f?.startsAt || "";
    try {
      const iso = startsAt ? new Date(startsAt).toISOString() : "";
      const fallback = [sport, league, home, away, iso].map(normalizeText).join("|");
      if (fallback.replace(/\|/g, "").trim()) return fallback;
    } catch {
      // ignore
    }

    return `local:${f?.id}`;
  };
  const fixtures = (() => {
    const map = new Map<string, any>();
    for (const f of fixturesRaw) map.set(canonicalKey(f), f); // prefer latest page occurrence
    return Array.from(map.values());
  })();

  const providerFilteredFixtures = (() => {
    // For Mezzo + Pissbet, filtering happens client-side (they don't use /betting/fixtures).
    if (activeProvider === "mezzo") {
      // Mezzo filtering is backend-driven via `/odds/mezzo/top-events` params.
      return fixtures;
    }

    if (activeProvider === "pissbet_socket") {
      return fixtures.filter((f: any) => {
        if (activeSport && String(activeSport) !== "football") return false;
        if (activeLeagueId) return true; // pissbet doesn't have stable league ids in this mapping
        if (activeLeague) {
          const league = String(f?.league || "").trim();
          if (league && league !== String(activeLeague)) return false;
        }
        return true;
      });
    }

    // API-Football path is server-filtered via query params.
    return fixtures;
  })();

  const tabSortedFixtures = (() => {
    const items = [...providerFilteredFixtures];
    const startsAtMs = (f: any) => {
      const t = f?.startsAt ? new Date(f.startsAt).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };
    const footballRank = (f: any) => {
      const text = [
        f?.sportName,
        f?.sport,
        f?.Sport?.name,
        f?.league,
        f?.League?.name,
        f?.competitionName,
        f?.country,
      ].map((x) => String(x || "").toLowerCase()).join(" ");
      if (text.includes("world cup")) return 0;
      if (text.includes("football") || text.includes("soccer")) return 1;
      return 2;
    };

    if (fixturesTab === "top") {
      items.sort((a: any, b: any) => {
        const aFootball = footballRank(a);
        const bFootball = footballRank(b);
        if (aFootball !== bFootball) return aFootball - bFootball;

        const aTop = a?.isTop ? 1 : 0;
        const bTop = b?.isTop ? 1 : 0;
        if (aTop !== bTop) return bTop - aTop;

        const aPrices = Number(a?.pricesCount ?? 0) || 0;
        const bPrices = Number(b?.pricesCount ?? 0) || 0;
        if (aPrices !== bPrices) return bPrices - aPrices;

        const aStart = startsAtMs(a);
        const bStart = startsAtMs(b);
        if (aStart && bStart && aStart !== bStart) return aStart - bStart;
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return String(a?.id || "").localeCompare(String(b?.id || ""));
      });
      return items;
    }

    // Upcoming: nearest kickoff first.
    items.sort((a: any, b: any) => {
      const aFootball = footballRank(a);
      const bFootball = footballRank(b);
      if (aFootball !== bFootball) return aFootball - bFootball;

      const aStart = startsAtMs(a);
      const bStart = startsAtMs(b);
      if (aStart && bStart && aStart !== bStart) return aStart - bStart;
      if (aStart && !bStart) return -1;
      if (!aStart && bStart) return 1;
      return String(a?.id || "").localeCompare(String(b?.id || ""));
    });
    return items;
  })();

  const isStartedOrCompleted = (f: any) => {
    // IMPORTANT: avoid time-based filtering here (timezone/format issues can hide valid upcoming fixtures).
    // Only hide fixtures that are explicitly live/started or completed/closed.
    const status = String(f?.status || f?.matchStatus || f?.state || "").toLowerCase();
    if (!status) return false;

    // Started / in-play
    if (["live", "inplay", "in_play", "1h", "2h", "ht", "et", "pen", "started"].includes(status)) return true;

    // Completed / removed
    return ["ft", "finished", "ended", "completed", "final", "closed", "settled", "canceled", "cancelled", "postponed"].includes(status);
  };

  const visibleFixtures = tabSortedFixtures
    .filter((f) => !isStartedOrCompleted(f))
    .filter((f) => {
      const q = matchSearch.trim().toLowerCase();
      if (!q) return true;
      return [
        f?.homeTeam,
        f?.awayTeam,
        f?.league,
        f?.leagueName,
        f?.country,
        f?.sportName,
      ].some((value) => String(value || "").toLowerCase().includes(q));
    });
  const showFixturesSkeleton =
    fixturesQueryStatus === "pending" ||
    (fixturesQueryIsFetching && visibleFixtures.length === 0) ||
    (activeProvider === "pissbet_socket" && !pissbetStream.hasData);

  // Bulk refresh visible fixtures (one call per chunk) so a page refresh updates odds "all at once".
  useEffect(() => {
    // Only API-Football needs client-triggered visible odds refresh.
    // StatsAPI/Mezzo-linked odds are filled from DB/workers/admin matching.
    if (activeProvider !== "apifootball") return;
    if (!visibleFixtures.length) return;
    if (bulkRefreshInFlightRef.current) return;

    const now = Date.now();
    // Client-side throttle; backend also has per-fixture locks.
    if (now - lastBulkRefreshAtRef.current < 20_000) return;

    const staleFixtureIds = visibleFixtures
      .filter((m) => {
        const markets = m.markets || [];
        const mainKeys = new Set(["1X2", "DC", "BTS"]);
        for (const mk of markets) {
          const key = String(mk.key || "").toUpperCase();
          if (!mainKeys.has(key)) continue;
          for (const o of mk.outcomes || []) {
            if (o.isSelectable === false) return true;
          }
        }
        return false;
      })
      .map((m) => m.id);

    if (!staleFixtureIds.length) return;

    bulkRefreshInFlightRef.current = true;
    lastBulkRefreshAtRef.current = now;

    (async () => {
      try {
        for (const group of chunk(Array.from(new Set(staleFixtureIds)), 30)) {
          await refreshVisibleOdds.mutateAsync(group);
        }
        await queryClient.invalidateQueries({ queryKey: ["fixtures"] });
      } finally {
        bulkRefreshInFlightRef.current = false;
      }
    })();
  }, [visibleFixtures, refreshVisibleOdds, queryClient]);

  const loaderRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (
        entries[0].isIntersecting &&
        hasNextPage &&
        !isFetchingNextPage &&
        typeof fetchNextPage === "function"
      ) {
        fetchNextPage();
      }
    }, { threshold: 0.1, rootMargin: "200px", root: mainScrollRef.current });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    console.log("Filters:", { activeSport, activeLeague, timeFilter });
    console.log("Fixtures count:", visibleFixtures.length);
  }, [activeSport, activeLeague, timeFilter, visibleFixtures.length]);

  const selectedMatch = visibleFixtures.find((m) => String(m.id) === String(selectedMatchId));

  const isLiveView = view === "live";
  const isGamesView = view === "games";
  const isFastKenoView = view === "fast-keno";
  const isVirtualView = view === "virtual";
  const isComingSoonView = view === "coming-soon";
  const isSportFiltersView = view === "sport";
  const canShowSidebar = view === "home" || view === "detail" || view === "live";

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-brand-dark">
      {!isFastKenoView && <Header
        user={user}
        authLoading={authLoading}
        onAuth={handleAuth}
        onSignOut={handleSignOut}
        onLogoClick={() => {
          setMobileMenuOpen(false);
          setActiveNavView("home");
          setView("home");
          setSelectedMatchId(null);
          pushPath("/");
        }}
        onOpenDeposit={() => {
          setActiveNavView("account");
          setAccountPanelTab("deposit");
          setView("account");
          pushPath("/user/profile");
        }}
        onOpenWithdraw={() => {
          setActiveNavView("account");
          setAccountPanelTab("withdraw");
          setView("account");
          pushPath("/user/withdraw");
        }}
        onOpenBetsHistory={() => {
          setActiveNavView("account");
          setAccountPanelTab("bets");
          setView("account");
          pushPath("/user/bets");
        }}
        onOpenCheckTicket={() => {
          setActiveNavView("account");
          setAccountPanelTab("ticket");
          setView("account");
          pushPath("/user/ticket");
        }}
      />}
      {view !== "fast-keno" && (
        <>
          <Navbar
            currentView={view === "detail" ? "home" : activeNavView}
            onViewChange={handleViewChange}
          />
          <div className="h-px lg:h-1.5 w-full bg-gradient-to-b from-black to-transparent opacity-50 relative z-[85]" />
        </>
      )}

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="fixed left-0 top-0 bottom-0 z-[170] w-[360px] max-w-[92vw] lg:hidden"
            >
              <div className="h-full bg-brand-dark border-r border-brand-border shadow-2xl overflow-y-auto no-scrollbar">
                <div className="h-[54px] bg-brand-primary flex items-center justify-between px-4">
                  <button type="button" onClick={() => setMobileMenuOpen(false)} className="text-black/80 hover:text-black">
                    <X className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setActiveNavView("home");
                      setView("home");
                      setSelectedMatchId(null);
                      pushPath("/");
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-base font-black text-black italic tracking-tighter">king5</span>
                      <div className="bg-black text-[#a3e635] px-1 py-0.5 mt-[-1px] rounded-sm transform">
                        <span className="text-[8px] font-black italic">bet</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-2.5 bg-white/20 rounded-sm overflow-hidden border border-black/10">
                      <img src="https://flagcdn.com/w20/gb.png" alt="EN" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-black font-bold text-[11px] uppercase italic">EN</span>
                  </div>
                </div>

                <div className="py-2">
                  {[
                    { label: "PROMOTIONS", icon: CircleHelp, view: "promotions" },
                    { label: "SPORTS", icon: Trophy, view: "sport" },
                    { label: "LIVE", icon: Activity, view: "live" },
                    { label: "GAMES", icon: Smartphone, view: "games" },
                    { label: "VIRTUAL SPORTS", icon: Clock, view: "virtual" },
                    { label: "RESULTS", icon: FileText, view: "results" },
                    { label: "CHECK TICKET", icon: Search, view: "check-ticket" },
                    { label: "RULES", icon: Globe, view: "rules" },
                    { label: "CONTACTS", icon: Phone, view: "contacts" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (item.view === "check-ticket") {
                          setActiveNavView("account");
                          setAccountPanelTab("ticket");
                          setView("account");
                          pushPath("/user/ticket");
                          return;
                        }
                        if (item.view === "results" || item.view === "rules" || item.view === "contacts") {
                          setActiveNavView(item.view);
                          setComingSoonTitle(`${item.label} (Coming Soon)`);
                          setView("coming-soon");
                          return;
                        }
                        handleViewChange(item.view);
                      }}
                      className="w-full px-4 py-4 border-b border-white/5 flex items-center gap-3 text-left"
                    >
                      <item.icon className="w-5 h-5 text-white/80" />
                      <span className="text-white font-black uppercase italic tracking-tight text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {canShowSidebar && isDesktop && (
          <div className="hidden lg:block">
            <Sidebar 
              activeSport={activeSport} 
              onSportChange={(id) => {
                setActiveSport(id);
                if (id) setFixturesTab("upcoming");
              }}
              activeLeague={activeLeague}
              onLeagueChange={({ name, id, apiFootballLeagueId, sportId, country }) => {
                setActiveLeague(name);
                setActiveLeagueId(id);
                setActiveApiFootballLeagueId(apiFootballLeagueId);
                setActiveCountry(country || null);
                if (sportId) {
                  setActiveSport(String(sportId));
                }
                setFixturesTab("upcoming");
              }}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              isHot={fixturesTab === "top"}
              onIsHotChange={(v) => setFixturesTab(v ? "top" : "upcoming")}
            />
          </div>
        )}

        <main
          ref={(el) => {
            mainScrollRef.current = el;
          }}
          className={`flex-1 ${selectedMatchId ? "overflow-hidden" : "overflow-y-auto w-full"} ${isGamesView || isVirtualView ? "bg-brand-dark" : "p-0"} ${isFastKenoView ? "pb-0 lg:pb-0" : "pb-32 lg:pb-10"}`}
        >
          {isSportFiltersView ? (
            <div className="p-0 lg:hidden h-full">
              <Sidebar
                activeSport={activeSport}
                onSportChange={(id) => {
                  setActiveSport(id);
                  if (id) setFixturesTab("upcoming");
                }}
                activeLeague={activeLeague}
                onLeagueChange={({ name, id, apiFootballLeagueId, sportId, country }) => {
                  setActiveLeague(name);
                  setActiveLeagueId(id);
                  setActiveApiFootballLeagueId(apiFootballLeagueId);
                  setActiveCountry(country || null);
                  if (sportId) {
                    setActiveSport(String(sportId));
                  }
                  setFixturesTab("upcoming");
                  returnToMatchList();
                }}
                timeFilter={timeFilter}
                onTimeFilterChange={(filter) => {
                  setTimeFilter(filter);
                  returnToMatchList();
                }}
                isHot={fixturesTab === "top"}
                onIsHotChange={(v) => setFixturesTab(v ? "top" : "upcoming")}
                className="w-full border-r-0"
                applySportOnHeaderClick={false}
              />
            </div>
          ) : isComingSoonView ? (
            <ComingSoon title={comingSoonTitle} />
          ) : view === "account" ? (
            <div className="p-4 lg:p-0">
              <AccountPanelPage tab={accountPanelTab} onTabChange={setAccountPanelTab} user={user} />
            </div>
          ) : isFastKenoView ? (
            <FastKenoView
              user={user}
              authLoading={authLoading}
              onWalletChange={syncUserBalance}
            />
          ) : isGamesView ? (
            <GamesView user={user} onLoginRequired={() => handleAuth("login")} />
          ) : isLiveView ? (
            <LiveView />
          ) : isVirtualView ? (
            <VirtualSportsView />
          ) : (
            <div
              className={`flex flex-col lg:flex-row lg:gap-0 transition-all duration-300 ${selectedMatchId ? "items-start h-full" : ""} max-w-full`}
            >
              {/* Left Column: Match List */}
              <div
                className={`transition-all duration-300 ${selectedMatchId ? "hidden lg:block lg:w-[40%] h-full overflow-y-auto no-scrollbar" : "w-full"} p-0`}
              >
                {/* Banner Carousel */}
                {!selectedMatchId && banners.length > 0 && (
                  <div className="relative w-full h-[180px] lg:h-[260px] overflow-hidden mb-0 shadow-2xl group">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentBanner}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`absolute inset-0 ${banners[currentBanner].color}`}
                      >
                        <img
                          src={banners[currentBanner].image}
                          alt="Betting Banner"
                          className="absolute inset-0 h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Indicators */}
                    <div className="absolute bottom-4 left-6 lg:left-8 z-20 flex gap-1.5">
                      {banners.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentBanner(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${currentBanner === idx ? "bg-black w-6" : "bg-black/30"}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!selectedMatchId && (
                  <BettingFilters
                    activeProvider={activeProvider}
                    activeSport={activeSport}
                    activeLeague={activeLeague}
                    timeFilter={timeFilter}
                    searchValue={matchSearch}
                    onSportChange={(id) => {
                      setActiveSport(id);
                      setActiveLeague(null);
                      setActiveLeagueId(null);
                      setActiveApiFootballLeagueId(null);
                      setActiveCountry(null);
                      if (id) setFixturesTab("upcoming");
                    }}
                    onLeagueChange={({ name, id, apiFootballLeagueId, sportId, country }) => {
                      setActiveLeague(name);
                      setActiveLeagueId(id);
                      setActiveApiFootballLeagueId(apiFootballLeagueId);
                      setActiveCountry(country || null);
                      if (sportId) setActiveSport(String(sportId));
                      setFixturesTab("upcoming");
                    }}
                    onTimeFilterChange={setTimeFilter}
                    onSearchChange={setMatchSearch}
                  />
                )}

                {/* Match Headers - Sharp Style */}
                <div className="flex bg-black p-1 gap-1 border-b border-white/5">
                  <button
                    onClick={() => {
                      setFixturesTab("upcoming");
                      setSelectedMatchId(null);
                      pushPath("/");
                    }}
                    className={`px-6 py-2.5 font-black uppercase italic transition-all flex-1 rounded-sm text-[11px] tracking-widest ${fixturesTab === "upcoming" ? "bg-brand-primary text-black" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => {
                      setFixturesTab("top");
                      setSelectedMatchId(null);
                      pushPath("/");
                    }}
                    className={`px-6 py-2.5 font-black uppercase italic transition-all flex-1 rounded-sm text-[11px] tracking-widest ${fixturesTab === "top" ? "bg-brand-primary text-black" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                  >
                    Top Matches
                  </button>
                </div>

                {/* Matches List */}
                <div className="bg-brand-surface rounded-2xl overflow-hidden border border-brand-border shadow-xl">
                  {/* Header Grid (desktop only) */}
                  {selectedMatchId ? (
                    <div className="hidden lg:flex bg-brand-panel text-[9px] font-black text-gray-500 h-8 px-6 uppercase tracking-widest items-center border-b border-brand-border rounded-t-2xl justify-between">
                      <span className="text-[10px] text-brand-primary">Match List</span>
                    </div>
                  ) : (
                    <div className="hidden lg:grid bg-brand-panel text-[9px] font-black text-gray-500 h-8 px-6 uppercase tracking-widest items-center border-b border-brand-border rounded-t-2xl grid-cols-[1.5fr_1.5fr_1fr]">
                      <div className="text-left font-bold opacity-80 border-r border-white/50 h-full flex items-center">
                        Match Result
                      </div>
                      <div className=" font-bold text-center opacity-80 border-r border-white/50 h-full flex items-center justify-center">
                        Double chance
                      </div>
                      <div className="text-right font-bold pr-2 opacity-80 h-full flex items-center justify-end">
                        Both Score
                      </div>
                    </div>
                  )}

                  {showFixturesSkeleton ? (
                    <MatchCardSkeletonList count={10} isCompact={!!selectedMatchId} />
                  ) : (
                    visibleFixtures.map((match) => (
                      <MatchCard
                        key={canonicalKey(match)}
                        match={match}
                        selectedBets={selectedBets}
                        onToggleBet={toggleBet}
                        onClick={handleMatchClick}
                        onRequestRefreshOdds={requestRefreshOdds}
                        isCompact={!!selectedMatchId}
                        isSelected={selectedMatchId === match.id}
                      />
                    ))
                  )}
                  
                  <div ref={loaderRef} className="h-10 flex items-center justify-center">
                    {isFetchingNextPage && (
                       <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ scale: [1, 1.5, 1] }}
                              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-brand-primary"
                            />
                          ))}
                       </div>
                    )}
                  </div>
                  
                  {!hasNextPage && visibleFixtures.length > 0 && (
                    <div className="p-8 text-center text-gray-600 text-[10px] font-black uppercase italic tracking-widest">
                      No more matches to show
                    </div>
                  )}

                  {fixturesQueryStatus === 'success' && visibleFixtures.length === 0 && (
                    <div className="p-12 text-center">
                      <div className="text-gray-500 text-[11px] font-black uppercase italic mb-2">No matches found</div>
                      <button 
                        onClick={clearMatchFilters}
                        className="text-brand-primary text-[10px] font-black uppercase italic underline"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Match Detail */}
              {selectedMatch && (
                <div className="w-full lg:w-[55%] h-full animate-in fade-in slide-in-from-right-4 duration-300 p-0 lg:p-0 overflow-hidden">
                  <MatchDetail
                    match={selectedMatch}
                    selectedBets={selectedBets}
                    onToggleBet={toggleBet}
                    onBack={() => {
                      setSelectedMatchId(null);
                      setView("home");
                      pushPath("/");
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sidebar/Drawer: Betslip */}
        {view !== "games" && view !== "virtual" && view !== "account" && view !== "fast-keno" && (
      <Betslip
        selectedBets={selectedBets}
        onRemoveBet={removeBet}
        onClear={() => {
          setSelectedBetsBySlot((prevBySlot) => ({ ...prevBySlot, [activeSlipSlot]: [] }));
          setBetslipNotice(null);
        }}
        activeSlot={activeSlipSlot}
        onChangeSlot={(slot) => {
          setActiveSlipSlot(slot);
          setBetslipNotice(null);
        }}
        slotCounts={{
          1: selectedBetsBySlot[1].length,
          2: selectedBetsBySlot[2].length,
          3: selectedBetsBySlot[3].length,
        }}
        stake={stake}
        onStakeChange={setStake}
        isOpen={isBetslipOpen}
        onClose={() => {
          setIsBetslipOpen(false);
          setBetslipNotice(null);
          replacePath("/");
        }}
        isAuthenticated={hasToken}
        authLoading={authLoading}
        onRequireAuth={() => setAuthModal({ open: true, type: "login" })}
        notice={betslipNotice}
      />
        )}
      </div>

      {/* Floating Betslip Button (Mobile Only) */}
      {selectedBets.length > 0 && !isBetslipOpen && (
        <div className="fixed bottom-24 right-4 z-[95] lg:hidden">
          <button
            onClick={() => {
              setIsBetslipOpen(true);
              pushPath("/betslip");
            }}
            className="w-16 h-16 bg-brand-primary text-black rounded-full shadow-[0_10px_30px_rgba(189,233,30,0.24)] flex flex-col items-center justify-center border-4 border-brand-dark active:scale-90 transition-all group"
          >
            <div className="relative">
              <Smartphone className="w-6 h-6" />
              <div className="absolute -top-2 -right-2 bg-brand-danger text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-brand-dark">
                {selectedBets.length}
              </div>
            </div>
            <span className="text-[8px] font-black uppercase italic mt-1">
              Ticket
            </span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      {!isFastKenoView && (
        <MobileBottomNav
          currentView={view}
          onViewChange={handleViewChange}
          onMenuOpen={() => setMobileMenuOpen(true)}
          scrollElement={mainScrollRef.current}
        />
      )}


      <AuthModal
        isOpen={authModal.open}
        type={authModal.type}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        onSwitch={(type) => setAuthModal({ open: true, type })}
          onSuccess={(data) => setUser(data)}
      />
      <PublicTicketModal
        isOpen={!!publicTicketCode}
        ticket={publicTicket}
        isLoading={publicTicketLoading}
        error={publicTicketError}
        onClose={closePublicTicket}
        onRefresh={() => setPublicTicketRefresh((v) => v + 1)}
      />
    </div>
  );
}
