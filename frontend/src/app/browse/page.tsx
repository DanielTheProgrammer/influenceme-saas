"use client";

import { useEffect, useState, useMemo } from "react";
import InfluencerCard from "@/components/InfluencerCard";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_TYPES = [
    { value: "", label: "All Types" },
    { value: "story_tag", label: "Story Tag" },
    { value: "story_highlight", label: "Highlight" },
    { value: "permanent_follow", label: "Permanent Follow" },
    { value: "timed_follow", label: "Timed Follow" },
    { value: "post_tag", label: "Post Tag" },
    { value: "comment", label: "Comment" },
];

const CATEGORY_PILLS = [
    { label: "All", value: "" },
    { label: "Story Tag", value: "story_tag" },
    { label: "Post Tag", value: "post_tag" },
    { label: "Follow", value: "permanent_follow" },
    { label: "Comment", value: "comment" },
    { label: "Highlight", value: "story_highlight" },
    { label: "Timed", value: "timed_follow" },
];

export default function BrowsePage() {
    const [influencers, setInfluencers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch creators");
                return res.json();
            })
            .then((data) => {
                setInfluencers(data);
                setLoading(false);
            })
            .catch((err) => {
                toast.error(err.message);
                setLoading(false);
            });
    }, []);

    const filtered = useMemo(() => {
        return influencers.filter((inf) => {
            const matchesSearch =
                !search ||
                inf.display_name.toLowerCase().includes(search.toLowerCase()) ||
                inf.instagram_handle?.toLowerCase().includes(search.toLowerCase()) ||
                inf.tiktok_handle?.toLowerCase().includes(search.toLowerCase()) ||
                inf.bio?.toLowerCase().includes(search.toLowerCase());

            const matchesType =
                !filterType ||
                inf.services.some((s: any) => s.engagement_type === filterType);

            const matchesPrice =
                !maxPrice ||
                inf.services.some((s: any) => s.price <= parseFloat(maxPrice));

            return matchesSearch && matchesType && matchesPrice;
        });
    }, [influencers, search, filterType, maxPrice]);

    const hasFilters = !!(search || filterType || maxPrice);

    return (
        <div className="min-h-screen bg-lk-black pt-16">
            {/* Page header */}
            <div className="border-b border-lk-border bg-lk-surface/50 px-5 py-12 md:py-16">
                <div className="max-w-6xl mx-auto">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-4">The Roster</p>
                    <h1
                        className="font-black text-lk-white leading-tight tracking-[-0.03em] mb-2"
                        style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                    >
                        Browse Creators
                    </h1>
                    <p className="text-lk-muted-bright text-base">
                        {loading
                            ? "Loading the roster..."
                            : `${filtered.length} creator${filtered.length !== 1 ? "s" : ""} available`}
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-5 py-8">
                {/* Category pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {CATEGORY_PILLS.map((pill) => (
                        <button
                            key={pill.value}
                            onClick={() => setFilterType(pill.value)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                                filterType === pill.value
                                    ? "bg-lk-amber text-lk-black"
                                    : "bg-lk-surface text-lk-muted-bright border border-lk-border hover:border-lk-border-bright hover:text-lk-white"
                            }`}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>

                {/* Filters bar */}
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lk-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, handle, or bio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-lk-black border border-lk-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-lk-white placeholder-lk-muted focus:border-lk-amber/50 focus:outline-none transition-colors"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-lk-black border border-lk-border rounded-xl px-4 py-2.5 text-sm text-lk-white focus:border-lk-amber/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                        {ENGAGEMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value} className="bg-lk-surface">{t.label}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lk-muted text-sm font-medium">$</span>
                        <input
                            type="number"
                            placeholder="Max price"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            min="0"
                            className="bg-lk-black border border-lk-border rounded-xl pl-7 pr-4 py-2.5 text-sm text-lk-white placeholder-lk-muted focus:border-lk-amber/50 focus:outline-none transition-colors w-full md:w-36"
                        />
                    </div>
                    {hasFilters && (
                        <button
                            onClick={() => { setSearch(""); setFilterType(""); setMaxPrice(""); }}
                            className="px-4 py-2.5 text-xs font-semibold text-lk-muted-bright hover:text-lk-white border border-lk-border hover:border-lk-border-bright rounded-xl transition-all whitespace-nowrap"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-lk-surface rounded-2xl border border-lk-border overflow-hidden animate-pulse">
                                <div className="h-[2px] bg-lk-border-bright" />
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-14 h-14 rounded-full bg-lk-border flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-lk-border rounded w-3/4" />
                                            <div className="h-3 bg-lk-border rounded w-1/2" />
                                            <div className="h-3 bg-lk-border rounded w-1/3" />
                                        </div>
                                    </div>
                                    <div className="h-3 bg-lk-border rounded mb-2" />
                                    <div className="h-3 bg-lk-border rounded w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-lk-surface rounded-2xl border border-lk-border">
                        <div className="w-14 h-14 bg-lk-black rounded-full flex items-center justify-center mx-auto mb-4 border border-lk-border">
                            <svg className="w-7 h-7 text-lk-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p className="text-lk-white text-lg font-bold mb-2" style={{ fontFamily: "var(--font-syne)" }}>No creators match</p>
                        <p className="text-lk-muted text-sm mb-5">Try adjusting your filters</p>
                        {hasFilters && (
                            <button
                                onClick={() => { setSearch(""); setFilterType(""); setMaxPrice(""); }}
                                className="text-lk-amber hover:text-lk-amber/80 text-sm font-semibold transition-colors"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filtered.map((influencer) => (
                            <InfluencerCard key={influencer.id} influencer={influencer} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
