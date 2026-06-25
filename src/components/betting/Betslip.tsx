import { Trash2, Smartphone, Info, ChevronDown, X, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { BetSelection } from "../../types";
import {
  useBulkUpsertSlipSelections,
  useCreateUserSlip,
  usePlaceSlip,
} from "../../modules/betslips/hooks";
import { useQueryClient } from "@tanstack/react-query";
import TicketPreview from "./TicketPreview";
import OfflineTicketModal from "./OfflineTicketModal";
import { useCreateOfflineTicket } from "../../modules/offlineTickets/hooks";
interface BetslipProps {
  selectedBets: BetSelection[];
  onRemoveBet: (matchId: string, market: string, selection: string) => void;
  onClear: () => void;
  activeSlot: 1 | 2 | 3;
  onChangeSlot: (slot: 1 | 2 | 3) => void;
  slotCounts?: Record<1 | 2 | 3, number>;
  stake: number;
  onStakeChange: (stake: number) => void;
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated?: boolean;
  authLoading?: boolean;
  onRequireAuth?: () => void;
  notice?: string | null;
}
export default function Betslip({
  selectedBets,
  onRemoveBet,
  onClear,
  activeSlot,
  onChangeSlot,
  slotCounts,
  stake,
  onStakeChange,
  isOpen,
  onClose,
  isAuthenticated = false,
  authLoading = false,
  onRequireAuth,
  notice = null,
}: BetslipProps) {
  const totalOdds = selectedBets.reduce((acc, current) => acc * current.odd, 1);
  const incomeTaxRate = 0.15;
  const potentialPayout = totalOdds * stake;
  const incomeTax = potentialPayout * incomeTaxRate;
  const netWin = potentialPayout - incomeTax;
  const [busy, setBusy] = useState(false);
  const bulkUpsert = useBulkUpsertSlipSelections();
  const createSlip = useCreateUserSlip();
  const placeSlip = usePlaceSlip();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [acceptedOpen, setAcceptedOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineCode, setOfflineCode] = useState<string>("");
  const [offlineExpiresAt, setOfflineExpiresAt] = useState<string | null>(null);
  const createOffline = useCreateOfflineTicket();
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [closedSelectionKeys, setClosedSelectionKeys] = useState<Set<string>>(new Set());
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    setLocalNotice(notice);
    const t = setTimeout(() => setLocalNotice(null), 2000);
    return () => clearTimeout(t);
  }, [notice]);

  const selectionSignature = useMemo(
    () =>
      selectedBets
        .map(
          (b) => `${b.outcomeId || ""}:${b.acceptedOddsVersion || ""}:${b.odd}`,
        )
        .join("|"),
    [selectedBets],
  );

  useEffect(() => {
    // Clear inline errors when user changes selections (add/remove/change).
    setInlineError(null);
    setClosedSelectionKeys(new Set());
  }, [selectionSignature]);

  useEffect(() => {
    // Clear errors when betslip closes.
    if (!isOpen) {
      setInlineError(null);
      setClosedSelectionKeys(new Set());
      setBalanceModalOpen(false);
    }
  }, [isOpen]);

  const extractError = (e: any) => {
    const details =
      e?.response?.data?.error?.details ?? e?.response?.data?.details ?? null;
    const codeRaw =
      details?.code ??
      e?.response?.data?.error?.code ??
      e?.response?.data?.code ??
      null;
    const messageRaw =
      e?.response?.data?.error?.message ??
      e?.response?.data?.message ??
      e?.message ??
      null;
    const code = codeRaw ? String(codeRaw) : null;
    const message = messageRaw ? String(messageRaw) : null;
    const status = Number(e?.response?.status || 0) || null;
    return { code, message, status, details };
  };

  const betKey = (bet: BetSelection) => `${bet.matchId}-${bet.market}-${bet.selection}`;

  const markClosedSelections = (e: any) => {
    const { details } = extractError(e);
    const startsAt = details?.startsAt ? String(details.startsAt) : null;
    const outcomeId = details?.outcomeId ? String(details.outcomeId) : null;
    const selectionKey = details?.selectionKey ? String(details.selectionKey) : null;

    const closedKeys = selectedBets
      .filter((bet) => {
        if (outcomeId && bet.outcomeId && String(bet.outcomeId) === outcomeId) return true;
        if (selectionKey && bet.selectionKey && String(bet.selectionKey) === selectionKey) return true;
        if (startsAt && bet.startsAt && new Date(bet.startsAt).getTime() === new Date(startsAt).getTime()) return true;
        if (String(bet.uiStatus || bet.status || "").toLowerCase() === "closed") return true;
        return false;
      })
      .map(betKey);

    setClosedSelectionKeys(new Set(closedKeys.length ? closedKeys : selectedBets.map(betKey)));
  };

  const mapBetslipError = (
    e: any,
  ): { kind: "balance" | "inline"; message: string; code?: string | null } => {
    const { code, message } = extractError(e);
    const codeU = String(code || "").toUpperCase();
    const msgL = String(message || "").toLowerCase();

    const balance =
      codeU === "INSUFFICIENT_BALANCE" ||
      msgL.includes("insufficient user balance") ||
      msgL.includes("insufficient balance") ||
      msgL.includes("not enough balance");
    if (balance) {
      return {
        kind: "balance",
        message: "Insufficient balance. Please deposit to place this bet.",
        code,
      };
    }

    if (codeU === "ODDS_EXPIRED")
      return { kind: "inline", message: "Odds expired. Please refresh.", code };
    if (codeU === "ODDS_CHANGED")
      return {
        kind: "inline",
        message: "Odds changed. Please accept the new odds.",
        code,
      };
    if (codeU === "MARKET_CLOSED")
      return { kind: "inline", message: "This market is closed.", code };
    if (codeU === "INVALID_SELECTION")
      return {
        kind: "inline",
        message: "This selection is no longer available.",
        code,
      };

    // Heuristic mapping if backend didn't provide codes consistently.
    if (msgL.includes("odds expired"))
      return { kind: "inline", message: "Odds expired. Please refresh.", code };
    if (msgL.includes("odds changed"))
      return {
        kind: "inline",
        message: "Odds changed. Please accept the new odds.",
        code,
      };
    if (msgL.includes("market") && msgL.includes("closed"))
      return { kind: "inline", message: "This market is closed.", code };
    if (
      msgL.includes("selection") &&
      (msgL.includes("inactive") ||
        msgL.includes("no longer active") ||
        msgL.includes("not found"))
    ) {
      return {
        kind: "inline",
        message: "This selection is no longer available.",
        code,
      };
    }

    return {
      kind: "inline",
      message: "Could not place bet. Please try again.",
      code,
    };
  };

  const handlePlaceOnline = async () => {
    if (!selectedBets.length) return;
    if (authLoading) return;
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    // Allow placing attempt even if a selection is missing outcomeId (e.g. detail-only rows).
    // Backend will validate and respond with a specific error if placement isn't possible.
    setBusy(true);
    try {
      const slip = await createSlip.mutateAsync({ slotNumber: activeSlot });
      const slipId = slip?.id;
      if (!slipId) throw new Error("Failed to create slip");

      await bulkUpsert.mutateAsync({
        slipId,
        slotNumber: activeSlot,
        selections: selectedBets.map((b) => ({
          // Prefer DB outcomeId when present; otherwise fall back to provider selectionKey
          // (backend will resolve it to an Outcome if it exists in DB).
          outcomeId: b.outcomeId || undefined,
          selectionKey: b.outcomeId ? undefined : (b.selectionKey || undefined),
          acceptedOdds: b.odd,
          acceptedOddsVersion: b.acceptedOddsVersion || 1,
        })),
      });
      await placeSlip.mutateAsync({ slipId, stake });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      await queryClient.invalidateQueries({ queryKey: ["user-betslips"] });
      setAcceptedOpen(true);
      setPreviewOpen(false);
      setInlineError(null);
      onClear();
    } catch (e: any) {
      const status = Number(e?.response?.status || 0);
      if (status === 401 || status === 403) {
        onRequireAuth?.();
        return;
      }
      const mapped = mapBetslipError(e);
      // eslint-disable-next-line no-console
      console.debug("[betslip][error]", {
        code: mapped.code || null,
        raw: extractError(e),
      });
      if (mapped.kind === "balance") {
        setInlineError(null);
        setBalanceModalOpen(true);
        return;
      }
      if (String(mapped.code || "").toUpperCase() === "MARKET_CLOSED") {
        markClosedSelections(e);
      }
      setInlineError(mapped.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePrintPreview = async () => {
    if (!selectedBets.length) return;
    // Allow print-preview attempt even if a selection is missing outcomeId; backend will validate.
    try {
      const res = await createOffline.mutateAsync({
        stake,
        selections: selectedBets.map((b) => ({
          outcomeId: b.outcomeId || "",
          acceptedOdds: b.odd,
          acceptedOddsVersion: b.acceptedOddsVersion || 1,
        })),
      });
      setOfflineCode(res.shortCode);
      setOfflineExpiresAt(res.expiresAt || null);
      setOfflineOpen(true);
      setInlineError(null);
    } catch (e: any) {
      const mapped = mapBetslipError(e);
      // eslint-disable-next-line no-console
      console.debug("[betslip][error]", {
        code: mapped.code || null,
        raw: extractError(e),
      });
      if (mapped.kind === "balance") {
        setInlineError(null);
        setBalanceModalOpen(true);
        return;
      }
      if (String(mapped.code || "").toUpperCase() === "MARKET_CLOSED") {
        markClosedSelections(e);
      }
      setInlineError(mapped.message);
    }
  };

  return (
    <>
      {/* Insufficient balance modal */}
      <AnimatePresence>
        {balanceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setBalanceModalOpen(false)}
          >
            <motion.div
              initial={{ y: 10, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              className="w-full max-w-sm bg-brand-surface border border-brand-danger/30 rounded-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-black uppercase italic tracking-widest text-brand-danger">
                  Error
                </div>
                <button
                  type="button"
                  onClick={() => setBalanceModalOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
              <div className="mt-3 text-sm font-bold text-brand-danger">
                Insufficient balance. Please deposit to place this bet.
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setBalanceModalOpen(false)}
                  className="bg-brand-danger text-black px-4 py-2 rounded-lg text-xs font-black uppercase italic"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          y: isOpen || window.innerWidth >= 1024 ? 0 : "100%",
          opacity: 1,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-x-0 bottom-0 lg:sticky lg:top-0 lg:translate-y-0 w-full lg:w-[380px] bg-brand-dark flex flex-col shrink-0 border-t lg:border-t-0 lg:border-l border-brand-border z-[150] lg:z-10 h-[90vh] lg:h-full rounded-t-3xl lg:rounded-none overflow-hidden shadow-2xl lg:shadow-none min-h-0"
      >
        {/* Mobile Pull Handle */}
        <div className="lg:hidden flex justify-center py-3" onClick={onClose}>
          <div className="w-12 h-1 bg-white/10 rounded-full" />
        </div>

        {/* Header Tabs */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-brand-border bg-brand-surface">
          <div className="flex gap-2 p-1 bg-white/[0.03] rounded-full border border-white/5">
            {([1, 2, 3] as const).map((slot) => {
              const isActive = activeSlot === slot;
              const count = slotCounts?.[slot] ?? 0;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onChangeSlot(slot)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-brand-primary text-black"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  <span>SLIP {slot}</span>
                  {count > 0 && (
                    <span className="text-[9px] font-black">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClear}
              className="p-2 text-gray-500 hover:text-brand-danger transition-colors rounded-lg hover:bg-white/5"
              title="Clear all bets"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-white hover:text-brand-primary transition-colors rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Control Row */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-brand-border bg-brand-panel/45">
          <button className="flex items-center gap-2 group">
            <div className="w-8 h-4 bg-white/10 rounded-full relative transition-colors group-hover:bg-white/20">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-brand-primary rounded-full shadow-sm" />
            </div>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-tight group-hover:text-white transition-colors">
              Copy ticket
            </span>
          </button>
          <button className="flex items-center gap-2 group">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-tight group-hover:text-white transition-colors">
              Sort by Time
            </span>
            <div className="w-8 h-4 bg-white/10 rounded-full relative transition-colors group-hover:bg-white/20">
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white/40 rounded-full shadow-sm" />
            </div>
          </button>
        </div>

        {/* Inline error */}
        {inlineError ? (
          <div className="px-4 py-2 bg-brand-danger/10 border-b border-brand-danger/20">
            <div className="text-[11px] font-bold text-brand-danger flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-brand-danger" />
              {inlineError}
            </div>
          </div>
        ) : null}
        {localNotice ? (
          <div className="px-4 py-2 bg-brand-success/10 border-b border-brand-success/20">
            <div className="text-[11px] font-bold text-brand-success flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-brand-success" />
              {localNotice}
            </div>
          </div>
        ) : null}

        {/* Bets List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 pb-10">
          <AnimatePresence initial={false}>
            {selectedBets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 opacity-30">
                <Smartphone className="w-12 h-12 mb-4 text-white" strokeWidth={1} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ticket Empty</p>
              </div>
            ) : (
              selectedBets.map((bet) => {
                const key = betKey(bet);
                const isClosed =
                  closedSelectionKeys.has(key) ||
                  String(bet.uiStatus || bet.status || "").toLowerCase() === "closed";
                return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ 
                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% calc(50% - 6px), calc(100% - 6px) 50%, 100% calc(50% + 6px), 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)" 
                  }}
                  className={`p-3 relative group border-l-4 shadow-xl transition-colors ${
                    isClosed
                      ? "bg-brand-danger/15 border-l-brand-danger border border-brand-danger/30"
                      : "bg-white border-l-brand-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-black leading-tight uppercase italic truncate mb-1 ${
                        isClosed ? "text-red-100" : "text-black"
                      }`}>
                        {bet.matchName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-tight ${
                          isClosed ? "text-red-300/80" : "text-gray-400"
                        }`}>
                          {bet.market}
                        </span>
                        <div className={`w-1 h-1 rounded-full ${isClosed ? "bg-red-400/70" : "bg-gray-200"}`} />
                        <span className={`text-[10px] font-black uppercase italic ${
                          isClosed ? "text-red-100" : "text-black"
                        }`}>
                          {bet.selection}
                        </span>
                      </div>
                      {isClosed ? (
                        <div className="mt-2 inline-flex items-center rounded-sm bg-brand-danger px-2 py-0.5 text-[8px] font-black uppercase italic tracking-widest text-black">
                          Closed
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveBet(bet.matchId, bet.market, bet.selection)
                          }
                          className="w-6 h-6 rounded-full bg-brand-danger text-black hover:brightness-110 transition-colors flex items-center justify-center"
                          title="Remove closed bet"
                        >
                          <X className="w-3.5 h-3.5 stroke-[4]" />
                        </button>
                      ) : null}
                      <div className={`px-2 py-0.5 rounded-sm text-[11px] font-black italic ${
                        isClosed ? "bg-brand-danger text-black" : "bg-black text-white"
                      }`}>
                        {bet.odd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Footer / Stake Section */}
        <AnimatePresence>
          {selectedBets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4 pb-12 lg:pb-6 bg-brand-surface border-t border-brand-border space-y-4 shadow-2xl relative z-10"
            >
              {/* Summary Row */}
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">
                    Total Odds
                  </span>
                  <span className="text-lg font-black text-brand-primary italic leading-none tracking-tighter">
                    {totalOdds.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">
                    Selections
                  </span>
                  <span className="text-lg font-black text-white italic leading-none tracking-tighter tabular-nums">
                    {selectedBets.length}
                  </span>
                </div>
              </div>

              {/* Stake Controller */}
              <div className="bg-white/5 rounded-sm p-2 border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.1em]">Stake (ETB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onStakeChange(Math.max(1, stake - 10))}
                    className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-sm text-white hover:bg-black/60 transition-all border border-white/5"
                  >
                    <div className="w-2.5 h-0.5 bg-white rounded-full" />
                  </button>
                  <div className="flex-1 bg-black/40 rounded-sm border border-white/5 flex items-center h-8">
                    <input
                      type="number"
                      value={stake}
                      onChange={(e) => onStakeChange(Number(e.target.value))}
                      className="w-full bg-transparent text-center focus:outline-none text-white font-black text-base italic tracking-tighter [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <button
                    onClick={() => onStakeChange(stake + 10)}
                    className="w-8 h-8 flex items-center justify-center bg-black/40 rounded-sm text-white hover:bg-black/60 transition-all border border-white/5 text-base font-black italic"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-1 px-1">
                <div className="flex justify-between items-center text-[9px] font-bold">
                  <span className="text-gray-500 uppercase tracking-tight">Potential Payout</span>
                  <span className="text-white/80">{(totalOdds * stake).toFixed(2)} ETB</span>
                </div>

                <div className="flex justify-between items-center text-[9px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 uppercase tracking-tight">Income Tax</span>
                    <span className="text-[7px] bg-brand-danger/10 text-brand-danger px-1 py-0.5 rounded-sm border border-brand-danger/10">15%</span>
                  </div>
                  <span className="text-brand-danger/70">-{incomeTax.toFixed(2)} ETB</span>
                </div>

                <div className="h-px bg-white/5 my-1" />

                <div className="flex justify-between items-end">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Net Win</span>
                  <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-xl font-black text-brand-primary italic tracking-tighter tabular-nums drop-shadow-[0_0_8px_rgba(189,233,30,0.2)]">
                      {netWin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[8px] font-black text-brand-primary italic uppercase">ETB</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handlePlaceOnline}
                  disabled={busy || (!isAuthenticated && authLoading)}
                  className="w-full bg-brand-primary text-black font-black py-4 rounded-sm text-[13px] uppercase tracking-wider hover:bg-brand-primary/90 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(189,233,30,0.2)] disabled:opacity-50 relative overflow-hidden group"
                >
                  <span className="relative z-10">{busy ? "Placing..." : "Place Bet Online"}</span>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-[45deg]" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="bg-white/[0.03] hover:bg-white/[0.08] text-white/90 hover:text-white border border-white/10 font-black py-3 rounded-sm text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
                  >
                    <Ticket className="w-3.5 h-3.5 text-brand-primary group-hover:rotate-12 transition-transform" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={handlePrintPreview}
                    disabled={busy || createOffline.isPending}
                    className="bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/10 font-black py-3 rounded-sm text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-gray-500 group-hover:-translate-y-0.5 transition-transform" />
                    <span>Offline</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      <TicketPreview
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        selectedBets={selectedBets}
        stake={stake}
        onPlaceBet={handlePlaceOnline}
        placing={busy}
      />
      <OfflineTicketModal
        open={offlineOpen}
        onClose={() => setOfflineOpen(false)}
        code={offlineCode}
        expiresAt={offlineExpiresAt}
      />

      {/* Success Modal */}
      <AnimatePresence>
        {acceptedOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setAcceptedOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                clipPath: "polygon(0% 0%, 100% 0%, 100% 70%, 94% 75%, 100% 80%, 100% 100%, 0% 100%, 0% 80%, 6% 75%, 0% 70%)"
              }}
              className="relative z-10 bg-[#f8f8f8] p-10 py-14 text-center max-w-[360px] w-full shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
            >
              {/* Paper Texture Overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
              
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                <div className="absolute inset-0 bg-emerald-500/5 blur-xl rounded-full" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="relative z-10"
                >
                  <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </motion.div>
              </div>

              <h3 className="text-3xl font-black text-black uppercase italic mb-3 tracking-tighter leading-none">
                Bet Accepted!
              </h3>
              <p className="text-gray-500 text-[13px] mb-12 font-bold leading-relaxed px-6">
                Your bet has been placed successfully. Good luck!
              </p>

              {/* Perforation Line & Notches */}
              <div className="absolute left-0 right-0 top-[75%] -translate-y-1/2 flex items-center gap-2 opacity-10 px-[6%]">
                <div className="h-[2px] flex-1 border-t-2 border-dashed border-black" />
              </div>

              <button
                onClick={() => setAcceptedOpen(false)}
                className="w-full bg-black text-white font-black py-4.5 rounded-xl text-[11px] uppercase tracking-[0.2em] hover:bg-zinc-800 active:scale-95 transition-all shadow-xl mt-4"
              >
                Back to Games
              </button>

              {/* Decorative Barcode / Footer */}
              <div className="mt-10 flex flex-col items-center gap-2 opacity-[0.07]">
                <div className="flex gap-1 h-3">
                  {[...Array(24)].map((_, i) => (
                    <div key={i} className={`h-full bg-black ${i % 3 === 0 ? 'w-1' : 'w-0.5'}`} />
                  ))}
                </div>
                <span className="text-[7px] font-black tracking-[0.5em]">TICKET ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
