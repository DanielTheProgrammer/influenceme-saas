"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_TYPES = [
    { value: "story_tag", label: "Story Tag", suggested: 25, desc: "Tag in an Instagram/TikTok story" },
    { value: "story_highlight", label: "Story Highlight", suggested: 45, desc: "Permanent highlight feature" },
    { value: "permanent_follow", label: "Permanent Follow", suggested: 15, desc: "Follow fan's account permanently" },
    { value: "timed_follow", label: "Timed Follow", suggested: 10, desc: "Follow for a set number of days" },
    { value: "post_tag", label: "Post Tag", suggested: 35, desc: "Tag in a feed post" },
    { value: "comment", label: "Comment", suggested: 8, desc: "Leave a comment on fan's post" },
];

const STEPS = ["Profile", "Social", "Services", "Go Live"];

export default function InfluencerOnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    // Profile step
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [profilePicUrl, setProfilePicUrl] = useState("");
    const [followersCount, setFollowersCount] = useState("");

    // Social step
    const [instagramHandle, setInstagramHandle] = useState("");
    const [tiktokHandle, setTiktokHandle] = useState("");
    const [syncing, setSyncing] = useState<"instagram" | "tiktok" | null>(null);

    // Services step
    const [services, setServices] = useState<{ type: string; price: string }[]>([
        { type: "story_tag", price: "25" },
    ]);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    const syncFromSocial = async (platform: "instagram" | "tiktok") => {
        const handle = (platform === "instagram" ? instagramHandle : tiktokHandle).trim().replace(/^@/, "");
        if (!handle) {
            toast.error(`Enter your ${platform} handle first.`);
            return;
        }
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

    const addServiceRow = () => {
        setServices([...services, { type: "comment", price: "8" }]);
    };

    const removeServiceRow = (i: number) => {
        setServices(services.filter((_, idx) => idx !== i));
    };

    const saveProfile = async () => {
        if (!displayName.trim()) {
            toast.error("Display name is required.");
            return false;
        }
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
        const validServices = services.filter((s) => s.price && parseFloat(s.price) > 0);
        if (validServices.length === 0) {
            toast.error("Add at least one service.");
            return false;
        }
        setSaving(true);
        try {
            for (const s of validServices) {
                const res = await fetch(`${API_URL}/influencers/services`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ engagement_type: s.type, price: parseFloat(s.price) }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || "Failed to save service.");
                }
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
        if (step === 0) {
            const ok = await saveProfile();
            if (ok) setStep(1);
        } else if (step === 1) {
            // Social step — just save profile with handles
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4 py-12">
            <div className="max-w-lg w-full">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-8">
                    {STEPS.map((label, i) => (
                        <div key={label} className="flex items-center">
                            <div className={`flex items-center gap-2 ${i <= step ? "text-violet-700" : "text-gray-400"}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                                    i < step ? "bg-violet-600 border-violet-600 text-white" :
                                    i === step ? "border-violet-600 text-violet-600" :
                                    "border-gray-300 text-gray-400"
                                }`}>
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span className="text-xs font-medium hidden sm:block">{label}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`h-px w-8 sm:w-12 mx-2 ${i < step ? "bg-violet-400" : "bg-gray-200"}`} />
                            )}
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    {step === 0 && (
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Set up your profile</h1>
                            <p className="text-gray-500 text-sm mb-6">This is how fans will see you in the marketplace.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                                    <input
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                                        placeholder="Your public name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                                        placeholder="Tell fans about yourself..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
                                    <input
                                        value={profilePicUrl}
                                        onChange={(e) => setProfilePicUrl(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                                        placeholder="Paste URL (or sync from social in next step)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Followers Count</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={followersCount}
                                        onChange={(e) => setFollowersCount(e.target.value)}
                                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                                        placeholder="e.g. 25000"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Connect your socials</h1>
                            <p className="text-gray-500 text-sm mb-6">Add your handles and sync your profile picture automatically.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Handle</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={instagramHandle}
                                            onChange={(e) => setInstagramHandle(e.target.value)}
                                            className="flex-1 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                                            placeholder="yourhandle"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => syncFromSocial("instagram")}
                                            disabled={syncing !== null}
                                            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                                        >
                                            {syncing === "instagram" ? "..." : "Sync"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">TikTok Handle</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={tiktokHandle}
                                            onChange={(e) => setTiktokHandle(e.target.value)}
                                            className="flex-1 border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                                            placeholder="yourhandle"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => syncFromSocial("tiktok")}
                                            disabled={syncing !== null}
                                            className="px-4 py-2 text-xs font-bold bg-black text-white rounded-xl hover:opacity-80 disabled:opacity-50"
                                        >
                                            {syncing === "tiktok" ? "..." : "Sync"}
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-violet-50 rounded-xl p-4 text-sm text-violet-700 border border-violet-100">
                                    <strong>Verification tip:</strong> After going live, you can verify your accounts from your dashboard by sending a DM with your unique code. This adds a verified badge to your profile.
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Add your services</h1>
                            <p className="text-gray-500 text-sm mb-6">Tell fans what you offer and set your prices.</p>
                            <div className="space-y-3">
                                {services.map((service, i) => {
                                    const suggestion = ENGAGEMENT_TYPES.find((t) => t.value === service.type);
                                    return (
                                        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <div className="flex gap-3 items-start">
                                                <div className="flex-1">
                                                    <select
                                                        value={service.type}
                                                        onChange={(e) => {
                                                            const updated = [...services];
                                                            const newType = e.target.value;
                                                            const sugg = ENGAGEMENT_TYPES.find((t) => t.value === newType);
                                                            updated[i] = { type: newType, price: sugg ? String(sugg.suggested) : "10" };
                                                            setServices(updated);
                                                        }}
                                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white"
                                                    >
                                                        {ENGAGEMENT_TYPES.map((t) => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                    {suggestion && (
                                                        <p className="text-xs text-gray-400 mt-1">{suggestion.desc}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <span className="text-gray-500 text-sm font-medium">$</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={service.price}
                                                        onChange={(e) => {
                                                            const updated = [...services];
                                                            updated[i] = { ...updated[i], price: e.target.value };
                                                            setServices(updated);
                                                        }}
                                                        className="w-20 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                                                    />
                                                </div>
                                                {services.length > 1 && (
                                                    <button
                                                        onClick={() => removeServiceRow(i)}
                                                        className="text-gray-400 hover:text-rose-500 p-1 flex-shrink-0"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <button
                                    onClick={addServiceRow}
                                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-violet-300 hover:text-violet-600 transition-colors"
                                >
                                    + Add another service
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-4">
                            <div className="text-6xl mb-4">🎉</div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re live!</h1>
                            <p className="text-gray-500 mb-6">Your profile is now visible in the marketplace. Fans can start booking you right away.</p>
                            <div className="bg-violet-50 rounded-xl p-4 text-sm text-violet-700 border border-violet-100 text-left mb-4">
                                <strong>Next steps:</strong>
                                <ul className="mt-2 space-y-1 list-disc list-inside">
                                    <li>Verify your social accounts from your dashboard</li>
                                    <li>Add recent post URLs to show off your content</li>
                                    <li>Set up Stripe to receive payments</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleNext}
                        disabled={saving}
                        className="mt-6 w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60"
                    >
                        {saving ? "Saving..." : step === 3 ? "Go to Dashboard →" : step === STEPS.length - 2 ? "Finish Setup →" : "Continue →"}
                    </button>

                    {step < 3 && (
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Skip for now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
