import { Globe } from "lucide-react";
import { Match, BetSelection } from "../../types";
import { CountryFlag } from "../common/CountryFlag";
import React from "react";

function normalizeMarketKey(value?: string | null): string {
  const key = String(value || "").trim().toLowerCase();
  if (key === "1x2" || key === "match result") return "1X2";
  if (key === "dc" || key === "double chance") return "DC";
  if (key === "bts" || key === "both teams to score") return "BTS";
  return key.toUpperCase();
}

interface MatchCardProps {
  key?: string | number;
  match: Match;
  selectedBets: BetSelection[];
  onToggleBet: (
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
  ) => void;
  onClick: (matchId: string) => void;
  onRequestRefreshOdds?: (matchId: string) => void;
  isCompact?: boolean;
  isSelected?: boolean;
}

export default function MatchCard({
  match,
  selectedBets,
  onToggleBet,
  onClick,
  onRequestRefreshOdds,
  isCompact = false,
  isSelected = false,
}: MatchCardProps) {
  const visiblePricesCount = (() => {
    const n = Number(match.pricesCount || 0);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n;
  })();

  const isBetSelected = (market: string, selection: string) =>
    selectedBets.some(
      (b) =>
        b.matchId === match.id &&
        b.market === market &&
        b.selection === selection,
    );

  const pickBestMarket = (canonicalKey: string) => {
    const markets = (match.markets as any[]) || [];
    const candidates = markets.filter((m: any) => normalizeMarketKey(m?.key) === canonicalKey);
    if (candidates.length <= 1) return candidates[0];

    const parseTime = (value: any) => {
      const t = value ? new Date(value).getTime() : 0;
      return Number.isFinite(t) ? t : 0;
    };

    const isRenderableOutcome = (o: any) => {
      const name = String(o?.label ?? o?.name ?? o?.outcomeKey ?? o?.key ?? '').trim();
      if (!name) return false;
      const status = String(o?.status ?? "active").toLowerCase();
      if (status !== "active") return false;
      if (o?.isActive === false) return false;
      const odds = Number(o?.displayOdds ?? o?.odds ?? 0);
      return Number.isFinite(odds) && odds > 0;
    };


    const scoreMarket = (m: any) => {
      const outcomes = (m?.outcomes || []).filter(isRenderableOutcome);
      const latestFetched = outcomes.reduce(
        (acc: number, o: any) => Math.max(acc, parseTime(o?.lastFetchedAt)),
        0,
      );

      let hasRequiredSet = true;
      if (canonicalKey === "1X2") {
        const names = new Set(outcomes.map((o: any) => String(o?.name ?? "").trim()));
        hasRequiredSet = names.has("1") && names.has("X") && names.has("2");
      }

      return { m, hasRequiredSet, latestFetched, count: outcomes.length };
    };

    return candidates
      .map(scoreMarket)
      .sort(
        (a, b) =>
          (b.hasRequiredSet ? 1 : 0) - (a.hasRequiredSet ? 1 : 0) ||
          b.latestFetched - a.latestFetched ||
          b.count - a.count,
      )[0]?.m;
  };

  const bestOneXTwoMarket = pickBestMarket("1X2");
  const bestDoubleChanceMarket = pickBestMarket("DC");
  const bestBtsMarket = pickBestMarket("BTS");
  const bestSpreadMarket = pickBestMarket("SP");
  const bestTotalMarket = pickBestMarket("OU");

  const findOutcomeMeta = (outcomeId?: string, fallbackMarket?: any, selectionName?: string) => {
    const markets = (match.markets as any[]) || [];
    const normalize = (v: any) => String(v || "").trim().toUpperCase();
    const target = selectionName ? normalize(selectionName) : null;

    if (outcomeId) {
      for (const m of markets) {
        const found = (m?.outcomes || []).find((o: any) => o?.id === outcomeId);
        if (found) return found;
      }
    }

    if (target && fallbackMarket) {
      return (fallbackMarket.outcomes || []).find((o: any) => {
        const candidates = [
          o.outcomeKey,
          o.displayKey,
          o.label,
          o.name,
          o.key
        ].map(normalize);
        return candidates.includes(target);
      });
    }

    return null;
  };


  const outcomeOddsValue = (o: any, fallback = 0) => {
    const v = Number(o?.displayOdds ?? o?.display_odds ?? o?.odds ?? o?.rawOdds ?? o?.raw_odds ?? fallback ?? 0);
    return Number.isFinite(v) ? v : 0;
  };

  const normalizeBool = (v: any) => (v === true ? true : v === false ? false : undefined);
  const normalizeNumOrNull = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  const metaHome = findOutcomeMeta(match.outcomeIds?.home, bestOneXTwoMarket, "1");
  const metaDraw = findOutcomeMeta(match.outcomeIds?.draw, bestOneXTwoMarket, "X");
  const metaAway = findOutcomeMeta(match.outcomeIds?.away, bestOneXTwoMarket, "2");
  const metaDc1x = findOutcomeMeta(match.outcomeIds?.dc1x, bestDoubleChanceMarket, "1X");
  const metaDc12 = findOutcomeMeta(match.outcomeIds?.dc12, bestDoubleChanceMarket, "12");
  const metaDcX2 = findOutcomeMeta(match.outcomeIds?.dcx2, bestDoubleChanceMarket, "X2");
  const metaBtsYes = findOutcomeMeta(match.outcomeIds?.btsYes, bestBtsMarket, "YES");
  const metaBtsNo = findOutcomeMeta(match.outcomeIds?.btsNo, bestBtsMarket, "NO");
  const metaSpHome = findOutcomeMeta(match.outcomeIds?.spHome, bestSpreadMarket);
  const metaSpAway = findOutcomeMeta(match.outcomeIds?.spAway, bestSpreadMarket);
  const metaOuOver = findOutcomeMeta(match.outcomeIds?.ouOver, bestTotalMarket, "OVER");
  const metaOuUnder = findOutcomeMeta(match.outcomeIds?.ouUnder, bestTotalMarket, "UNDER");

  const useSportsGameOddsMainMarkets = false;


  const OddsButton = ({
    market,
    sel,
    odd,
    outcomeId,
    outcomeKey,
    acceptedOddsVersion,
    lastFetchedAt,
    status,
    uiStatus,
    isSelectable,
    ageSeconds,
    maxAgeSeconds,
    disabledReason,
    displayOdds,
    rawOdds,
  }: {
    market: string;
    sel: string;
    odd: number;
    outcomeId?: string;
    outcomeKey?: string;
    acceptedOddsVersion?: number;
    lastFetchedAt?: string;
    status?: string;
    uiStatus?: "fresh" | "warning" | "expired" | "suspended" | "closed";
    isSelectable?: boolean;
    ageSeconds?: number | null;
    maxAgeSeconds?: number | null;
    disabledReason?: string | null;
    displayOdds?: number | null;
    rawOdds?: number | null;
  }) => {
    const hasOdd = Number.isFinite(Number(odd)) && Number(odd) > 0;
    const normalizedStatus = String(status ?? "").toLowerCase();
    const frontendDisabledReason =
      normalizedStatus === "suspended" || uiStatus === "suspended"
        ? "SUSPENDED"
        : normalizedStatus === "closed" || uiStatus === "closed"
          ? "CLOSED"
          : null;
    const blocked =
      normalizedStatus === "suspended" ||
      normalizedStatus === "closed" ||
      uiStatus === "suspended" ||
      uiStatus === "closed";

    const hardDisabled =
      normalizedStatus === "suspended" ||
      normalizedStatus === "closed" ||
      uiStatus === "suspended" ||
      uiStatus === "closed";

    const displayOddText = hasOdd ? Number(odd).toFixed(2) : "-";

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!hasOdd) return;
          if (blocked) {
            if (onRequestRefreshOdds) onRequestRefreshOdds(match.id);
            return;
          }
          const version = acceptedOddsVersion ?? (outcomeId ? 1 : undefined);
          const selectionKey = String(outcomeKey ?? outcomeId ?? "").trim();
          onToggleBet(match, market, sel, odd, outcomeId, selectionKey || undefined, version, lastFetchedAt, status, uiStatus);
        }}
        disabled={hardDisabled || !hasOdd}
        aria-disabled={blocked}
        className={`relative flex items-center justify-between px-2 h-8 flex-1 text-[10px] font-bold rounded-lg transition-all border shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.28)] ${
          isBetSelected(market, sel)
            ? "bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/20 scale-[1.01]"
            : "bg-brand-panel text-gray-300 border-brand-line hover:bg-brand-muted hover:border-brand-primary/35 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(189,233,30,0.06)]"
        } ${(blocked || !hasOdd) ? "opacity-60 hover:bg-transparent" : "active:scale-95"}`}
      >
        <span
          className={`uppercase tracking-tighter ${isBetSelected(market, sel) ? "text-black/60" : "text-gray-400"}`}
        >
          {sel}
        </span>
        <span
          className={
            isBetSelected(market, sel)
              ? "text-black font-black text-[12px]"
              : "text-white font-bold text-[12px]"
          }
        >
          {displayOddText}
        </span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Card Layout */}
      <div
        className={`lg:hidden flex flex-col bg-brand-surface border rounded-xl p-3 mb-2 gap-3 cursor-pointer active:scale-[0.99] transition-all relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_5px_14px_rgba(0,0,0,0.2)] ${
          isSelected ? "border-brand-primary/45 shadow-lg shadow-brand-primary/8" : "border-white/10 hover:border-white/18"
        }`}
        onClick={() => onClick(match.id)}
      >
        {/* Subtle Glow Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex justify-between items-start relative z-10">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <CountryFlag country={match.country || null} className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                {(match.country ? `${match.country} - ` : "") + (match.league || "")}
              </span>
            </div>
            <h3 className="text-[14px] font-bold text-white leading-tight truncate">
              {match.homeTeam}
            </h3>
            <h3 className="text-[14px] font-bold text-white leading-tight truncate">
              {match.awayTeam}
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1 ml-4">
            <div className="flex flex-col items-end">
               <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider tabular-nums">
                {match.date}
              </span>
              <span className="text-[9px] font-bold text-brand-primary uppercase tabular-nums">
                {match.time}
              </span>
            </div>
            <div className="bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
              <span className="text-[8px] font-black text-white/60">
                +{visiblePricesCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 h-9 relative z-10">
          <OddsButton
            market={useSportsGameOddsMainMarkets ? "Spread" : "Match Result"}
            sel={useSportsGameOddsMainMarkets ? "Home" : "1"}
            odd={useSportsGameOddsMainMarkets ? outcomeOddsValue(metaSpHome, match.odds.spHome || 0) : outcomeOddsValue(metaHome, match.odds.home)}
            outcomeId={useSportsGameOddsMainMarkets ? (match.outcomeIds?.spHome ?? metaSpHome?.id) : (match.outcomeIds?.home ?? metaHome?.id)}
            outcomeKey={useSportsGameOddsMainMarkets ? (metaSpHome?.outcomeKey ?? metaSpHome?.sourceSelectionId ?? metaSpHome?.key) : (metaHome?.outcomeKey ?? metaHome?.sourceSelectionId ?? metaHome?.key)}
            acceptedOddsVersion={useSportsGameOddsMainMarkets ? (metaSpHome?.oddsVersion ?? (match.outcomeIds?.spHome ? 1 : undefined)) : (metaHome?.oddsVersion ?? (match.outcomeIds?.home ? 1 : undefined))}
            lastFetchedAt={useSportsGameOddsMainMarkets ? metaSpHome?.lastFetchedAt : metaHome?.lastFetchedAt}
            status={useSportsGameOddsMainMarkets ? metaSpHome?.status : metaHome?.status}
            uiStatus={useSportsGameOddsMainMarkets ? metaSpHome?.uiStatus : metaHome?.uiStatus}
            isSelectable={normalizeBool((useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.isSelectable ?? (useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.is_selectable)}
            ageSeconds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.ageSeconds ?? (useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.age_seconds)}
            maxAgeSeconds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.maxAgeSeconds ?? (useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.max_age_seconds)}
            disabledReason={(useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.disabledReason ?? (useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.disabled_reason ?? null}
            displayOdds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.displayOdds ?? (useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.display_odds)}
            rawOdds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.rawOdds ?? (useSportsGameOddsMainMarkets ? metaSpHome : metaHome)?.raw_odds)}
          />
          <OddsButton
            market={useSportsGameOddsMainMarkets ? "Total" : "Match Result"}
            sel={useSportsGameOddsMainMarkets ? "Over" : "X"}
            odd={useSportsGameOddsMainMarkets ? outcomeOddsValue(metaOuOver, match.odds.ouOver || 0) : outcomeOddsValue(metaDraw, match.odds.draw)}
            outcomeId={useSportsGameOddsMainMarkets ? (match.outcomeIds?.ouOver ?? metaOuOver?.id) : (match.outcomeIds?.draw ?? metaDraw?.id)}
            outcomeKey={useSportsGameOddsMainMarkets ? (metaOuOver?.outcomeKey ?? metaOuOver?.sourceSelectionId ?? metaOuOver?.key) : (metaDraw?.outcomeKey ?? metaDraw?.sourceSelectionId ?? metaDraw?.key)}
            acceptedOddsVersion={useSportsGameOddsMainMarkets ? (metaOuOver?.oddsVersion ?? (match.outcomeIds?.ouOver ? 1 : undefined)) : (metaDraw?.oddsVersion ?? (match.outcomeIds?.draw ? 1 : undefined))}
            lastFetchedAt={useSportsGameOddsMainMarkets ? metaOuOver?.lastFetchedAt : metaDraw?.lastFetchedAt}
            status={useSportsGameOddsMainMarkets ? metaOuOver?.status : metaDraw?.status}
            uiStatus={useSportsGameOddsMainMarkets ? metaOuOver?.uiStatus : metaDraw?.uiStatus}
            isSelectable={normalizeBool((useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.isSelectable ?? (useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.is_selectable)}
            ageSeconds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.ageSeconds ?? (useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.age_seconds)}
            maxAgeSeconds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.maxAgeSeconds ?? (useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.max_age_seconds)}
            disabledReason={(useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.disabledReason ?? (useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.disabled_reason ?? null}
            displayOdds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.displayOdds ?? (useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.display_odds)}
            rawOdds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.rawOdds ?? (useSportsGameOddsMainMarkets ? metaOuOver : metaDraw)?.raw_odds)}
          />
          <OddsButton
            market={useSportsGameOddsMainMarkets ? "Spread" : "Match Result"}
            sel={useSportsGameOddsMainMarkets ? "Away" : "2"}
            odd={useSportsGameOddsMainMarkets ? outcomeOddsValue(metaSpAway, match.odds.spAway || 0) : outcomeOddsValue(metaAway, match.odds.away)}
            outcomeId={useSportsGameOddsMainMarkets ? (match.outcomeIds?.spAway ?? metaSpAway?.id) : (match.outcomeIds?.away ?? metaAway?.id)}
            outcomeKey={useSportsGameOddsMainMarkets ? (metaSpAway?.outcomeKey ?? metaSpAway?.sourceSelectionId ?? metaSpAway?.key) : (metaAway?.outcomeKey ?? metaAway?.sourceSelectionId ?? metaAway?.key)}
            acceptedOddsVersion={useSportsGameOddsMainMarkets ? (metaSpAway?.oddsVersion ?? (match.outcomeIds?.spAway ? 1 : undefined)) : (metaAway?.oddsVersion ?? (match.outcomeIds?.away ? 1 : undefined))}
            lastFetchedAt={useSportsGameOddsMainMarkets ? metaSpAway?.lastFetchedAt : metaAway?.lastFetchedAt}
            status={useSportsGameOddsMainMarkets ? metaSpAway?.status : metaAway?.status}
            uiStatus={useSportsGameOddsMainMarkets ? metaSpAway?.uiStatus : metaAway?.uiStatus}
            isSelectable={normalizeBool((useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.isSelectable ?? (useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.is_selectable)}
            ageSeconds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.ageSeconds ?? (useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.age_seconds)}
            maxAgeSeconds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.maxAgeSeconds ?? (useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.max_age_seconds)}
            disabledReason={(useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.disabledReason ?? (useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.disabled_reason ?? null}
            displayOdds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.displayOdds ?? (useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.display_odds)}
            rawOdds={normalizeNumOrNull((useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.rawOdds ?? (useSportsGameOddsMainMarkets ? metaSpAway : metaAway)?.raw_odds)}
          />
        </div>
      </div>

      {/* Desktop Card Layout */}
      <div
        className={`hidden lg:flex flex-col border border-brand-border rounded-lg mb-2 bg-brand-surface hover:bg-brand-panel hover:border-brand-line transition-all cursor-pointer group/card px-4 relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_6px_18px_rgba(0,0,0,0.16)] ${
          isSelected
            ? "bg-brand-primary/[0.04] border-brand-primary/45 border-l-4 border-l-brand-primary"
            : "border-l-4 border-l-white/10"
        }`}
        onClick={() => onClick(match.id)}
      >
        {/* Subtle Glow Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />

        {/* HOT badge removed */}
        
        {/* Row 1: League & Time */}
        <div className="flex items-center justify-between pt-2 pb-0.5 relative z-10">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <CountryFlag country={match.country || null} className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider truncate">
              {(match.country ? `${match.country} - ` : "") + (match.league || "")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tabular-nums text-gray-500 uppercase">
              {match.date}
            </span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/10" />
            <span className="text-[9px] font-bold tabular-nums text-brand-primary uppercase">
              {match.time}
            </span>
          </div>
        </div>

        {/* Row 2: Teams & Main Action */}
        <div className="flex items-center justify-between py-1 relative z-10">
          <div
          className={`font-bold text-white truncate transition-all ${isCompact ? "text-[12px] flex-1" : "text-[14px]"}`}
        >
          {match.homeTeam} <span className="text-gray-600 font-medium px-0.5">v</span> {match.awayTeam}
        </div>
          
          {/* Side-View compact odds: Only show Match Result row when compact */}
          {isCompact && (
            <div className="flex gap-1 ml-4 w-[160px] shrink-0">
               <OddsButton
                  market="Match Result" sel="1"
                  odd={outcomeOddsValue(metaHome, match.odds.home)}
                  outcomeId={match.outcomeIds?.home ?? metaHome?.id}
                  outcomeKey={metaHome?.outcomeKey ?? metaHome?.sourceSelectionId ?? metaHome?.key}
                  acceptedOddsVersion={metaHome?.oddsVersion}
                />
                <OddsButton
                  market="Match Result" sel="X"
                  odd={outcomeOddsValue(metaDraw, match.odds.draw)}
                  outcomeId={match.outcomeIds?.draw ?? metaDraw?.id}
                  outcomeKey={metaDraw?.outcomeKey ?? metaDraw?.sourceSelectionId ?? metaDraw?.key}
                  acceptedOddsVersion={metaDraw?.oddsVersion}
                />
                <OddsButton
                  market="Match Result" sel="2"
                  odd={outcomeOddsValue(metaAway, match.odds.away)}
                  outcomeId={match.outcomeIds?.away ?? metaAway?.id}
                  outcomeKey={metaAway?.outcomeKey ?? metaAway?.sourceSelectionId ?? metaAway?.key}
                  acceptedOddsVersion={metaAway?.oddsVersion}
                />
            </div>
          )}

          {!isCompact && (
            <div className="bg-brand-primary/15 px-1.5 py-0.5 rounded-md border border-brand-primary/30 shadow-sm">
              <span className="text-brand-primary text-[9px] font-black uppercase tracking-tight">
                +{visiblePricesCount}
              </span>
            </div>
          )}
        </div>

        {/* Row 3: Buttons Grid - Only show when NOT compact */}
        {!isCompact && (
          <div
            className="grid items-center gap-3 grid-cols-[1.5fr_1.5fr_1fr] pb-2 mt-1 relative z-10"
          >
            {/* Match Result Group */}
            <div className="flex gap-1.5 w-full pr-4 border-r border-white/10 py-1">
              {useSportsGameOddsMainMarkets ? (
                <>
                  <OddsButton
                    market="Spread"
                    sel="Home"
                    odd={outcomeOddsValue(metaSpHome, match.odds.spHome || 0)}
                    outcomeId={match.outcomeIds?.spHome ?? metaSpHome?.id}
                    outcomeKey={metaSpHome?.outcomeKey ?? metaSpHome?.sourceSelectionId ?? metaSpHome?.key}
                    acceptedOddsVersion={metaSpHome?.oddsVersion}
                    lastFetchedAt={metaSpHome?.lastFetchedAt}
                    status={metaSpHome?.status}
                    uiStatus={metaSpHome?.uiStatus}
                  />
                  <OddsButton
                    market="Spread"
                    sel="Away"
                    odd={outcomeOddsValue(metaSpAway, match.odds.spAway || 0)}
                    outcomeId={match.outcomeIds?.spAway ?? metaSpAway?.id}
                    outcomeKey={metaSpAway?.outcomeKey ?? metaSpAway?.sourceSelectionId ?? metaSpAway?.key}
                    acceptedOddsVersion={metaSpAway?.oddsVersion}
                    lastFetchedAt={metaSpAway?.lastFetchedAt}
                    status={metaSpAway?.status}
                    uiStatus={metaSpAway?.uiStatus}
                  />
                </>
              ) : (
                <>
                  <OddsButton
                    market="Match Result"
                    sel="1"
                    odd={outcomeOddsValue(metaHome, match.odds.home)}
                    outcomeId={match.outcomeIds?.home ?? metaHome?.id}
                    outcomeKey={metaHome?.outcomeKey ?? metaHome?.sourceSelectionId ?? metaHome?.key}
                    acceptedOddsVersion={metaHome?.oddsVersion}
                  />
                  <OddsButton
                    market="Match Result"
                    sel="X"
                    odd={outcomeOddsValue(metaDraw, match.odds.draw)}
                    outcomeId={match.outcomeIds?.draw ?? metaDraw?.id}
                    outcomeKey={metaDraw?.outcomeKey ?? metaDraw?.sourceSelectionId ?? metaDraw?.key}
                    acceptedOddsVersion={metaDraw?.oddsVersion}
                  />
                  <OddsButton
                    market="Match Result"
                    sel="2"
                    odd={outcomeOddsValue(metaAway, match.odds.away)}
                    outcomeId={match.outcomeIds?.away ?? metaAway?.id}
                    outcomeKey={metaAway?.outcomeKey ?? metaAway?.sourceSelectionId ?? metaAway?.key}
                    acceptedOddsVersion={metaAway?.oddsVersion}
                  />
                </>
              )}
            </div>

            {/* Double Chance Group */}
            <div className="flex gap-1.5 w-full px-4 border-r border-white/10 py-1">
              {useSportsGameOddsMainMarkets ? (
                <>
                  <OddsButton
                    market="Total"
                    sel="Over"
                    odd={outcomeOddsValue(metaOuOver, match.odds.ouOver || 0)}
                    outcomeId={match.outcomeIds?.ouOver ?? metaOuOver?.id}
                    outcomeKey={metaOuOver?.outcomeKey ?? metaOuOver?.sourceSelectionId ?? metaOuOver?.key}
                    acceptedOddsVersion={metaOuOver?.oddsVersion}
                    lastFetchedAt={metaOuOver?.lastFetchedAt}
                    status={metaOuOver?.status}
                    uiStatus={metaOuOver?.uiStatus}
                  />
                  <OddsButton
                    market="Total"
                    sel="Under"
                    odd={outcomeOddsValue(metaOuUnder, match.odds.ouUnder || 0)}
                    outcomeId={match.outcomeIds?.ouUnder ?? metaOuUnder?.id}
                    outcomeKey={metaOuUnder?.outcomeKey ?? metaOuUnder?.sourceSelectionId ?? metaOuUnder?.key}
                    acceptedOddsVersion={metaOuUnder?.oddsVersion}
                    lastFetchedAt={metaOuUnder?.lastFetchedAt}
                    status={metaOuUnder?.status}
                    uiStatus={metaOuUnder?.uiStatus}
                  />
                </>
              ) : (
                <>
                  <OddsButton
                    market="Double Chance"
                    sel="1X"
                    odd={outcomeOddsValue(metaDc1x, match.odds.dc1x)}
                    outcomeId={match.outcomeIds?.dc1x ?? metaDc1x?.id}
                    outcomeKey={metaDc1x?.outcomeKey ?? metaDc1x?.sourceSelectionId ?? metaDc1x?.key}
                    acceptedOddsVersion={metaDc1x?.oddsVersion}
                  />
                  <OddsButton
                    market="Double Chance"
                    sel="12"
                    odd={outcomeOddsValue(metaDc12, match.odds.dc12)}
                    outcomeId={match.outcomeIds?.dc12 ?? metaDc12?.id}
                    outcomeKey={metaDc12?.outcomeKey ?? metaDc12?.sourceSelectionId ?? metaDc12?.key}
                    acceptedOddsVersion={metaDc12?.oddsVersion}
                  />
                  <OddsButton
                    market="Double Chance"
                    sel="X2"
                    odd={outcomeOddsValue(metaDcX2, match.odds.dcx2)}
                    outcomeId={match.outcomeIds?.dcx2 ?? metaDcX2?.id}
                    outcomeKey={metaDcX2?.outcomeKey ?? metaDcX2?.sourceSelectionId ?? metaDcX2?.key}
                    acceptedOddsVersion={metaDcX2?.oddsVersion}
                  />
                </>
              )}
            </div>

            {/* Both Score Group */}
            <div className="flex gap-1.5 w-full pl-4 py-1">
              <OddsButton
                market="Both Score"
                sel="Yes"
                odd={outcomeOddsValue(metaBtsYes, match.odds.btsYes)}
                outcomeId={match.outcomeIds?.btsYes ?? metaBtsYes?.id}
                outcomeKey={metaBtsYes?.outcomeKey ?? metaBtsYes?.sourceSelectionId ?? metaBtsYes?.key}
                acceptedOddsVersion={metaBtsYes?.oddsVersion}
              />
              <OddsButton
                market="Both Score"
                sel="No"
                odd={outcomeOddsValue(metaBtsNo, match.odds.btsNo)}
                outcomeId={match.outcomeIds?.btsNo ?? metaBtsNo?.id}
                outcomeKey={metaBtsNo?.outcomeKey ?? metaBtsNo?.sourceSelectionId ?? metaBtsNo?.key}
                acceptedOddsVersion={metaBtsNo?.oddsVersion}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
