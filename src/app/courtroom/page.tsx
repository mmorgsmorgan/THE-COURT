"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import toast from "react-hot-toast";
import { toPng, toBlob } from "html-to-image";

import { GlitchText } from "@/components/glitch-text";
import { TerminalInput } from "@/components/terminal-input";
import { CountdownTimer } from "@/components/countdown-timer";
import { ScanAnimation } from "@/components/scan-animation";
import { VerdictCard } from "@/components/verdict-card";
import { WalletButton } from "@/components/wallet-button";

import {
  lookupIdentityByUsername,
  type RitualIdentity,
} from "@/lib/ritual-identity";
import {
  hashConfession,
  hashVerdict,
  recordSession,
} from "@/lib/contract";
import {
  courtroomAbi,
  courtroomAddress,
  assertCourtroomAddress,
} from "@/lib/courtroom-abi";
import { ritualChain } from "@/lib/chain";
import type { Judgment } from "@/lib/judge";

type Step =
  | "connect"
  | "wrong-chain"
  | "loading"
  | "cooldown"
  | "identity"
  | "identity-confirm"
  | "confess"
  | "processing"
  | "accept"
  | "verdict"
  | "locked";

const fadeVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function CourtroomPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  const [step, setStep] = useState<Step>("connect");
  const [username, setUsername] = useState("");
  const [identity, setIdentity] = useState<RitualIdentity | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [confession, setConfession] = useState("");
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [scanReady, setScanReady] = useState(false);
  const [nextJudgment, setNextJudgment] = useState<Date | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  const verdictRef = useRef<HTMLDivElement>(null);
  const onRitual = chainId === ritualChain.id;
  const readEnabled = Boolean(isConnected && address && onRitual && courtroomAddress);

  // ── Read onchain cooldown ───────────────────────────
  const { data: nextAtRaw, error: nextAtError, refetch: refetchCooldown } = useReadContract({
    address: courtroomAddress,
    abi: courtroomAbi,
    functionName: "nextJudgmentAt",
    args: address ? [address] : undefined,
    chainId: ritualChain.id,
    query: { enabled: readEnabled },
  });

  // ── Read existing onchain username ──────────────────
  const { data: linkedOnchain, error: linkedError, refetch: refetchLinked } = useReadContract({
    address: courtroomAddress,
    abi: courtroomAbi,
    functionName: "linkedUsername",
    args: address ? [address] : undefined,
    chainId: ritualChain.id,
    query: { enabled: readEnabled },
  });

  // ── Write hooks ─────────────────────────────────────
  const {
    writeContractAsync: writeBind,
    data: bindHash,
    reset: resetBind,
  } = useWriteContract();
  const { isLoading: bindWaiting, isSuccess: bindSuccess } =
    useWaitForTransactionReceipt({ hash: bindHash });

  const {
    writeContractAsync: writeVerdict,
    data: verdictHash,
    reset: resetVerdict,
  } = useWriteContract();
  const { isLoading: verdictWaiting, isSuccess: verdictSuccess } =
    useWaitForTransactionReceipt({ hash: verdictHash });

  const bindPending = Boolean(bindHash && bindWaiting);
  const verdictPending = Boolean(verdictHash && verdictWaiting);

  // ── Step routing on connect / chain change / cooldown ──
  useEffect(() => {
    if (!isConnected || !address) {
      setStep("connect");
      return;
    }
    if (!onRitual) {
      setStep("wrong-chain");
      return;
    }

    // Wait for both reads before deciding identity vs confess — prevents the
    // identity-step flicker that would otherwise let a returning user re-bind.
    // Bail out of the loading state after the deadline or if either read errored
    // so the user is never stuck staring at the spinner.
    const readsPending =
      (nextAtRaw === undefined && !nextAtError) ||
      (linkedOnchain === undefined && !linkedError);
    if (readsPending && !loadingTimedOut) {
      setStep((curr) =>
        curr === "connect" || curr === "wrong-chain" ? "loading" : curr
      );
      return;
    }

    // Ritual chain returns block.timestamp in MILLISECONDS, so nextJudgmentAt is ms.
    const nextAtMs = Number(nextAtRaw);
    const nowMs = Date.now();

    if (nextAtMs > nowMs) {
      setNextJudgment(new Date(nextAtMs));
      setStep((curr) =>
        curr === "connect" || curr === "wrong-chain" || curr === "loading"
          ? "cooldown"
          : curr
      );
      return;
    }

    setNextJudgment(null);

    // If linkedUsername is known and non-empty, skip identity steps.
    if (typeof linkedOnchain === "string" && linkedOnchain.length > 0) {
      setStep((curr) => {
        if (
          curr === "connect" ||
          curr === "wrong-chain" ||
          curr === "loading" ||
          curr === "cooldown" ||
          curr === "identity" ||
          curr === "identity-confirm"
        ) {
          return "confess";
        }
        return curr;
      });
      return;
    }

    // Read returned empty — user has never bound. Show identity entry.
    setStep((curr) => {
      if (
        curr === "connect" ||
        curr === "wrong-chain" ||
        curr === "loading" ||
        curr === "cooldown"
      ) {
        return "identity";
      }
      return curr;
    });
  }, [isConnected, address, onRitual, nextAtRaw, linkedOnchain, nextAtError, linkedError, loadingTimedOut]);

  // ── Loading-state safety net: cap loading at 2.5s ────
  useEffect(() => {
    if (step !== "loading") {
      setLoadingTimedOut(false);
      return;
    }
    const id = setTimeout(() => setLoadingTimedOut(true), 2500);
    return () => clearTimeout(id);
  }, [step]);

  // ── Auto-load identity for already-bound wallets ─────
  useEffect(() => {
    if (typeof linkedOnchain !== "string" || linkedOnchain.length === 0) return;
    if (identity) return;

    setUsername(linkedOnchain);
    (async () => {
      try {
        const result = await lookupIdentityByUsername(linkedOnchain);
        setIdentity(
          result || {
            username: linkedOnchain,
            displayName: linkedOnchain,
            avatarUrl: "",
            cardImageUrl: null,
          }
        );
      } catch {
        setIdentity({
          username: linkedOnchain,
          displayName: linkedOnchain,
          avatarUrl: "",
          cardImageUrl: null,
        });
      }
    })();
  }, [linkedOnchain, identity]);

  // ── Identity Lookup ─────────────────────────────────
  const handleIdentityLookup = useCallback(async () => {
    if (!username.trim()) {
      toast.error("Enter your X username");
      return;
    }

    setIdentityLoading(true);
    try {
      const result = await lookupIdentityByUsername(username);

      if (result?.cardImageUrl) {
        toast.success("Ritual Onchain ID detected");
        setIdentity(result);
      } else if (result) {
        toast("X profile found — no Ritual ID minted", { icon: "⚠️" });
        setIdentity(result);
      } else {
        toast("No identity found — proceeding with username", { icon: "⚠️" });
        setIdentity({
          username: username.replace(/^@/, ""),
          displayName: username.replace(/^@/, ""),
          avatarUrl: "",
          cardImageUrl: null,
        });
      }
      setStep("identity-confirm");
    } catch {
      toast.error("Failed to look up identity");
    } finally {
      setIdentityLoading(false);
    }
  }, [username]);

  // ── Bind Identity onchain ───────────────────────────
  const alreadyBound = useMemo(() => {
    if (!linkedOnchain || !identity) return false;
    return (
      typeof linkedOnchain === "string" &&
      linkedOnchain.toLowerCase() === identity.username.toLowerCase()
    );
  }, [linkedOnchain, identity]);

  const handleBindIdentity = useCallback(async () => {
    if (!identity) return;
    if (alreadyBound) {
      setStep("confess");
      return;
    }
    try {
      const addr = assertCourtroomAddress();
      await writeBind({
        address: addr,
        abi: courtroomAbi,
        functionName: "bindIdentity",
        args: [identity.username],
        chainId: ritualChain.id,
      });
      toast("Identity tx submitted — waiting for confirmation…", { icon: "⏳" });
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      console.error("Bind failed:", err);
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        toast.error("Signature rejected");
      } else if (msg.includes("NEXT_PUBLIC_COURTROOM_ADDRESS")) {
        toast.error("Contract address not configured. Check Vercel env vars.");
      } else {
        toast.error(`Bind tx failed: ${msg.slice(0, 80) || "unknown error"}`);
      }
    }
  }, [identity, alreadyBound, writeBind]);

  useEffect(() => {
    if (bindSuccess) {
      toast.success("Identity bound onchain");
      refetchLinked();
      setStep("confess");
      resetBind();
    }
  }, [bindSuccess, refetchLinked, resetBind]);

  // ── Submit Confession ───────────────────────────────
  const handleConfess = useCallback(async () => {
    if (!confession.trim()) {
      toast.error("Confess something");
      return;
    }
    setJudgment(null);
    setScanReady(false);
    setStep("processing");

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identity?.username || username.replace(/^@/, ""),
          confession,
        }),
      });

      if (!res.ok) throw new Error("Judgment failed");
      const data = await res.json();
      setJudgment(data);
    } catch {
      setJudgment({
        intro: "THE TRIBUNAL HAS SPOKEN",
        sentence: "Sentenced to 24 hours of contemplation.",
        comment: "The system glitched. Consider yourself lucky.",
        isLegendary: false,
      });
    }
  }, [confession, identity, username]);

  const handleScanComplete = useCallback(() => setScanReady(true), []);

  useEffect(() => {
    if (step === "processing" && judgment && scanReady) {
      setStep("accept");
    }
  }, [step, judgment, scanReady]);

  // ── Accept Judgment — record onchain ────────────────
  const handleAcceptJudgment = useCallback(async () => {
    if (!judgment || !address || !identity) return;
    try {
      const addr = assertCourtroomAddress();
      const cHash = hashConfession(confession);
      const vHash = hashVerdict(judgment);
      await writeVerdict({
        address: addr,
        abi: courtroomAbi,
        functionName: "recordVerdict",
        args: [cHash, vHash, judgment.isLegendary],
        chainId: ritualChain.id,
      });
      toast("Verdict tx submitted — waiting for confirmation…", { icon: "⏳" });
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      console.error("Verdict failed:", err);
      if (msg.includes("User rejected") || msg.includes("rejected")) {
        toast.error("You cannot escape judgment");
      } else if (msg.includes("NEXT_PUBLIC_COURTROOM_ADDRESS")) {
        toast.error("Contract address not configured. Check Vercel env vars.");
      } else {
        toast.error(`Verdict tx failed: ${msg.slice(0, 80) || "unknown error"}`);
      }
    }
  }, [judgment, address, identity, confession, writeVerdict]);

  useEffect(() => {
    if (verdictSuccess && verdictHash && judgment && identity && address) {
      const cHash = hashConfession(confession);
      const vHash = hashVerdict(judgment);
      recordSession({
        wallet_address: address,
        username: identity.username,
        confession,
        verdict_intro: judgment.intro,
        verdict_sentence: judgment.sentence,
        verdict_comment: judgment.comment,
        is_legendary: judgment.isLegendary,
        confession_hash: cHash,
        verdict_hash: vHash,
        tx_hash: verdictHash,
        created_at: new Date().toISOString(),
      });
      toast.success("Verdict sealed onchain");
      refetchCooldown();
      setStep("verdict");
      resetVerdict();
    }
  }, [
    verdictSuccess,
    verdictHash,
    judgment,
    identity,
    address,
    confession,
    refetchCooldown,
    resetVerdict,
  ]);

  // ── Download Verdict ────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!verdictRef.current) return;
    try {
      const dataUrl = await toPng(verdictRef.current, {
        backgroundColor: "#0a0f1a",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `courtroom-verdict-${identity?.username || "anon"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Verdict downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      const msg = (err as Error)?.message || "unknown error";
      toast.error(`Download failed: ${msg.slice(0, 60)}`);
    }
  }, [identity]);

  // ── Share on X ──────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!verdictRef.current || !judgment) return;
    const text = `I survived The Courtroom.\n\nMy sentence: "${judgment.sentence}"\n\n⚖️ courtroom.rechat.xyz`;
    const filename = `courtroom-verdict-${identity?.username || "anon"}.png`;

    try {
      const blob = await toBlob(verdictRef.current, {
        backgroundColor: "#0a0f1a",
        pixelRatio: 2,
        cacheBust: true,
      });
      if (!blob) throw new Error("could not render verdict");

      const file = new File([blob], filename, { type: "image/png" });

      // Web Share API path — works on mobile + some desktop. Pre-attaches the
      // PNG when the user picks X from the system share sheet.
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
      };
      if (
        typeof nav.share === "function" &&
        typeof nav.canShare === "function" &&
        nav.canShare({ files: [file] })
      ) {
        await nav.share({ files: [file], text });
        return;
      }

      // Fallback: download the PNG then open the X intent so the user can
      // drag-and-drop the file into the tweet composer.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = filename;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("PNG downloaded — drop it into the tweet", {
        icon: "📎",
        duration: 5000,
      });
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.error("Share failed:", err);
      const msg = (err as Error)?.message || "unknown error";
      toast.error(`Share failed: ${msg.slice(0, 60)}`);
    }
  }, [judgment, identity]);

  // ── Render ──────────────────────────────────────────
  return (
    <main className="min-h-screen grid-bg flex flex-col items-center justify-center relative px-4 py-16">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00ff41]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-court-bg/80 backdrop-blur-sm border-b border-court-border">
        <p className="font-heading text-sm text-[#00ff41] neon-glow tracking-wider">
          THE COURTROOM
        </p>
        {isConnected && <WalletButton />}
      </div>

      <div className="w-full max-w-xl relative z-10 mt-8">
        <AnimatePresence mode="wait">
          {/* ═══ STEP: CONNECT ═══ */}
          {step === "connect" && (
            <motion.div
              key="connect"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-8"
            >
              <GlitchText
                text="CONNECT YOUR WALLET"
                as="h2"
                className="text-2xl sm:text-4xl text-[#00ff41] neon-glow"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider">
                THE TRIBUNAL REQUIRES IDENTIFICATION
              </p>
              <div className="w-full max-w-xs">
                <WalletButton />
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: WRONG CHAIN ═══ */}
          {step === "wrong-chain" && (
            <motion.div
              key="wrong-chain"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <GlitchText
                text="WRONG JURISDICTION"
                as="h2"
                className="text-2xl sm:text-4xl text-court-red neon-glow-red"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider max-w-sm">
                THIS COURT CONVENES ONLY ON THE RITUAL CHAIN
              </p>
              <button
                onClick={() => switchChain({ chainId: ritualChain.id })}
                disabled={switching}
                className="btn-neon disabled:opacity-30"
              >
                {switching ? "SWITCHING…" : "SWITCH TO RITUAL"}
              </button>
            </motion.div>
          )}

          {/* ═══ STEP: LOADING ═══ */}
          {step === "loading" && (
            <motion.div
              key="loading"
              {...fadeVariants}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <p className="font-mono text-court-muted text-xs tracking-[0.4em]">
                QUERYING THE TRIBUNAL RECORD…
              </p>
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-[#00ff41] rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-[#00ff41] rounded-full animate-pulse [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-[#00ff41] rounded-full animate-pulse [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}

          {/* ═══ STEP: COOLDOWN ═══ */}
          {step === "cooldown" && nextJudgment && (
            <motion.div
              key="cooldown"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <GlitchText
                text="COURT ACCESS DENIED"
                as="h2"
                className="text-2xl sm:text-4xl text-court-red neon-glow-red"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider max-w-sm">
                You have already faced judgment today.
              </p>
              <p className="font-mono text-court-muted text-xs tracking-wider">
                RETURN IN
              </p>
              <CountdownTimer
                targetTime={nextJudgment}
                onComplete={() => {
                  refetchCooldown();
                  setStep("identity");
                }}
              />
            </motion.div>
          )}

          {/* ═══ STEP: IDENTITY ═══ */}
          {step === "identity" && (
            <motion.div
              key="identity"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <GlitchText
                text="IDENTIFY YOURSELF"
                as="h2"
                className="text-2xl sm:text-4xl text-[#00ff41] neon-glow"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider">
                ENTER YOUR X USERNAME
              </p>
              <div className="w-full max-w-sm">
                <TerminalInput
                  value={username}
                  onChange={setUsername}
                  placeholder="@username"
                  maxLength={30}
                  onSubmit={handleIdentityLookup}
                />
              </div>
              <button
                onClick={handleIdentityLookup}
                disabled={identityLoading || !username.trim()}
                className="btn-neon disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {identityLoading ? "SEARCHING..." : "VERIFY IDENTITY"}
              </button>
            </motion.div>
          )}

          {/* ═══ STEP: IDENTITY CONFIRM ═══ */}
          {step === "identity-confirm" && identity && (
            <motion.div
              key="identity-confirm"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <motion.p
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="font-mono text-[#00ff41] text-sm tracking-[0.3em] neon-glow"
              >
                IDENTITY DETECTED
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="border border-[#00ff41]/20 bg-court-surface/50 p-6 flex items-center gap-5 w-full max-w-sm neon-box"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#00ff41]/40 shrink-0">
                  {identity.avatarUrl ? (
                    <img
                      src={identity.avatarUrl}
                      alt={identity.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-court-bg flex items-center justify-center font-mono text-court-muted text-xl">
                      ?
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-mono text-court-text text-base">
                    @{identity.username}
                  </p>
                  {identity.displayName !== identity.username && (
                    <p className="font-body text-court-muted text-sm">
                      {identity.displayName}
                    </p>
                  )}
                  {address && (
                    <p className="font-mono text-court-muted text-xs mt-1">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  )}
                  {identity.cardImageUrl && (
                    <p className="font-mono text-[#00ff41]/60 text-[10px] mt-1 tracking-wider">
                      ✓ RITUAL ONCHAIN ID
                    </p>
                  )}
                  {alreadyBound && (
                    <p className="font-mono text-[#00ff41]/60 text-[10px] mt-1 tracking-wider">
                      ✓ ALREADY BOUND ONCHAIN
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <p className="font-mono text-court-muted text-xs mb-4 max-w-sm">
                  {alreadyBound
                    ? "This wallet has already bound this identity. Proceed to confession."
                    : "Send a transaction to bind this wallet to your username onchain."}
                </p>
                <button
                  onClick={handleBindIdentity}
                  disabled={bindPending}
                  className="btn-neon disabled:opacity-30"
                >
                  {bindPending
                    ? "CONFIRMING…"
                    : alreadyBound
                    ? "CONTINUE"
                    : "BIND IDENTITY"}
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ STEP: CONFESS ═══ */}
          {step === "confess" && (
            <motion.div
              key="confess"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <GlitchText
                text="CONFESS"
                as="h2"
                className="text-2xl sm:text-4xl text-[#00ff41] neon-glow"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider">
                THE TRIBUNAL IS LISTENING
              </p>
              <div className="w-full">
                <TerminalInput
                  value={confession}
                  onChange={setConfession}
                  placeholder="CONFESS YOUR INTERNET CRIMES..."
                  maxLength={280}
                  multiline
                  onSubmit={handleConfess}
                />
              </div>
              <button
                onClick={handleConfess}
                disabled={!confession.trim()}
                className="btn-neon-red btn-neon disabled:opacity-30 disabled:cursor-not-allowed"
              >
                SUBMIT CONFESSION
              </button>
            </motion.div>
          )}

          {/* ═══ STEP: PROCESSING ═══ */}
          {step === "processing" && (
            <motion.div
              key="processing"
              {...fadeVariants}
              transition={{ duration: 0.3 }}
            >
              <ScanAnimation
                onComplete={handleScanComplete}
                minDuration={3500}
              />
            </motion.div>
          )}

          {/* ═══ STEP: ACCEPT ═══ */}
          {step === "accept" && judgment && (
            <motion.div
              key="accept"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <GlitchText
                text="JUDGMENT RENDERED"
                as="h2"
                className="text-2xl sm:text-3xl text-court-amber"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider max-w-sm">
                THE TRIBUNAL REQUIRES YOUR ACCEPTANCE BEFORE THE VERDICT IS
                REVEALED
              </p>

              <div className="border border-court-border bg-court-surface/30 p-6 w-full max-w-sm relative overflow-hidden">
                <div className="blur-md select-none pointer-events-none">
                  <p className="font-heading text-lg text-[#00ff41] mb-2">
                    {judgment.intro}
                  </p>
                  <p className="font-body text-court-text text-sm">
                    {judgment.sentence}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="font-mono text-court-amber text-xs tracking-[0.3em] bg-court-bg/80 px-4 py-2">
                    CLASSIFIED
                  </p>
                </div>
              </div>

              <p className="font-mono text-court-muted text-xs max-w-sm">
                Signing this transaction seals your verdict onchain and starts
                the 24h cooldown.
              </p>
              <button
                onClick={handleAcceptJudgment}
                disabled={verdictPending}
                className="btn-neon-red btn-neon disabled:opacity-30"
              >
                {verdictPending ? "CONFIRMING…" : "ACCEPT JUDGMENT"}
              </button>
            </motion.div>
          )}

          {/* ═══ STEP: VERDICT ═══ */}
          {step === "verdict" && judgment && (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center gap-8"
            >
              <VerdictCard
                ref={verdictRef}
                username={identity?.username || username.replace(/^@/, "")}
                avatarUrl={identity?.avatarUrl}
                judgment={judgment}
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <button onClick={handleDownload} className="btn-neon">
                  DOWNLOAD VERDICT
                </button>
                <button onClick={handleShare} className="btn-neon">
                  SHARE ON X
                </button>
                <Link href="/wall" className="btn-neon text-center">
                  VIEW THE WALL
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-center"
              >
                <p className="font-mono text-court-muted text-xs tracking-wider">
                  COURT SESSION COMPLETE
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ STEP: LOCKED ═══ */}
          {step === "locked" && nextJudgment && (
            <motion.div
              key="locked"
              {...fadeVariants}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center text-center gap-6"
            >
              <GlitchText
                text="SESSION COMPLETE"
                as="h2"
                className="text-2xl sm:text-3xl text-court-muted"
              />
              <p className="font-mono text-court-muted text-sm tracking-wider">
                RETURN IN
              </p>
              <CountdownTimer
                targetTime={nextJudgment}
                onComplete={() => {
                  refetchCooldown();
                  setStep("identity");
                  setJudgment(null);
                  setConfession("");
                  setIdentity(null);
                  setUsername("");
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
