"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import GenAIStudio from "@/components/GenAIStudio";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Service {
    id: number;
    engagement_type: string;
    price: number;
    description: string | null;
    duration_days: number | null;
}

interface Influencer {
    id: number;
    display_name: string;
    bio: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    profile_picture_url: string | null;
    services: Service[];
}

export default function InfluencerProfilePage({ params }: { params: { id: string } }) {
    const { data: session } = useSession();
    const router = useRouter();

    const [influencer, setInfluencer] = useState<Influencer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers/${params.id}`)
            .then((res) => {
                if (!res.ok) throw new Error("Influencer not found.");
                return res.json();
            })
            .then((data) => {
                setInfluencer(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [params.id]);

    const handleServiceSelect = (service: Service) => {
        // Auth check — redirect to login if not authenticated
        if (!session) {
            router.push(`/login?redirect=/influencers/${params.id}`);
            return;
        }
        setSelectedService(service);
    };

    const handleSubmitRequest = async (previewUrl: string) => {
        if (!session || !selectedService) return;

        try {
            const token = (session as any).accessToken;
            const response = await fetch(`${API_URL}/marketplace/requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    service_id: selectedService.id,
                    generated_image_preview_url: previewUrl,
                    payment_intent_id: "pi_placeholder",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error submitting request: ${errorData.detail || "Unknown error"}`);
                return;
            }

            const data = await response.json();
            alert(`Request submitted! ID: ${data.id} — Status: ${data.status}`);
            setSelectedService(null);
        } catch {
            alert("An error occurred while submitting your request.");
        }
    };

    if (loading) return <div className="max-w-4xl mx-auto py-8 text-center text-gray-500">Loading...</div>;
    if (error || !influencer) return <div className="max-w-4xl mx-auto py-8 text-center text-red-500">{error || "Not found"}</div>;

    return (
        <div className="max-w-4xl mx-auto py-8">
            {/* Profile Header */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8 flex items-center md:items-start flex-col md:flex-row gap-6">
                <img
                    src={influencer.profile_picture_url || `https://i.pravatar.cc/150?u=${influencer.id}`}
                    alt={influencer.display_name}
                    className="w-32 h-32 rounded-full shadow-md border-4 border-white"
                />
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold mb-2">{influencer.display_name}</h1>
                    {influencer.instagram_handle && (
                        <p className="text-blue-600 font-medium mb-2">{influencer.instagram_handle}</p>
                    )}
                    {influencer.tiktok_handle && (
                        <p className="text-pink-600 font-medium mb-2">{influencer.tiktok_handle}</p>
                    )}
                    {influencer.bio && (
                        <p className="text-gray-700 leading-relaxed">{influencer.bio}</p>
                    )}
                </div>
            </div>

            {/* Services Menu */}
            <h2 className="text-2xl font-bold mb-4">Available Engagements</h2>
            {influencer.services.length === 0 ? (
                <p className="text-gray-500">No services available yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {influencer.services.map((service) => (
                        <div
                            key={service.id}
                            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                            onClick={() => handleServiceSelect(service)}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold capitalize">
                                        {service.engagement_type.replace(/_/g, " ")}
                                    </h3>
                                    <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full">
                                        ${service.price.toFixed(2)}
                                    </span>
                                </div>
                                {service.description && (
                                    <p className="text-gray-600 text-sm">{service.description}</p>
                                )}
                                {service.duration_days && (
                                    <p className="text-gray-400 text-xs mt-1">{service.duration_days} days</p>
                                )}
                            </div>
                            <button className="mt-6 w-full py-2 bg-gray-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-50">
                                {session ? "Select & Customize" : "Sign in to Purchase"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* GenAI Studio Modal */}
            {selectedService && influencer && (
                <GenAIStudio
                    influencerId={influencer.id}
                    influencerName={influencer.display_name}
                    serviceId={selectedService.id}
                    serviceName={selectedService.engagement_type.replace(/_/g, " ")}
                    price={selectedService.price}
                    onClose={() => setSelectedService(null)}
                    onSubmitRequest={handleSubmitRequest}
                />
            )}
        </div>
    );
}
