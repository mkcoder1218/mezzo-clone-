import { Trophy, ChevronRight, ChevronDown, Globe } from 'lucide-react';
import { TOP_LEAGUES } from '../../data';
import { useCatalog, useMezzoTopLeagues, usePissbetTopLeagues } from '../../modules/betting/hooks';
import { useState, useRef, useEffect } from 'react';
import SidebarSkeleton from './SidebarSkeleton';

function WorldGamesIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 680 680" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="world-games-clip">
          <circle cx="340" cy="340" r="240" />
        </clipPath>
      </defs>
      <circle cx="340" cy="340" r="240" fill="#2196F3" />
      <g clipPath="url(#world-games-clip)" fill="#4CAF50">
        <path d="M160 220Q180 200 200 215Q220 230 215 270Q210 310 195 340Q185 370 175 400Q160 430 155 400Q145 370 148 340Q150 300 148 270Q145 245 160 220Z" />
        <path d="M300 200Q330 190 350 200Q365 215 360 240Q355 260 345 265Q360 270 365 300Q370 340 360 380Q348 420 335 440Q320 420 310 380Q300 340 305 300Q310 270 320 260Q308 250 305 230Q300 215 300 200Z" />
        <path d="M380 190Q430 178 480 185Q520 192 530 220Q535 245 515 260Q490 270 460 268Q435 265 415 255Q395 245 380 225Q370 205 380 190Z" />
        <path d="M410 310Q450 300 485 315Q520 330 535 365Q548 395 525 425Q500 458 462 468Q430 476 405 455Q385 438 395 405Q405 375 430 360Q400 345 410 310Z" />
        <path d="M225 470Q250 455 280 465Q305 475 315 505Q325 535 300 555Q270 580 238 565Q210 552 210 520Q210 490 225 470Z" />
      </g>
      <circle cx="340" cy="340" r="240" fill="none" stroke="#90CAF9" strokeWidth="18" opacity="0.65" />
    </svg>
  );
}

function isWorldGamesName(name?: string | null) {
  const n = String(name || "").trim().toLowerCase();
  return n === "world" || n === "international" || n.includes("world cup") || n.includes("friendly internationals");
}

function normalizeLeagueLabel(name?: string | null) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^world\s+-\s+/i, "")
    .replace(/^international\s+-\s+/i, "");
}

function uniqueLeagueItems<T extends { name?: string | null; sportId?: any; count?: any; eventsCount?: any }>(items: T[]) {
  const byName = new Map<string, T>();
  for (const item of items) {
    const key = normalizeLeagueLabel(item.name);
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing || Number(item.eventsCount ?? item.count ?? 0) > Number(existing.eventsCount ?? existing.count ?? 0)) {
      byName.set(key, item);
    }
  }
  return Array.from(byName.values());
}

interface SidebarProps {
  activeSport: string | null;
  onSportChange: (id: string | null) => void;
  activeLeague: string | null;
  onLeagueChange: (params: { name: string | null; id: string | null; apiFootballLeagueId: string | null; sportId?: string | null; country?: string | null }) => void;
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  isHot: boolean;
  onIsHotChange: (val: boolean) => void;
  className?: string;
  applySportOnHeaderClick?: boolean;
}

