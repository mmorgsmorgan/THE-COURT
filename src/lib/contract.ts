import { keccak256, toBytes } from "viem";
import type { Judgment } from "./judge";

const SESSION_KEY = "courtroom_sessions";

export interface CourtroomSession {
  wallet_address: string;
  username: string;
  confession: string;
  verdict_intro: string;
  verdict_sentence: string;
  verdict_comment: string;
  is_legendary: boolean;
  confession_hash: `0x${string}`;
  verdict_hash: `0x${string}`;
  tx_hash: `0x${string}`;
  created_at: string;
}

export function hashConfession(confession: string): `0x${string}` {
  return keccak256(toBytes(confession.trim()));
}

export function serializeVerdict(judgment: Judgment): string {
  return JSON.stringify({
    intro: judgment.intro,
    sentence: judgment.sentence,
    comment: judgment.comment,
    isLegendary: judgment.isLegendary,
  });
}

export function hashVerdict(judgment: Judgment): `0x${string}` {
  return keccak256(toBytes(serializeVerdict(judgment)));
}

export function recordSession(session: CourtroomSession): void {
  if (typeof window === "undefined") return;
  const existing: CourtroomSession[] = JSON.parse(
    localStorage.getItem(SESSION_KEY) || "[]"
  );
  existing.unshift(session);
  localStorage.setItem(SESSION_KEY, JSON.stringify(existing.slice(0, 50)));
}

export function getSessions(): CourtroomSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
  } catch {
    return [];
  }
}
