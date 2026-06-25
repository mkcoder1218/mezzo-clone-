import { useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import { useCatalog, useMezzoTopLeagues, usePissbetTopLeagues } from "../../modules/betting/hooks";

type LeagueFilter = {
  id: string | null;
  name: string | null;
  apiFootballLeagueId: string | null;
  sportId?: string | null;
  country?: string | null;
};

interface BettingFiltersProps {
  activeProvider?: string | null;
  activeSport: string | null;
  activeLeague: string | null;
  timeFilter: string;
  onSportChange: (id: string | null) => void;
  onLeagueChange: (params: LeagueFilter) => void;
  onTimeFilterChange: (filter: string) => void;
  onSearchChange: (value: string) => void;
  searchValue?: string;
}

const sportIcon: Record<string, string> = {
  football: "\u26BD",
  soccer: "\u26BD",
  basketball: "\uD83C\uDFC0",
  tennis: "\uD83C\uDFBE",
  volleyball: "\uD83C\uDFD0",
  baseball: "\u26BE",
  hockey: "\uD83C\uDFD2",
  cricket: "\uD83C\uDFCF",
};

function normalize(value: any) {
  return String(value || "").trim().toLowerCase();
}

function iconForSport(sport: any) {
  const key = normalize(sport?.slug || sport?.id || sport?.name);
  if (key.includes("football") || key.includes("soccer") || key === "501") return sportIcon.football;
  if (key.includes("basket") || key === "504") return sportIcon.basketball;
  if (key.includes("tennis") || key === "503") return sportIcon.tennis;
  if (key.includes("volley") || key === "505") return sportIcon.volleyball;
  if (key.includes("baseball")) return sportIcon.baseball;
  if (key.includes("hockey") || key === "502") return sportIcon.hockey;
  if (key.includes("cricket")) return sportIcon.cricket;
  return "\u25CF";
}

function isProviderLeagueId(value: string) {
  return /^comp_\d+$/i.test(value) || /^[a-z]+_[a-z0-9_]*_\d+$/i.test(value);
}

function leagueLabel(item: any) {
  const candidates = [
    item?.fullName,
    item?.competitionName,
    item?.leagueName,
    item?.name,
  ]
    .map((value) => String(value || "").trim())
    .filter((value) => value && !isProviderLeagueId(value));
  const name = candidates[0] || "";
  const country = String(item?.country || "").trim();
  if (!name) return "";
  return country && country !== name && !name.toLowerCase().startsWith(`${country.toLowerCase()} -`) ? `${country} - ${name}` : name;
}

function leagueQueryName(item: any) {
  return [
    item?.leagueName,
    item?.name,
    item?.competitionName,
    item?.fullName,
  ]
    .map((value) => String(value || "").trim())
    .find((value) => value && !isProviderLeagueId(value)) || "";
}

export default function BettingFilters({
  activeProvider,
  activeSport,
  activeLeague,
  timeFilter,
  onSportChange,
  onLeagueChange,
  onTimeFilterChange,
  onSearchChange,
  searchValue,
}: BettingFiltersProps) {
  const [localSearch, setLocalSearch] = useState("");
  const search = searchValue ?? localSearch;
  const { data: catalog } = useCatalog();
  const provider = normalize(activeProvider || (catalog as any)?.provider);
  const isStructured = catalog && !Array.isArray(catalog);
  const sports = (isStructured ? (catalog as any).sports : catalog) || [];
  const rawSports = (isStructured ? (catalog as any).rawSports : []) || [];
  const catalogTopLeagues = (isStructured && Array.isArray((catalog as any).topLeagues)) ? (catalog as any).topLeagues : [];

  const { data: pissbetTopLeaguesResp } = usePissbetTopLeagues(provider === "pissbet_socket");
  const { data: mezzoTopLeaguesResp } = useMezzoTopLeagues(provider === "mezzo");

  const sportItems = useMemo(() => {
    if (provider === "pissbet_socket") return [{ id: "football", name: "Football", count: 0 }];
    const mezzoSports = Array.isArray((mezzoTopLeaguesResp as any)?.sportList)
      ? (mezzoTopLeaguesResp as any).sportList.map((s: any) => ({
          id: String(s?.sportId || ""),
          name: String(s?.sportName || "Sport"),
          count: Number(s?.eventsCount || 0) || 0,
        }))
      : [];
    const list = provider === "mezzo" && mezzoSports.length ? mezzoSports : sports;
    return [...list]
      .filter((s: any) => String(s?.id || s?.slug || "").trim() && String(s?.name || "").trim())
      .sort((a: any, b: any) => (Number(b?.count ?? b?.eventCount ?? 0) || 0) - (Number(a?.count ?? a?.eventCount ?? 0) || 0))
      .slice(0, 8);
  }, [provider, sports, mezzoTopLeaguesResp]);

  const leagueItems = useMemo(() => {
    if (provider === "pissbet_socket") {
      return (Array.isArray((pissbetTopLeaguesResp as any)?.data) ? (pissbetTopLeaguesResp as any).data : [])
        .map((l: any) => ({
          id: String(l?.id ?? l?.competitionId ?? ""),
          label: leagueLabel(l),
          name: leagueQueryName(l),
          apiFootballLeagueId: null,
          sportId: "football",
          country: String(l?.country || "").trim() || null,
          count: Number(l?.eventsCount ?? l?.count ?? 0) || 0,
        }))
        .filter((l: any) => l.id && l.name && l.label && !isProviderLeagueId(l.name))
        .slice(0, 12);
    }

    if (provider === "mezzo") {
      return (Array.isArray((mezzoTopLeaguesResp as any)?.data) ? (mezzoTopLeaguesResp as any).data : [])
        .map((l: any) => ({
          id: String(l?.id ?? l?.competitionId ?? ""),
          label: leagueLabel(l),
          name: leagueQueryName(l),
          apiFootballLeagueId: null,
          sportId: l?.sportId ? String(l.sportId) : null,
          country: String(l?.country || "").trim() || null,
          count: Number(l?.eventsCount ?? 0) || 0,
        }))
        .filter((l: any) => l.id && l.name && l.label && !isProviderLeagueId(l.name))
        .slice(0, 12);
    }

    const rawTopLeagues = Array.isArray(rawSports) && rawSports.length
      ? rawSports.flatMap((s: any) =>
          (Array.isArray(s?.Leagues) ? s.Leagues : [])
            .filter((l: any) => Boolean(l?.isTop) || Boolean(l?.top) || Boolean(l?.is_top))
            .map((l: any) => ({ ...l, sportId: s.id || s.slug }))
        )
      : [];

    const source = catalogTopLeagues.length ? catalogTopLeagues : rawTopLeagues;

    return source
      .filter((l: any) => Number(l?.eventCount ?? l?.count ?? l?.oddsFixtureCount ?? 0) > 0)
      .map((l: any) => ({
        id: String(l?.sportsGameOddsLeagueId || l?.id || ""),
        label: String(l?.displayName || "").trim() || leagueLabel(l),
        name: leagueQueryName(l),
        apiFootballLeagueId: l?.apiFootballLeagueId ?? l?.api_football_league_id ?? null,
        sportId: l?.sportId ? String(l.sportId) : null,
        country: l?.country || null,
        count: Number(l?.eventCount ?? l?.count ?? l?.oddsFixtureCount ?? 0) || 0,
      }))
      .filter((l: any) => l.name && l.label && !isProviderLeagueId(l.name))
      .slice(0, 12);
  }, [provider, rawSports, catalogTopLeagues, pissbetTopLeaguesResp, mezzoTopLeaguesResp]);

  const setSearchValue = (value: string) => {
    setLocalSearch(value);
    onSearchChange(value);
  };

  return (
    <div className="bg-brand-surface border-y border-brand-border">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-2 border-b border-brand-border">
        <button type="button" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/80 flex items-center justify-center shrink-0">
          <Search className="w-4 h-4" />
        </button>
        {sportItems.map((sport: any) => {
          const id = String(sport?.id || sport?.slug || "");
          const active = activeSport === id;
          return (
            <button
              type="button"
              key={id}
              onClick={() => onSportChange(active ? null : id)}
              className={`h-8 px-3 rounded-full border text-[13px] font-bold flex items-center gap-2 shrink-0 transition-colors ${
                active ? "bg-brand-primary text-black border-brand-primary" : "bg-transparent text-white border-transparent hover:bg-white/5"
              }`}
            >
              <span>{iconForSport(sport)}</span>
              <span>{sport.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-2 border-b border-brand-border">
        {["30D", "1H", "3H", "6H", "12H", "Today", "Tomorrow"].map((label) => {
          const value = label === "30D" ? "All Time" : label === "Today" ? "24 Hours" : label === "Tomorrow" ? "3 Days" : label.replace("H", " Hour").replace("1 Hour", "1 Hour").replace("3 Hour", "3 Hours").replace("6 Hour", "6 Hours").replace("12 Hour", "12 Hours");
          const active = timeFilter === value || (label === "30D" && timeFilter === "All Time");
          return (
            <button
              key={label}
              type="button"
              onClick={() => onTimeFilterChange(value)}
              className={`h-8 px-3 rounded-full text-[12px] font-black shrink-0 transition-colors ${
                active ? "bg-brand-primary text-black" : "bg-brand-muted text-white hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
        <label className="h-8 px-3 rounded-full bg-brand-muted border border-brand-line flex items-center gap-2 text-white/80 text-[11px] font-bold shrink-0">
          <span>mm/dd/yyyy</span>
          <CalendarDays className="w-3 h-3" />
          <span>{"->"}</span>
          <span>mm/dd/yyyy</span>
          <CalendarDays className="w-3 h-3" />
        </label>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-2 border-b border-brand-border">
        <button
          type="button"
          onClick={() => onLeagueChange({ name: null, id: null, apiFootballLeagueId: null, sportId: null, country: null })}
          className={`h-8 px-3 rounded-full border text-[12px] font-bold shrink-0 ${
            !activeLeague ? "bg-brand-primary text-black border-brand-primary" : "bg-brand-muted text-white border-brand-line"
          }`}
        >
          All Leagues
        </button>
        {leagueItems.map((league: any) => {
          const active = activeLeague === league.name;
          return (
            <button
              key={`${league.id || league.name}-${league.sportId || ""}`}
              type="button"
              onClick={() =>
                onLeagueChange({
                  name: active ? null : league.name,
                  id: active ? null : league.id,
                  apiFootballLeagueId: active ? null : league.apiFootballLeagueId,
                  sportId: active ? null : league.sportId,
                  country: active ? null : league.country,
                })
              }
              className={`h-8 px-3 rounded-full border text-[12px] font-bold flex items-center gap-2 shrink-0 transition-colors ${
                active ? "bg-brand-primary text-black border-brand-primary" : "bg-brand-muted text-white border-brand-line hover:bg-white/10"
              }`}
            >
              <span>{league.label || league.name}</span>
            </button>
          );
        })}
      </div>

      <div className="px-3 py-3">
        <div className="h-11 rounded-xl border border-brand-line bg-brand-dark flex items-center px-3 gap-3">
          <input
            value={search}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search Match . . ."
            className="flex-1 bg-transparent outline-none text-white placeholder:text-white text-sm"
          />
          <Search className="w-5 h-5 text-brand-primary/75" />
        </div>
      </div>
    </div>
  );
}
