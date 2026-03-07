"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_TYPES = [
    { value: "story_tag",       label: "Story Tag",        suggested: 25, desc: "Tag in an Instagram/TikTok story" },
    { value: "story_highlight", label: "Story Highlight",  suggested: 45, desc: "Permanent highlight feature" },
    { value: "permanent_follow",label: "Permanent Follow", suggested: 15, desc: "Follow fan's account permanently" },
    { value: "timed_follow",    label: "Timed Follow",     suggested: 10, desc: "Follow for a set number of days" },
    { value: "post_tag",        label: "Post Tag",         suggested: 35, desc: "Tag in a feed post" },
    { value: "comment",         label: "Comment",          suggested: 8,  desc: "Leave a comment on fan's post" },
];

const STEPS = ["Profile", "Social", "Services", "Go Live"];

const INPUT = "w-full bg-lk-black border border-lk-border text-lk-white placeholder:text-lk-muted rounded-xl px-4 py-3 text-sm focus:border-lk-amber outline-none transition-colors";
const LABEL = "block text-xs font-semibold text-lk-muted-bright uppercase tracking-[0.12em] mb-1.5";

export default function InfluencerOnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    const [displayName,    setDisplayName]    = useState("");
    const [bio,            setBio]            = useState("");
    const [profilePicUrl,  setProfilePicUrl]  = useState("");
    const [followersCount, setFollowersCount] = useState("");

    const [instagramHandle, setInstagramHandle] = useState("");
    const [tiktokHandle,    setTiktokHandle]    = useState("");
    const [syncing, setSyncing] = useState<"instagram" | "tiktok" | null>(null);

    const [services, setServices] = useState<{ type: string; price: string }[]>([
        { type: "story_tag", price: "25" },
    ]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    const syncFromSocial = async (platform: "instagram" | "tiktok") => {
        const handle = (platform === "instagram" ? instagramHandle : tiktokHandle).trim().replace(/^@/, "");
        if (!handle) { toast.error(`Enter your ${platform} handle first.`); return; }
        setSyncing(platform);
        try {
            const res = await fetch(`${API_URL}/social/preview?platform=${platform}&handle=${encodeURIComponent(handle)}`);
            if (!res.ok) throw new Error("Could not fetch profile data.");
            const data = await res.json();
            setProfilePicUrl(data.profile_picture_url);
            if (data.followers_count) setFollowersCount(String(data.followers_count));
            toast.success("Profile synced!");
        } catch (err: any) {
            toast.error(err.message || "Sync failed.");
        } finally {
            setSyncing(null);
        }
    };

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
                    instagram_handle: instagramHandle || null,
                    tiktok_handle: tiktokHandle || null,
                    profile_picture_url: profilePicUrl || null,
                    followers_count: followersCount ? parseInt(followersCount) : null,
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

    const handleNext = async () => {
        if (step === 0)      { const ok = await saveProfile();  if (ok) setStep(1); }
        else if (step === 1) { const ok = await saveProfile();  if (ok) setStep(2); }
        else if (step === 2) { const ok = await saveServices(); if (ok) setStep(3); }
        else                 { router.push("/dashboard"); }
    };

    if (status === "loading") return null;

    return (
        <div className="min-h-screen bg-lk-black flex items-center justify-center px-4 py-16 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(240,165,0,0.06) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,205,180,0.05) 0%, transparent 70%)" }} />

            <div className="relative max-w-lg w-full">
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-0 mb-10">
                    {STEPS.map((label, i) => (
                        <div key={label} className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                    i < step  ? "bg-lk-amber border-lk-amber text-lk-black" :
                                    i === step ? "border-lk-amber text-lk-amber bg-transparent" :
                                                 "border-lk-border text-lk-muted bg-transparent"
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

                    {/* ── Step 0: Profile ── */}
                    {step === 0 && (
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-2">Step 1</p>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                                Set up your profile
                            </h1>
                            <p className="text-lk-muted text-sm mb-6">This is how fans discover you in the marketplace.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className={LABEL}>Display Name *</label>
                                    <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={INPUT} placeholder="Your public name" />
                                </div>
                                <div>
                                    <label className={LABEL}>Bio</label>
                                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className={INPUT + " resize-none"} placeholder="Tell fans about yourself..." />
                                </div>
                                <div>
                                    <label className={LABEL}>Profile Picture URL</label>
                                    <input value={profilePicUrl} onChange={e => setProfilePicUrl(e.target.value)} className={INPUT} placeholder="Paste URL (or sync from social in next step)" />
                                </div>
                                <div>
                                    <label className={LABEL}>Followers Count</label>
                                    <input type="number" min="0" value={followersCount} onChange={e => setFollowersCount(e.target.value)} className={INPUT} placeholder="e.g. 25000" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Step 1: Social ── */}
                    {step === 1 && (
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-2">Step 2</p>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-1" style={{ fontFamily: "var(--font-syne)" }}>
                                Connect your socials
                            </h1>
                            <p className="text-lk-muted text-sm mb-6">Add your handles and sync your profile automatically.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className={LABEL}>Instagram Handle</label>
                                    <div className="flex gap-2">
                                        <input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} className={INPUT} placeholder="yourhandle" />
                                        <button
                                            type="button"
                                            onClick={() => syncFromSocial("instagram")}
                                            disabled={syncing !== null}
                                            className="px-4 py-2 text-xs font-bold rounded-xl text-lk-black disabled:opacity-50 flex-shrink-0"
                                            style={{ background: "linear-gradient(135deg,#E1306C,#FCAF45)" }}
                                        >
                                            {syncing === "instagram" ? "…" : "Sync"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL}>TikTok Handle</label>
                                    <div className="flex gap-2">
                                        <input value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)} className={INPUT} placeholder="yourhandle" />
                                        <button
                                            type="button"
                                            onClick={() => syncFromSocial("tiktok")}
                                            disabled={syncing !== null}
                                            className="px-4 py-2 text-xs font-bold bg-lk-white text-lk-black rounded-xl hover:bg-lk-muted-bright disabled:opacity-50 flex-shrink-0"
                                        >
                                            {syncing === "tiktok" ? "…" : "Sync"}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-lk-black border border-lk-border rounded-xl p-4 text-xs text-lk-muted-bright leading-relaxed">
                                    <span className="text-lk-amber font-semibold">Tip:</span> After going live, verify your accounts from your dashboard by sending a DM with your unique code — this adds a verified badge to your profile.
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
                                                    {suggestion && (
                                                        <p className="text-xs text-lk-muted mt-1">{suggestion.desc}</p>
                                                    )}
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
                            <div
                                className="text-5xl font-black text-lk-amber mb-4 leading-none"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >✦</div>
                            <h1 className="font-black text-lk-white text-2xl tracking-[-0.02em] mb-2" style={{ fontFamily: "var(--font-syne)" }}>
                                You&apos;re live.
                            </h1>
                            <p className="text-lk-muted text-sm mb-6 leading-relaxed">
                                Your profile is visible in the marketplace.<br />Fans can start booking you right now.
                            </p>
                            <div className="bg-lk-black border border-lk-border rounded-xl p-4 text-left mb-4">
                                <p className="text-xs font-semibold text-lk-amber uppercase tracking-[0.12em] mb-3">Next steps</p>
                                <ul className="space-y-2 text-sm text-lk-muted-bright">
                                    {[
                                        "Verify your social accounts from your dashboard",
                                        "Add recent post URLs to show off your content",
                                        "Set up Stripe to receive payouts",
                                    ].map(item => (
                                        <li key={item} className="flex items-start gap-2">
                                            <span className="text-lk-cyan mt-0.5 flex-shrink-0">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleNext}
                        disabled={saving}
                        className="mt-6 w-full py-3.5 bg-lk-amber text-lk-black font-bold rounded-full text-sm tracking-wide hover:brightness-110 transition-all disabled:opacity-50 shadow-lg hover:shadow-lk-amber/20"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        {saving ? "Saving…" : step === 3 ? "Go to Dashboard →" : "Continue →"}
                    </button>

                    {step < 3 && (
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="mt-3 w-full py-2 text-xs text-lk-muted hover:text-lk-muted-bright transition-colors"
                        >
                            Skip for now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
