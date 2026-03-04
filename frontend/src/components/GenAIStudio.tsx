"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface GenAIStudioProps {
    influencerId: number;
    influencerName: string;
    serviceId: number;
    serviceName: string;
    price: number;
    onClose: () => void;
    onSubmitRequest: (previewUrl: string) => void;
}

// Inner checkout form — only rendered inside <Elements>
function CheckoutForm({
    clientSecret,
    requestId,
    onSuccess,
    onBack,
}: {
    clientSecret: string;
    requestId: number;
    onSuccess: () => void;
    onBack: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setPaying(true);
        setError(null);
        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/fan/requests`,
            },
            redirect: "if_required",
        });
        if (stripeError) {
            setError(stripeError.message ?? "Payment failed.");
            setPaying(false);
        } else {
            onSuccess();
        }
    };

    // Dev mode: clientSecret starts with "pi_mock_" — skip Stripe UI
    const isMock = clientSecret.startsWith("pi_mock_");

    return (
        <form onSubmit={handlePay} className="space-y-4">
            {isMock ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
                    <strong>Dev mode:</strong> No Stripe key configured. Payment is simulated.
                </div>
            ) : (
                <PaymentElement />
            )}
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={paying}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-green-300 transition-colors"
                >
                    {paying ? "Processing..." : "Pay & Submit"}
                </button>
            </div>
        </form>
    );
}

export default function GenAIStudio({
    influencerId,
    influencerName,
    serviceId,
    serviceName,
    price,
    onClose,
    onSubmitRequest,
}: GenAIStudioProps) {
    const { data: session } = useSession();
    const router = useRouter();

    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [requestId, setRequestId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<"prompt" | "preview" | "payment" | "done">("prompt");

    const token = (session as any)?.accessToken;

    const handleGenerate = async () => {
        if (!prompt) return;
        if (!session) {
            router.push("/login?redirect=back");
            return;
        }
        setIsGenerating(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/genai/generate-preview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ prompt, influencer_id: influencerId }),
            });
            if (!res.ok) throw new Error("Failed to generate image.");
            const data = await res.json();
            setPreviewUrl(data.watermarked_url);
            setStep("preview");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleProceedToPayment = async () => {
        if (!previewUrl) return;
        setError(null);
        try {
            // Create the engagement request + payment intent
            const res = await fetch(`${API_URL}/marketplace/requests`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    service_id: serviceId,
                    generated_image_preview_url: previewUrl,
                }),
            });
            if (!res.ok) throw new Error("Failed to create request.");
            const req = await res.json();
            setRequestId(req.id);

            // Get payment intent
            const payRes = await fetch(`${API_URL}/payments/create-payment-intent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ request_id: req.id }),
            });
            if (!payRes.ok) throw new Error("Failed to create payment intent.");
            const payData = await payRes.json();
            setClientSecret(payData.client_secret);
            setStep("payment");
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handlePaymentSuccess = () => {
        setStep("done");
        onSubmitRequest(previewUrl!);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">GenAI Remix Studio</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                </div>

                <p className="text-gray-600 mb-6">
                    Requesting <strong>{serviceName}</strong> from <strong>{influencerName}</strong>{" "}
                    <span className="text-green-600 font-bold">(${price.toFixed(2)})</span>
                </p>

                {/* Step indicators */}
                <div className="flex items-center gap-2 mb-6 text-sm">
                    {["Generate", "Preview", "Payment"].map((label, i) => {
                        const stepIdx = ["prompt", "preview", "payment"].indexOf(step);
                        const active = i === stepIdx;
                        const done = i < stepIdx || step === "done";
                        return (
                            <span key={label} className={`px-3 py-1 rounded-full font-medium ${done ? "bg-green-100 text-green-700" : active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                                {done ? "✓ " : ""}{label}
                            </span>
                        );
                    })}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
                )}

                {step === "prompt" && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Describe the scene you want to generate
                            </label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={4}
                                placeholder={`e.g., "Me and ${influencerName} sitting at a cafe in Paris, photorealistic..."`}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
                                isGenerating || !prompt ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {isGenerating ? "Generating..." : "Generate Preview"}
                        </button>
                    </div>
                )}

                {step === "preview" && previewUrl && (
                    <div className="space-y-6">
                        <div className="relative rounded-lg overflow-hidden border-4 border-dashed border-gray-200">
                            <img src={previewUrl} alt="Generated Preview" className="w-full h-auto" />
                            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs font-bold px-2 py-1 rounded">
                                PREVIEW
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                            <strong>Note:</strong> This is a preview. The influencer will review and fulfill your request before payment is released.
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => { setPreviewUrl(null); setStep("prompt"); }}
                                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                            >
                                Regenerate
                            </button>
                            <button
                                onClick={handleProceedToPayment}
                                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
                            >
                                Proceed to Payment →
                            </button>
                        </div>
                    </div>
                )}

                {step === "payment" && clientSecret && (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <CheckoutForm
                            clientSecret={clientSecret}
                            requestId={requestId!}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setStep("preview")}
                        />
                    </Elements>
                )}

                {step === "done" && (
                    <div className="text-center py-8">
                        <div className="text-5xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
                        <p className="text-gray-500 mb-6">Your payment is held in escrow. The influencer will review and fulfill your request.</p>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
