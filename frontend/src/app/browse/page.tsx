"use client";

import { useEffect, useState } from "react";
import InfluencerCard from "@/components/InfluencerCard";

export default function BrowsePage() {
    const [influencers, setInfluencers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch real data from our FastAPI backend
        fetch("http://localhost:8000/marketplace/influencers")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch influencers");
                return res.json();
            })
            .then((data) => {
                setInfluencers(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching data:", err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-center py-20 text-xl font-semibold">Loading influencers...</div>;
    if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Browse Influencers</h1>
            {influencers.length === 0 ? (
                <p className="text-gray-500">No influencers found. Check the database seed.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {influencers.map(influencer => (
                        <div key={influencer.id} onClick={() => window.location.href = `/influencers/${influencer.id}`} className="cursor-pointer">
                           <InfluencerCard influencer={influencer} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
