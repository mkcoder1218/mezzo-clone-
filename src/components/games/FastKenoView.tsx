import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

const rawFastKenoUrl = (import.meta as any)?.env?.VITE_FAST_KENO_URL
  ? String((import.meta as any).env.VITE_FAST_KENO_URL).trim()
  : "http://localhost:3000";
const fastKenoUrl = (rawFastKenoUrl || "http://localhost:3000").replace(/\/+$/, "");
const fastKenoOrigin = new URL(fastKenoUrl).origin;
const rawApiBaseUrl = (import.meta as any)?.env?.VITE_API_BASE_URL
  ? String((import.meta as any).env.VITE_API_BASE_URL).trim()
  : "https://api.king5.bet";

export default function FastKenoView({
  user,
  onWalletChange,
  authLoading,
}: {
  user?: any;
  onWalletChange?: (balance: number) => void;
  authLoading?: boolean;
}) {
  const [frameError, setFrameError] = useState(false);
  const [frameUrl, setFrameUrl] = useState("");
  const frameUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      frameUserIdRef.current = null;
      setFrameUrl("");
      setFrameError(false);
      return;
    }

    const nextUserId = String(user?.id || "");
    if (frameUrl && frameUserIdRef.current === nextUserId) {
      return;
    }

    const accessToken = localStorage.getItem("accessToken") || "";
    const params = new URLSearchParams({
      userId: nextUserId,
      balance: String(Number(user?.balance || 0)),
      currency: String(user?.currency || "ETB"),
      embedded: "king5",
    });
    params.set("backendApiBase", rawApiBaseUrl.replace(/\/+$/, "").replace(/\/api$/i, ""));
    if (accessToken) {
      params.set("authToken", accessToken);
    }
    setFrameError(false);
    const nextFrameUrl = `${fastKenoUrl}/?${params.toString()}`;
    frameUserIdRef.current = nextUserId;
    setFrameUrl((current) => (current === nextFrameUrl ? current : nextFrameUrl));
  }, [authLoading, frameUrl, user?.currency, user?.id]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== fastKenoOrigin) return;
      if (event.data?.type !== "fast-keno-wallet-sync") return;

      const nextBalance = Number(event.data?.payload?.balance);
      if (!Number.isFinite(nextBalance)) return;

      onWalletChange?.(nextBalance);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onWalletChange]);

  return (
    <div className="h-full min-h-0 bg-[#070707] px-0 py-0">
      <div className="mx-auto h-full max-w-full">
        {!frameUrl && authLoading ? (
          <div className="flex min-h-[70vh] items-center justify-center border border-white/10 bg-black px-6 text-center">
            <div className="text-sm font-black uppercase tracking-wider text-white/70">
              Loading Fast Keno
            </div>
          </div>
        ) : !frameUrl ? (
          <div className="flex min-h-[70vh] items-center justify-center border border-white/10 bg-black px-6 text-center">
            <div className="text-sm font-black uppercase tracking-wider text-white/70">
              Log in to play Fast Keno
            </div>
          </div>
        ) : frameError ? (
          <div className="flex min-h-[70vh] items-center justify-center border border-red-500/30 bg-red-500/10 px-6 text-center">
            <div>
              <div className="mb-3 flex items-center justify-center gap-2 text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-wider">Fast Keno unavailable</span>
              </div>
              <p className="text-sm text-red-100/80">
                Start the Fast-Keno app on <span className="font-mono">{fastKenoUrl}</span> to load it inside the King5 shell.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-hidden border-y border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <iframe
              src={frameUrl}
              title="Fast Keno"
              className="h-full min-h-full w-full border-0 bg-[#050909]"
              onError={() => setFrameError(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
