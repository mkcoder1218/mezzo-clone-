import { useState, useRef, useEffect, type RefObject } from "react";
import {
  Search,
  Mail,
  User,
  ChevronDown,
  LogOut,
  History,
  Wallet,
  ArrowUpRight,
  Ticket,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  onAuth: (type: "login" | "register") => void;
  onSignOut?: () => void;
  user?: any;
  authLoading?: boolean;
  onOpenDeposit?: () => void;
  onOpenWithdraw?: () => void;
  onOpenBetsHistory?: () => void;
  onOpenCheckTicket?: () => void;
  onLogoClick?: () => void;
}

export default function Header({
  onAuth,
  onSignOut,
  user,
  authLoading = false,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenBetsHistory,
  onOpenCheckTicket,
  onLogoClick,
}: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const desktopDropdownRef = useRef<HTMLDivElement>(null);

  const balanceText = (() => {
    const n = Number(user?.balance ?? 0);
    if (!Number.isFinite(n)) return "0.00";
    return n.toFixed(2);
  })();

  const exposureText = (() => {
    const n = Number(user?.exposure ?? 0);
    if (!Number.isFinite(n)) return "0.00";
    return n.toFixed(2);
  })();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideMobile = mobileDropdownRef.current?.contains(target);
      const isInsideDesktop = desktopDropdownRef.current?.contains(target);
      if (!isInsideMobile && !isInsideDesktop) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { label: "DEPOSIT", icon: Wallet, action: onOpenDeposit },
    { label: "WITHDRAW", icon: ArrowUpRight, action: onOpenWithdraw },
    { label: "MY BETS", icon: History, action: onOpenBetsHistory },
    { label: "CHECK TICKET", icon: Ticket, action: onOpenCheckTicket },
    { label: "SIGN OUT", icon: LogOut, action: onSignOut, isDanger: true },
  ].filter((item) => item.action);

  const renderProfileDropdown = (ref: RefObject<HTMLDivElement | null>, compact = false) => (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsProfileOpen((open) => !open);
        }}
        className={`${compact ? "w-8 h-8" : "h-9 min-w-9"} rounded-lg border border-white/5 flex items-center justify-center gap-2 bg-white/5 cursor-pointer hover:bg-white/10 active:bg-white/10 transition-all ${
          isProfileOpen ? "ring-2 ring-brand-primary/25 border-brand-primary/30" : ""
        }`}
        aria-haspopup="menu"
        aria-expanded={isProfileOpen}
      >
        <User className="w-4 h-4 text-white/55" />
        {!compact && (
          <ChevronDown className={`hidden sm:block w-3 h-3 text-white/30 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className={`${compact ? "w-56" : "w-64"} absolute right-0 mt-3 bg-brand-panel/98 backdrop-blur-2xl rounded-xl shadow-2xl border border-brand-border overflow-hidden py-1 z-[200]`}
            role="menu"
          >
            <div className="px-4 py-3 border-b border-white/5">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Balance</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-brand-primary font-black text-lg tabular-nums">{balanceText}</span>
                <span className="text-white/35 text-[10px] font-bold uppercase">{user?.currency || "ETB"}</span>
              </div>
              {user?.id && (
                <div className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/20">
                  ID: {String(user.id).slice(-6).toUpperCase()}
                </div>
              )}
            </div>

            {menuItems.map((item, idx) => (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    item.action?.();
                    setIsProfileOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-[10px] font-black uppercase italic tracking-widest transition-all flex items-center justify-between group ${
                    item.isDanger
                      ? "text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/10"
                      : "text-gray-300 hover:bg-white/5 active:bg-white/5"
                  }`}
                  role="menuitem"
                >
                  <span>{item.label}</span>
                  <item.icon className="w-3.5 h-3.5 opacity-40" />
                </button>
                {idx < menuItems.length - 1 && <div className="mx-4 border-b border-white/5" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="sticky top-0 z-[220] px-3 py-2 pointer-events-none">
      <header className="pointer-events-auto h-[54px] bg-brand-panel/90 backdrop-blur-xl flex items-center px-4 sm:px-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-brand-border relative">
        {/* Neon Glow Bottom Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary/50 blur-[1.5px]" />
        <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px] bg-brand-primary shadow-[0_0_20px_rgba(189,233,30,0.65)]" />

        {/* Mobile View */}
        {/* Mobile View */}
        <div className="flex items-center justify-between w-full lg:hidden h-full">
          {/* Logo */}
          <div className="flex-shrink-0">
            <button type="button" onClick={onLogoClick} className="flex items-center active:scale-95 transition-transform">
              <img src="/brand/king5bet-logo.png" alt="KING5bet" className="h-6 w-auto" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            {user ? (
              <>
                {/* Financial Pill */}
                <div className="flex flex-col items-end px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded-lg mr-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black text-brand-primary tabular-nums tracking-tight whitespace-nowrap">
                      {balanceText}
                    </span>
                    <span className="text-[6px] font-bold text-white/30 uppercase italic">ETB</span>
                  </div>
                  {Number(exposureText) > 0 && (
                    <div className="flex items-center gap-1 -mt-0.5">
                      <span className="text-[6px] font-bold text-rose-400/60 uppercase italic tracking-tighter">EXP</span>
                      <span className="text-[7px] font-black text-rose-400/80 tabular-nums leading-none">
                        {exposureText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Icons Group */}
                <div className="flex items-center gap-1 px-1 border-x border-white/5 mx-0.5">
                  <button className="relative w-8 h-8 rounded-lg flex items-center justify-center active:bg-white/5 transition-colors">
                    <Mail className="w-4 h-4 text-white/30" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-danger rounded-full border border-brand-panel" />
                  </button>

                  {renderProfileDropdown(mobileDropdownRef, true)}
                </div>
              </>
            ) : authLoading ? (
              <div className="bg-white/5 px-3 h-8 flex items-center rounded-lg text-white/20 font-black text-[8px] uppercase border border-white/5 animate-pulse italic">
                ...
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onAuth("login")}
                  className="text-white/50 font-black text-[9px] px-2 uppercase hover:text-white transition-colors italic"
                >
                  Log In
                </button>
                <button
                  onClick={() => onAuth("register")}
                  className="bg-brand-primary text-black font-black text-[9px] px-3.5 h-8 rounded-lg uppercase shadow-lg active:scale-95 transition-all italic"
                >
                  Join
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:flex items-center w-full">
          {/* Logo */}
          <button type="button" className="cursor-pointer shrink-0 mr-8" onClick={onLogoClick}>
            <img src="/brand/king5bet-logo.png" alt="KING5bet" className="h-8 w-auto hover:opacity-80 transition-opacity" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-white/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events, teams..."
                className="w-full bg-white/5 border border-white/[0.06] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-brand-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-5">
            {user ? (
              <>
                {/* Balance + ID */}
                <div className="flex flex-col items-end mr-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-brand-primary font-bold text-base tabular-nums">
                      {balanceText}
                    </span>
                    <span className="text-white/30 text-[10px] font-semibold uppercase">
                      {user?.currency || "ETB"}
                    </span>
                  </div>
                  <span className="text-white/20 text-[8px] font-bold uppercase tracking-widest mt-0.5">
                    ID: {user?.id?.slice(-6).toUpperCase()}
                  </span>
                </div>

                {/* Notifications */}
                <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <Mail className="w-4 h-4 text-white/40" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-danger rounded-full" />
                </button>

                {renderProfileDropdown(desktopDropdownRef)}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onAuth("login")}
                  className="text-white/60 hover:text-white font-semibold text-xs uppercase transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={() => onAuth("register")}
                  className="bg-brand-primary text-black font-bold px-6 h-9 rounded-xl text-[11px] uppercase hover:brightness-110 active:scale-95 transition-all"
                >
                  Join Now
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
