import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mepdfruoelezhjgatvqf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lcGRmcnVvZWxlemhqZ2F0dnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjMyNzUsImV4cCI6MjA5MjczOTI3NX0.noWIS2zNCEAPVFMzBhf_pYkpn5hqRqQo2xbl2mohGEw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface RitualIdentity {
  username: string;
  displayName: string;
  avatarUrl: string;
  cardImageUrl: string | null;
}

/**
 * Look up a Ritual Onchain ID by wallet address.
 */
export async function lookupIdentityByWallet(
  walletAddress: string
): Promise<RitualIdentity | null> {
  const { data, error } = await supabase
    .from("ritual_cards")
    .select("username, image_url")
    .eq("wallet_address", walletAddress.toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const profile = await fetchXProfile(data.username);
  return {
    username: data.username,
    displayName: profile?.displayName ?? data.username,
    avatarUrl: profile?.avatarUrl ?? "",
    cardImageUrl: data.image_url ?? null,
  };
}

/**
 * Look up a Ritual Onchain ID by X username.
 */
export async function lookupIdentityByUsername(
  username: string
): Promise<RitualIdentity | null> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) return null;

  const { data, error } = await supabase
    .from("ritual_cards")
    .select("username, image_url, wallet_address")
    .eq("username", clean)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const profile = await fetchXProfile(clean);

  if (data) {
    return {
      username: data.username,
      displayName: profile?.displayName ?? data.username,
      avatarUrl: profile?.avatarUrl ?? "",
      cardImageUrl: data.image_url ?? null,
    };
  }

  // Not in Ritual Onchain ID but we can still try to fetch X profile
  if (profile) {
    return {
      username: clean,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      cardImageUrl: null,
    };
  }

  return null;
}

/**
 * Fetch live X/Twitter profile data via fxtwitter API.
 */
export async function fetchXProfile(
  username: string
): Promise<{ displayName: string; avatarUrl: string } | null> {
  try {
    const clean = username.trim().replace(/^@/, "");
    const res = await fetch(
      `https://api.fxtwitter.com/${encodeURIComponent(clean)}`
    );
    if (!res.ok) return null;

    const json = await res.json();
    const user = json?.user;
    if (!user) return null;

    const avatarUrl = (user.avatar_url || "").replace("_normal", "_400x400");
    return {
      displayName: user.name || clean,
      avatarUrl,
    };
  } catch {
    return null;
  }
}