export default function Sidebar({ 
  activeSport, 
  onSportChange, 
  activeLeague, 
  onLeagueChange, 
  timeFilter, 
  onTimeFilterChange,
  isHot,
  onIsHotChange,
  className,
  applySportOnHeaderClick = true
}: SidebarProps) {
  const [expandedSports, setExpandedSports] = useState<string[]>([]);
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSport = (sportId: string) => {
    setExpandedSports(prev => 
      prev.includes(sportId) 
        ? prev.filter(id => id !== sportId) 
        : [...prev, sportId]
    );
  };

  const { data: catalog, isLoading } = useCatalog();
  
  const isStructured = catalog && !Array.isArray(catalog);
  const sports = isStructured ? (catalog as any).sports : (catalog || []);
  const rawSports = isStructured ? (catalog as any).rawSports : null;
  const topLeagues = isStructured ? (catalog as any).topLeagues : TOP_LEAGUES;
  const isApiFootball = isStructured && (catalog as any).provider === "apifootball";
  const isTheStatsApi = isStructured && (catalog as any).provider === "thestatsapi";
  const isHttpFootballProvider = isApiFootball || isTheStatsApi;
  const isPissbet = isStructured && (catalog as any).provider === "pissbet_socket";
  const isMezzo = isStructured && (catalog as any).provider === "mezzo";

  const { data: pissbetTopLeaguesResp } = usePissbetTopLeagues(Boolean(isPissbet && !isMezzo));
  const pissbetTopLeagues = Array.isArray((pissbetTopLeaguesResp as any)?.data) ? (pissbetTopLeaguesResp as any).data : [];

  const { data: mezzoTopLeaguesResp } = useMezzoTopLeagues(Boolean(isMezzo));
  const mezzoTopLeaguesRaw = Array.isArray((mezzoTopLeaguesResp as any)?.data) ? (mezzoTopLeaguesResp as any).data : [];
  const mezzoTopLeagues = mezzoTopLeaguesRaw
    .map((l: any) => ({
      id: String(l?.id ?? l?.competitionId ?? ""),
      name: String(l?.name ?? l?.competitionName ?? l?.fullName ?? "").trim(),
      country: String(l?.country ?? "").trim(),
      sportId: l?.sportId ?? null,
      sportName: l?.sportName ?? null,
      eventsCount: Number(l?.eventsCount ?? 0) || 0,
      apiFootballLeagueId: null,
    }))
    .filter((l: any) => l.id && l.name);

  // If catalog doesn't provide a `topLeagues` list, derive it from raw league rows (so we preserve ids).
  const fallbackTopLeaguesFromCatalog =
    Array.isArray(rawSports) && rawSports.length
      ? rawSports
          .flatMap((s: any) => (Array.isArray(s?.Leagues) ? s.Leagues : []))
          .filter((l: any) => Boolean(l?.isTop) || Boolean(l?.top) || Boolean(l?.is_top))
          .map((l: any) => ({
            id: String(l?.sportsGameOddsLeagueId || l?.id || ""),
            name: String(l?.name || "").trim(),
            country: String(l?.country || l?.Country?.name || "").trim(),
            sportId: String(l?.sportId || l?.SportId || l?.Sport?.id || ""),
            apiFootballLeagueId: l?.apiFootballLeagueId ?? l?.api_football_league_id ?? null,
          }))
          .filter((l: any) => l.id && l.name)
      : [];

  // NOTE: In Mezzo mode, only show Mezzo-derived leagues (competitionId-based).
  // Mixing in DB catalog leagues breaks filtering because /odds/mezzo expects Mezzo competition ids.
  // For TheStatsAPI: filter out junk competition names and limit to 8 top leagues
  const cleanStatsLeague = (league: any) => {
    const rawName = String(league?.name || league?.competitionName || "").trim();
    const rawCountry = String(league?.country || "").trim();
    const joined = `${rawName} ${String(league?.id || "")}`.toLowerCase();
    if (joined.includes("international_soccer") || /^world cup$/i.test(rawName) || /fifa world cup/i.test(rawName)) {
      return { ...league, name: "FIFA World Cup", country: "World" };
    }
    if (joined.includes("comp_2674")) {
      return { ...league, name: "Veikkausliiga", country: "Finland" };
    }
    return league;
  };

  const isJunkLeague = (name: string) =>
    /^competition\s+comp_\d+/i.test(name) ||
    /^competition\s+\d+/i.test(name) ||
    /^comp_\d+/i.test(name);

  const effectiveTopLeaguesRaw = isPissbet
    ? pissbetTopLeagues
    : isMezzo
      ? uniqueLeagueItems(mezzoTopLeagues).slice(0, 8)
      : (() => {
          const raw = (isStructured && Array.isArray(fallbackTopLeaguesFromCatalog) && fallbackTopLeaguesFromCatalog.length
            ? fallbackTopLeaguesFromCatalog
            : topLeagues) as any[];
          if (isTheStatsApi) {
            return (Array.isArray(topLeagues) ? topLeagues : [])
              .map(cleanStatsLeague)
              .filter((l: any) => !isJunkLeague(String(l?.name || "")) && Number(l?.oddsFixtureCount ?? l?.fixtureCount ?? l?.count ?? 0) > 0)
              .slice(0, 8);
          }
          if (!isTheStatsApi) return raw;
          // TheStatsAPI: filter junk names and cap at 8
          return raw
            .map(cleanStatsLeague)
            .filter((l: any) => !isJunkLeague(String(l?.name || "")))
            .slice(0, 8);
        })();
  const effectiveTopLeagues = uniqueLeagueItems(effectiveTopLeaguesRaw as any[]).slice(0, 8);
  const effectiveSports = isPissbet
    ? [
        {
          id: "football",
          name: "Football",
          count: pissbetTopLeagues.length,
          countries: pissbetTopLeagues.map((l: any) => ({
            id: String(l?.id ?? l?.competitionId ?? ""),
            name: String(l?.name ?? l?.competitionName ?? l?.fullName ?? ""),
            count: 0,
            apiFootballLeagueId: null,
          })),
        },
      ]
    : isMezzo
      ? (() => {
          const sportList = Array.isArray((mezzoTopLeaguesResp as any)?.sportList) ? (mezzoTopLeaguesResp as any).sportList : [];

          const mapped = sportList
            .map((s: any) => {
              const sportId = String(s?.sportId ?? "").trim();
              const sportName = String(s?.sportName || "Sport").trim();
              const countries = Array.isArray(s?.countries) ? s.countries : [];
              const leagueItems = countries.flatMap((c: any) => {
                const leagues = Array.isArray(c?.leagues) ? c.leagues : [];
                return leagues
                  .map((l: any) => {
                    const id = String(l?.competitionId ?? "").trim();
                    const display = String(l?.fullName || "").trim();
                    const name = display || `${String(l?.country || c?.name || "").trim()} - ${String(l?.competitionName || "").trim()}`.trim();
                    return {
                      id,
                      name,
                      count: Number(l?.eventsCount ?? 0) || 0,
                      apiFootballLeagueId: null,
                    };
                  })
                  .filter((x: any) => x.id && x.name);
              });

              return {
                id: sportId || sportName.toLowerCase().replace(/\s+/g, "_"),
                name: sportName,
                count: Number(s?.eventsCount ?? leagueItems.reduce((acc: number, x: any) => acc + (Number(x?.count) || 0), 0)) || 0,
                countries: leagueItems,
              };
            })
            .filter((x: any) => x.id && x.name);

          // If Mezzo snapshot isn't available yet, fall back to backend catalog sports so the UI doesn't go empty.
          return mapped.length ? mapped : sports;
        })()
      : sports;
  const sortedEffectiveSports = Array.isArray(effectiveSports)
    ? [...effectiveSports]
      .filter((sport: any) => {
        const name = String(sport?.name || sport?.slug || sport?.id || "").toLowerCase();
        const count = Number(sport?.count ?? sport?.eventCount ?? 0) || 0;
        if (isStructured && ((catalog as any).provider === "sports_game_odds" || (catalog as any).provider === "thestatsapi")) return true;
        return name === "football" || count > 0;
      })
      .sort((a: any, b: any) => {
        const af = String(a?.name || a?.slug || a?.id || "").toLowerCase() === "football" ? 1 : 0;
        const bf = String(b?.name || b?.slug || b?.id || "").toLowerCase() === "football" ? 1 : 0;
        if (af !== bf) return bf - af;
        return (Number(b?.count ?? b?.eventCount ?? 0) || 0) - (Number(a?.count ?? a?.eventCount ?? 0) || 0);
      })
    : effectiveSports;

  return (
    <aside className={`w-64 border-r border-brand-border overflow-y-auto bg-brand-dark h-full ${className || ""}`}>
      {isLoading ? (
        <SidebarSkeleton />
      ) : (
        <div className="min-h-full">
          {/* Top Leagues Section */}
          <div className="bg-brand-dark border-b border-brand-border">
            <div className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 bg-brand-panel border-b border-brand-border text-gray-400">
              <Trophy className="w-3.5 h-3.5 text-brand-primary" />
              Top Leagues
            </div>
            <div>
              {effectiveTopLeagues.map((league: any) => (
                <div 
                   key={league.id || league.name} 
                   onClick={() => {
                     const isSelected = activeLeague === league.name;
                     onLeagueChange({ 
                       name: isSelected ? null : league.name, 
                       id: isSelected ? null : (league.id || null),
                       apiFootballLeagueId: isSelected ? null : (league.apiFootballLeagueId || null),
                       sportId: isSelected ? null : (league.sportId || null)
                     });
                   }}
                   className={`sidebar-item group !rounded-none !px-4 !py-2.5 border-b border-brand-border last:border-0 hover:bg-brand-panel cursor-pointer ${activeLeague === league.name ? 'bg-brand-primary/10 text-brand-primary border-l-2 border-l-brand-primary' : ''}`}
               
                >
                  <div className={`w-4 h-4 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 transition-colors border border-white/5 ${activeLeague === league.name ? 'bg-brand-primary/40 border-brand-primary' : 'group-hover:bg-brand-primary/20'}`}>
                    {isWorldGamesName(league.country || league.name) ? (
                      <WorldGamesIcon className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px] leading-none">{"\u26BD"}</span>
                    )}
                  </div>
                  <span className={`truncate flex-1 text-[13px] font-medium transition-colors ${activeLeague === league.name ? 'text-white' : 'group-hover:text-white'}`}>{league.name}</span>
                  <div className="flex items-center gap-1.5">
                    {isHttpFootballProvider && league.oddsFixtureCount > 0 && (
                      <span className="text-gray-500 text-[10px] font-bold">{league.oddsFixtureCount}</span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-all ${activeLeague === league.name ? 'text-brand-primary' : 'text-gray-600 group-hover:text-brand-primary group-hover:translate-x-0.5'}`} />
                  </div>
                </div>
              ))}
              
              {isHttpFootballProvider && topLeagues.length === 0 && (
                <div className="p-4 text-xs text-zinc-500 text-center italic">
                  No leagues with odds yet.<br/>Sync fixtures in Admin.
                </div>
              )}
            </div>
          </div>

          {/* Filter by Time Button */}
          <div className="relative border-b border-brand-border" ref={dropdownRef}>
            <div 
              onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
              className="bg-brand-panel text-gray-300 px-4 py-3 text-center font-bold text-[12px] cursor-pointer hover:bg-brand-muted transition-all uppercase tracking-tight flex items-center justify-center gap-2"
            >
              <span>Filter by</span>
              <span className="bg-brand-primary text-black px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                Time
              </span>
            </div>

            {isTimeDropdownOpen && (
              <div className="absolute top-full left-0 right-0 bg-brand-panel border-y border-brand-border shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 origin-top">
                {['All Time', '1 Hour', '3 Hours', '6 Hours', '12 Hours', '24 Hours', '3 Days'].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      onTimeFilterChange(f);
                      setIsTimeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-5 py-2 text-[11px] font-bold uppercase transition-colors hover:bg-white/5 flex items-center justify-between ${timeFilter === f ? 'text-brand-primary' : 'text-gray-400'}`}
                  >
                    <span>{f}</span>
                    {timeFilter === f && <div className="w-1 h-1 rounded-full bg-brand-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sports Section */}
          <div className="bg-brand-dark">
            <div className="flex flex-col">
              {sortedEffectiveSports.map((sport: any) => {
                const isExpanded = expandedSports.includes(sport.id);
                const sportIcons: Record<string, string> = {
                  football: "\u26BD",
                  basketball: "\uD83C\uDFC0",
                  tennis: "\uD83C\uDFBE",
                  volleyball: "\uD83C\uDFD0",
                  hockey: "\uD83C\uDFD2",
                  cricket: "\uD83C\uDFCF",
                  handball: "\uD83E\uDD3E",
                  baseball: "\u26BE",
                  rugby: "\uD83C\uDFC9",
                  combat: "\uD83E\uDD4A"
                };

                const slug = String(sport?.slug || sport?.id || "").toLowerCase();
                const iconKey = slug.includes('football') || slug.includes('soccer') || slug === '501' ? 'football' : 
                               slug.includes('basket') || slug === '504' ? 'basketball' :
                               slug.includes('tennis') || slug === '503' ? 'tennis' :
                               slug.includes('hockey') || slug === '502' ? 'hockey' :
                               slug.includes('volley') || slug === '505' ? 'volleyball' :
                               slug;

                return (
                  <div key={sport.id} className="flex flex-col border-b border-brand-border last:border-0">
                    <div 
                      onClick={() => {
                        toggleSport(sport.id);
                        if (applySportOnHeaderClick) {
                          onSportChange(activeSport === sport.id ? null : sport.id);
                          onLeagueChange({ name: null, id: null, apiFootballLeagueId: null });
                        }
                      }}
                      className={`sidebar-item group !rounded-none px-4 py-3 cursor-pointer hover:bg-brand-panel ${isExpanded || activeSport === sport.id ? 'bg-brand-panel text-white border-l-2 border-brand-primary' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 transition-colors border border-white/5 ${activeSport === sport.id ? 'bg-brand-primary/20 border-brand-primary' : 'group-hover:bg-brand-primary/10'}`}>
                        <span className="text-[13px] leading-none">{sportIcons[iconKey as any] || sportIcons[slug as any] || "\u26BD"}</span>
                      </div>
                      <span className="flex-1 font-bold text-[12px] uppercase tracking-wide">{sport.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 text-[11px] font-bold">{sport.count}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-primary' : ''}`} />
                      </div>
                    </div>
                    
                    {isExpanded && sport.countries && (
                      <div className="bg-black/35 transition-all">
                        {sport.countries.map((country: any) => (
                          <div 
                            key={country.name} 
                            onClick={() => {
                              const isSelected = activeLeague === country.name;
                              onLeagueChange({ 
                                name: isSelected ? null : country.name, 
                                id: isSelected ? null : (country.id || null),
                                apiFootballLeagueId: isSelected ? null : (country.apiFootballLeagueId || null),
                                sportId: sport.id,
                                country: isSelected ? null : (country.isCountry || !country.id ? country.name : null)
                              });
                              // Keep sport expanded
                              onSportChange(sport.id);
                            }}
                            className={`flex items-center gap-2.5 px-5 py-2 hover:bg-white/5 cursor-pointer text-[12px] transition-colors group/country ${activeLeague === country.name ? 'text-brand-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white'}`}
                          >
                            {isWorldGamesName(country.name) ? (
                              <WorldGamesIcon className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Globe className={`w-3 h-3 transition-colors ${activeLeague === country.name ? 'text-brand-primary' : 'text-gray-600 group-hover/country:text-brand-primary/60'}`} />
                            )}
                            <span className="flex-1 font-medium">{country.name}</span>
                            <span className="text-[10px] text-gray-600 group-hover/country:text-gray-400 font-bold">{country.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
