"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_TYPES = [
    { value: "story_tag",        label: "Story Tag",        suggested: 25, desc: "Tag in an Instagram/TikTok story" },
    { value: "story_highlight",  label: "Story Highlight",  suggested: 45, desc: "Permanent highlight feature" },
    { value: "permanent_follow", label: "Permanent Follow", suggested: 15, desc: "Follow fan's account permanently" },
    { value: "timed_follow",     label: "Timed Follow",     suggested: 10, desc: "Follow for a set number of days" },
    { value: "post_tag",         label: "Post Tag",         suggested: 35, desc: "Tag in a feed post" },
    { value: "comment",          label: "Comment",          suggested: 8,  desc: "Leave a comment on fan's post" },
];

const STEPS = ["Socials", "Profile", "Services", "Go Live"];

const INPUT = "w-full bg-lk-black border border-lk-border text-lk-white placeholder:text-lk-muted rounded-xl px-4 py-3 text-sm focus:border-lk-amber outline-none transition-colors";
const LABEL = "block text-xs font-semibold text-lk-muted-bright uppercase tracking-[0.12em] mb-1.5";

export default function InfluencerOnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [step,    setStep]    = useState(0);
    const [saving,  setSaving]  = useState(false);
    const [fetching, setFetching] = useState(false);
    const [synced,  setSynced]  = useState(false); // did we successfully fetch social data?

    // Socials (step 0)
    const [instagramHandle, setInstagramHandle] = useState("");
    const [tiktokHandle,    setTiktokHandle]    = useState("");

    // Profile (step 1) — pre-filled from fetch
    const [displayName,    setDisplayName]    = useState("");
    const [bio,            setBio]            = useState("");
    const [profilePicUrl,  setProfilePicUrl]  = useState("");
    const [followersCount, setFollowersCount] = useState(""); // read-only, fetched only
    const [followersScraped, setFollowersScraped] = useState(false);

    // Services (step 2)
    const [services, setServices] = useState<{ type: string; price: string }[]>([
        { type: "story_tag", price: "25" },
    ]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    // ── Fetch profile from social ──────────────────────────────
    const fetchSocialProfile = async (): Promise<boolean> => {
        const ig = instagramHandle.trim().replace(/^@/, "");
        const tt = tiktokHandle.trim().replace(/^@/, "");
        if (!ig && !tt) {
            toast.error("Enter at least one social handle.");
            return false;
        }

        setFetching(true);
        const platform = ig ? "instagram" : "tiktok";
        const handle   = ig || tt;

        try {
            const res = await fetch(
                `${API_URL}/social/preview?platform=${platform}&handle=${encodeURIComponent(handle)}`
            );
            if (!res.ok) throw new Error("Could not fetch profile.");
            const data = await res.json();

            // Pre-fill whatever the API returns
            if (data.display_name)        setDisplayName(data.display_name);
            if (data.bio)                 setBio(data.bio);
            if (data.profile_picture_url) setProfilePicUrl(data.profile_picture_url);
            if (data.followers_count)     setFollowersCount(String(data.followers_count));
            setFollowersScraped(!!data.followers_count);

            setSynced(true);
            return true;
        } catch (err: any) {
            // Soft fail — let them fill manually
            toast.error("Couldn't auto-fetch your profile — you can fill it in manually.");
            setSynced(false);
            return true; // still advance
        } finally {
            setFetching(false);
        }
    };

    // ── Save profile to backend ────────────────────────────────
    const saveProfile = async () => {
        if (!displayName.trim()) { toast.error("Display name is required."); return false; }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/influencers/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    display_name: displayName,
                    bio: bio || null,
                    instagram_handle: instagramHandle.trim().replace(/^@/, "") || null,
                    tiktok_handle: tiktokHandle.trim().replace(/^@/, "") || null,
                    profile_picture_url: profilePicUrl || null,
                    followers_count: (followersScraped && followersCount) ? parseInt(followersCount) : null,
                }),
            });
            if (!res.ok) throw new Error("Failed to save profile.");
            return true;
        } catch (err: any) {
            toast.error(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    // ── Save services to backend ───────────────────────────────
    const saveServices = async () => {
        const valid = services.filter(s => s.price && parseFloat(s.price) > 0);
        if (valid.length === 0) { toast.error("Add at least one service."); return false; }
        setSaving(true);
        try {
            for (const s of valid) {
                const res = await fetch(`${API_URL}/influencers/services`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ engagement_type: s.type, price: parseFloat(s.price) }),
                });
                if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to save service."); }
            }
            return true;
        } catch (err: any) {
            toast.error(err.message);
            return false;
        } finally {
            setSaving(false);
        }
    };

    // ── Step progression ───────────────────────────────────────
    const handleNext = async () => {
        if (step === 0) {
            const ok = await fetchSocialProfile();
            if (ok) setStep(1);
        } else if (step === 1) {
            const ok = await saveProfile();
            if (ok) setStep(2);
        } else if (step === 2) {
            const ok = await saveServices();
            if (ok) setStep(3);
        } else {
            router.push("/dashboard");
        }
    };

    if (status === "loading") return null;

    const isBusy = saving || fetching;

    return (
        <div className="min-h-screen bg-lk-black flex items-center justify-center px-4 py-16 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(240,165,0,0.06) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,205,180,0.05) 0%, transparent 70%)" }} />

            <div className="relative max-w-lg w-full">

                {/* Step indicator */}
                <div className="flex items-center justify-center mb-10">
                    {STEPS.map((label, i) => (
                        <div key={label} className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                    i < step  ? "bg-lk-amber border-lk-amber text-lk-black" :
                                    i === step ? "border-lk-amber text-lk-amber" :
                                                 "border-lk-border text-lk-muted"
                                }`} style={{ fontFamily: "var(--font-syne)" }}>
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span className={`text-[10px] font-semibold tracking-[0.12em] uppercase hidden sm:block ${i <= step ? "text-lk-muted-bright" : "text-lk-muted"}`}>
                                    {label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`h-px w-6 sm:w-10 mx-2 transition-colors ${i < step ? "bg-lk-amber/50" : "bg-lk-border"}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-8">

                    {/* ── Step 0: Socials ── */}
                    {step === 0 && (
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-2">Step 1</p>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                                What&apos;s your handle?
                            </h1>
                            <p className="text-lk-muted text-sm mb-7">
                                We&apos;ll pull your name, bio, profile pic and follower count automatically.
                            </p>

                            <div className="space-y-4">
                                {/* Instagram */}
                                <div>
                                    <label className={LABEL}>
                                        <span className="inline-flex items-center gap-1.5">
                                            {/* IG gradient icon */}
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="url(#ig)" strokeWidth="2">
                                                <defs>
                                                    <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1">
                                                        <stop offset="0%" stopColor="#E1306C"/>
                                                        <stop offset="100%" stopColor="#FCAF45"/>
                                                    </linearGradient>
                                                </defs>
                                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                                <circle cx="12" cy="12" r="4"/>
                                                <circle cx="17.5" cy="6.5" r="1" fill="#FCAF45" stroke="none"/>
                                            </svg>
                                            Instagram Handle
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lk-muted text-sm">@</span>
                                        <input
                                            value={instagramHandle}
                                            onChange={e => setInstagramHandle(e.target.value)}
                                            className={INPUT + " pl-8"}
                                            placeholder="yourhandle"
                                        />
                                    </div>
                                </div>

                                {/* TikTok */}
                                <div>
                                    <label className={LABEL}>
                                        <span className="inline-flex items-center gap-1.5">
                                            <svg width="12" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-lk-muted-bright">
                                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.5a8.16 8.16 0 004.77 1.52V6.56a4.85 4.85 0 01-1-.13z"/>
                                            </svg>
                                            TikTok Handle
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lk-muted text-sm">@</span>
                                        <input
                                            value={tiktokHandle}
                                            onChange={e => setTiktokHandle(e.target.value)}
                                            className={INPUT + " pl-8"}
                                            placeholder="yourhandle"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 bg-lk-black border border-lk-border rounded-xl p-3 text-xs text-lk-muted leading-relaxed">
                                Enter at least one handle. We&apos;ll try to fetch your profile — you can edit everything on the next screen.
                            </div>
                        </div>
                    )}

                    {/* ── Step 1: Profile (pre-filled) ── */}
                    {step === 1 && (
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-2">Step 2</p>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                                Your public profile
                            </h1>
                            <p className="text-lk-muted text-sm mb-6">
                                This is how fans see you in the marketplace. Edit anything below.
                            </p>

                            {synced && (
                                <div className="flex items-center gap-2 mb-5 text-xs text-lk-cyan bg-lk-cyan/10 border border-lk-cyan/20 rounded-xl px-3 py-2">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                                    Profile synced from {instagramHandle ? "Instagram" : "TikTok"} — edit freely below.
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Profile pic */}
                                <div>
                                    <label className={LABEL}>Profile picture</label>
                                    {profilePicUrl ? (
                                        <div className="flex items-center gap-4 bg-lk-black border border-lk-border rounded-xl p-3">
                                            <Image
                                                src={profilePicUrl}
                                                alt="Profile"
                                                width={52}
                                                height={52}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-lk-border flex-shrink-0"
                                                unoptimized
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-lk-cyan font-semibold mb-1 flex items-center gap-1">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                                                    Synced — or paste a different URL
                                                </p>
                                                <input
                                                    value={profilePicUrl}
                                                    onChange={e => setProfilePicUrl(e.target.value)}
                                                    className="w-full bg-transparent border-b border-lk-border text-lk-muted text-xs outline-none focus:border-lk-amber pb-0.5 transition-colors truncate"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 bg-lk-black border border-dashed border-lk-border rounded-xl p-3">
                                                <div className="w-14 h-14 rounded-full bg-lk-surface border border-lk-border flex items-center justify-center flex-shrink-0">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lk-muted"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-lk-muted mb-1">Couldn&apos;t auto-fetch — paste a link to your photo</p>
                                                    <input
                                                        value={profilePicUrl}
                                                        onChange={e => setProfilePicUrl(e.target.value)}
                                                        className="w-full bg-transparent border-b border-lk-border text-lk-white text-xs outline-none focus:border-lk-amber pb-0.5 transition-colors"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className={LABEL}>Display Name *</label>
                                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={INPUT} placeholder="Your public name" />
                                </div>
                                <div>
                                    <label className={LABEL}>Bio</label>
                                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={INPUT + " resize-none"} placeholder="Tell fans about yourself..." />
                                </div>
                                <div>
                                    <label className={LABEL}>Followers</label>
                                    {followersScraped && followersCount ? (
                                        <div className="flex items-center gap-3 bg-lk-black border border-lk-border rounded-xl px-4 py-3">
                                            <span className="text-lk-white text-sm font-bold">
                                                {parseInt(followersCount).toLocaleString()}
                                            </span>
                                            <span className="text-xs text-lk-cyan font-semibold bg-lk-cyan/10 border border-lk-cyan/20 rounded-full px-2 py-0.5">
                                                synced
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-lk-black border border-lk-border rounded-xl px-4 py-3 opacity-50">
                                            <span className="text-lk-muted text-sm">Could not fetch — will be verified later</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Services ── */}
                    {step === 2 && (
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-2">Step 3</p>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                                Add your services
                            </h1>
                            <p className="text-lk-muted text-sm mb-6">What do you offer? Set your prices.</p>
                            <div className="space-y-3">
                                {services.map((service, i) => {
                                    const suggestion = ENGAGEMENT_TYPES.find(t => t.value === service.type);
                                    return (
                                        <div key={i} className="bg-lk-black border border-lk-border rounded-xl p-4">
                                            <div className="flex gap-3 items-start">
                                                <div className="flex-1">
                                                    <select
                                                        value={service.type}
                                                        onChange={e => {
                                                            const updated = [...services];
                                                            const sugg = ENGAGEMENT_TYPES.find(t => t.value === e.target.value);
                                                            updated[i] = { type: e.target.value, price: sugg ? String(sugg.suggested) : "10" };
                                                            setServices(updated);
                                                        }}
                                                        className="w-full bg-lk-surface border border-lk-border text-lk-white rounded-lg px-3 py-2 text-sm focus:border-lk-amber outline-none"
                                                    >
                                                        {ENGAGEMENT_TYPES.map(t => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                    {suggestion && <p className="text-xs text-lk-muted mt-1">{suggestion.desc}</p>}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <span className="text-lk-muted text-sm font-medium">$</span>
                                                    <input
                                                        type="number" min="1" step="1"
                                                        value={service.price}
                                                        onChange={e => {
                                                            const updated = [...services];
                                                            updated[i] = { ...updated[i], price: e.target.value };
                                                            setServices(updated);
                                                        }}
                                                        className="w-20 bg-lk-surface border border-lk-border text-lk-white rounded-lg px-2 py-2 text-sm focus:border-lk-amber outline-none text-center"
                                                    />
                                                </div>
                                                {services.length > 1 && (
                                                    <button onClick={() => setServices(services.filter((_, idx) => idx !== i))} className="text-lk-muted hover:text-rose-400 p-1 flex-shrink-0 transition-colors">✕</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={() => setServices([...services, { type: "comment", price: "8" }])}
                                    className="w-full py-2.5 border-2 border-dashed border-lk-border text-lk-muted text-sm rounded-xl hover:border-lk-amber/50 hover:text-lk-amber transition-colors"
                                >
                                    + Add another service
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Go Live ── */}
                    {step === 3 && (
                        <div className="text-center py-4">
                            <div className="text-5xl font-black text-lk-amber mb-4 leading-none" style={{ fontFamily: "var(--font-syne)" }}>✦</div>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-2" style={{ fontFamily: "var(--font-syne)" }}>
                                You&apos;re live.
                            </h1>
                            <p className="text-lk-muted text-sm mb-6 leading-relaxed">
                                Your profile is visible in the marketplace.<br />Fans can start booking you right now.
                            </p>
                            <div className="bg-lk-black border border-lk-border rounded-xl p-4 text-left mb-4">
                                <p className="text-xs font-semibold text-lk-amber uppercase tracking-[0.12em] mb-3">Next steps</p>
                                <ul className="space-y-2 text-sm text-lk-muted-bright">
                                    {["Verify your social accounts from your dashboard", "Add recent post URLs to show off your content", "Set up Stripe to receive payouts"].map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                            <span className="text-lk-cyan mt-0.5 flex-shrink-0">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        onClick={handleNext}
                        disabled={isBusy}
                        className="mt-6 w-full py-3.5 bg-lk-amber text-lk-black font-bold rounded-full text-sm tracking-wide hover:brightness-110 transition-all disabled:opacity-50 shadow-lg hover:shadow-lk-amber/20"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        {fetching ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                Fetching your profile…
                            </span>
                        ) : saving ? "Saving…" :
                          step === 0 ? "Fetch My Profile →" :
                          step === 3 ? "Go to Dashboard →" :
                          "Continue →"}
                    </button>

                    {step < 3 && (
                        <button
                            onClick={() => step === 0 ? router.push("/dashboard") : setStep(s => s + 1)}
                            className="mt-3 w-full py-2 text-xs text-lk-muted hover:text-lk-muted-bright transition-colors"
                        >
                            {step === 0 ? "Skip — I'll fill in manually" : "Skip for now"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
