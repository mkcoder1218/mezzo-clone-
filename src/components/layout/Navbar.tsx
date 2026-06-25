import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Trophy,
  Flame,
  Gamepad2,
  Dices,
  MonitorPlay,
  Percent,
  Timer,
} from "lucide-react";

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const NAV_ITEMS = [
  { icon: (active: boolean) => <LayoutDashboard strokeWidth={2.5} fill={active ? "currentColor" : "none"} />, label: "HOME", view: "home" },
  { icon: (active: boolean) => <Trophy strokeWidth={2.5} fill={active ? "currentColor" : "none"} />, label: "SPORT", view: "sport" },
  { icon: (active: boolean) => <Flame strokeWidth={2.5} fill={active ? "currentColor" : "none"} />, label: "LIVE", view: "live" },
  { icon: (active: boolean) => <Gamepad2 strokeWidth={2.5} fill={active ? "currentColor" : "none"} />, label: "GAMES", view: "games" },
  {
    icon: (active: boolean) => <Dices strokeWidth={2.5} fill={active ? "currentColor" : "none"} />,
    label: "LIVE GAMES",
    view: "live-games",
  },
  {
    icon: (active: boolean) => <MonitorPlay strokeWidth={2.5} fill={active ? "currentColor" : "none"} />,
    label: "VIRTUAL",
    view: "virtual",
  },
  {
    icon: (active: boolean) => <Percent strokeWidth={2.5} />,
    label: "PROMOS",
    view: "promotions",
  },
];

export default function Navbar({ currentView, onViewChange }: NavbarProps) {
  const [isSportDropdownOpen, setIsSportDropdownOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"); // lg
    const apply = () => setIsDesktop(!!mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return (
    <nav className="bg-brand-dark border-b border-brand-border h-[56px] lg:h-[72px] flex items-center justify-start lg:justify-center shrink-0 sticky top-[70px] lg:top-[50px] z-[90] overflow-x-auto no-scrollbar shadow-[0_15px_40px_rgba(0,0,0,0.9)] mb-1">
      <div className="flex w-auto lg:gap-1 px-2 lg:px-4 min-w-max justify-start h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const isSport = item.label === "SPORT";

          return (
            <div
              key={item.label}
              ref={isSport ? dropdownRef : null}
              onClick={() => {
                if (isSport) {
                  if (isDesktop) {
                    setIsSportDropdownOpen(!isSportDropdownOpen);
                    onViewChange(item.view);
                  } else {
                    setIsSportDropdownOpen(false);
                    onViewChange(item.view);
                  }
                } else {
                  setIsSportDropdownOpen(false);
                  onViewChange(item.view);
                }
              }}
              className={`flex-none min-w-[60px] sm:min-w-[75px] lg:min-w-0 flex flex-col items-center justify-center cursor-pointer group px-2 sm:px-3 lg:px-5 relative h-full transition-all duration-300 ${
                  isActive 
                  ? "text-brand-primary bg-brand-primary/[0.07]" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.02]"
              }`}
            >
              <div
                className={`mb-1 transition-all duration-500 ${
                  isActive ? "scale-110 drop-shadow-[0_0_12px_rgba(189,233,30,0.5)]" : "group-hover:scale-105"
                }`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  {typeof item.icon === 'function' ? item.icon(isActive) : item.icon}
                </div>
              </div>
              <span
                className={`text-[8px] sm:text-[9px] lg:text-[10px] font-black tracking-widest uppercase whitespace-nowrap transition-all duration-300 ${
                  isActive ? "text-brand-primary" : ""
                }`}
              >
                {item.label}
              </span>
              
              {/* Premium Active Indicator */}
              {isActive && (
                <>
                  <div className="absolute bottom-0 h-[3px] w-full bg-brand-primary shadow-[0_-2px_12px_rgba(189,233,30,0.55)] animate-in fade-in slide-in-from-bottom-1" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/5 to-transparent pointer-events-none" />
                </>
              )}

              {/* Sport Dropdown */}
              {isSport && isDesktop && isSportDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-brand-panel border border-brand-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-md py-5 z-50 animate-in fade-in zoom-in-95 origin-top backdrop-blur-xl">
                  <div className="flex flex-col items-center mb-5 px-6">
                    <div className="w-12 h-12 rounded-full border border-brand-primary/30 bg-brand-primary/5 flex items-center justify-center mb-3 shadow-[inset_0_0_15px_rgba(189,233,30,0.1)]">
                      <Timer className="w-6 h-6 text-brand-primary" />
                    </div>
                    <span className="text-brand-primary text-[12px] font-black tracking-[0.2em] italic uppercase">
                      Sport Betting
                    </span>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mt-4" />
                  </div>

                  <div className="space-y-1 px-2">
                    {[
                      "Upcoming Events",
                      "Top Sports",
                      "Express",
                      "Results",
                    ].map((link) => (
                      <button
                        key={link}
                        className="w-full text-left px-5 py-2.5 rounded-sm hover:bg-brand-primary/10 transition-all group/item flex items-center justify-between"
                      >
                        <span className="text-white/80 font-bold text-[13px] uppercase italic tracking-tight group-hover/item:text-brand-primary group-hover/item:translate-x-1 transition-all">
                          {link}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary opacity-0 group-hover/item:opacity-100 transition-opacity shadow-[0_0_8px_rgba(189,233,30,0.7)]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
