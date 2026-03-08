"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface GenAIStudioProps {
    influencerId: number;
    influencerName: string;
    serviceId: number;
    serviceName: string;
    price: number;
    onClose: () => void;
    onSubmitRequest: (previewUrl: string) => void;
}

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
    const isMock = clientSecret.startsWith("pi_mock_");

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        setPaying(true);
        setError(null);

        // Mock mode: simulate success without calling Stripe
        if (isMock) {
            setTimeout(() => { setPaying(false); onSuccess(); }, 800);
            return;
        }

        if (!stripe || !elements) { setPaying(false); return; }

        // Validate the Payment Element before confirming
        const { error: submitError } = await elements.submit();
        if (submitError) {
            setError(submitError.message ?? "Please complete your payment details.");
            setPaying(false);
            return;
        }

        const { error: stripeError } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: `${window.location.origin}/fan/requests` },
            redirect: "if_required",
        });
        if (stripeError) { setError(stripeError.message ?? "Payment failed."); setPaying(false); }
        else onSuccess();
    };

    return (
        <form onSubmit={handlePay} className="space-y-4">
            {isMock ? (
                <div className="bg-lk-amber/10 border border-lk-amber/30 rounded-xl p-4 text-lk-amber text-sm">
                    <strong>Dev mode:</strong> No Stripe key configured — payment is simulated.
                </div>
            ) : (
                <PaymentElement />
            )}
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 py-3 border border-lk-border text-lk-muted-bright rounded-full font-bold text-sm hover:border-lk-border-bright hover:text-lk-white transition-all"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={paying}
                    className="flex-1 py-3 bg-lk-amber text-lk-black rounded-full font-bold text-sm hover:brightness-110 disabled:opacity-50 transition-all"
                    style={{ fontFamily: "var(--font-syne)" }}
                >
                    {paying ? "Processing…" : "Pay & Submit →"}
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

    const [prompt, setPrompt]           = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [requestId, setRequestId]     = useState<number | null>(null);
    const [error, setError]             = useState<string | null>(null);
    const [step, setStep]               = useState<"prompt" | "preview" | "payment" | "done">("prompt");

    const token = (session as any)?.accessToken;

    const handleGenerate = async () => {
        if (!prompt) return;
        if (!session) { router.push("/login?redirect=back"); return; }
        setIsGenerating(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/genai/generate-preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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
            const res = await fetch(`${API_URL}/marketplace/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ service_id: serviceId, generated_image_preview_url: previewUrl }),
            });
            if (!res.ok) throw new Error("Failed to create request.");
            const req = await res.json();
            setRequestId(req.id);
            const payRes = await fetch(`${API_URL}/payments/create-payment-intent`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

    const STEPS_LABELS = ["Generate", "Preview", "Payment"];
    const stepIdx = step === "done" ? 3 : ["prompt", "preview", "payment"].indexOf(step);

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
                className="bg-lk-surface border border-lk-border rounded-2xl shadow-2xl max-w-2xl w-full overflow-y-auto"
                style={{ maxHeight: "90vh", boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)" }}
            >
                {/* Header */}
                <div className="flex justify-between items-start p-6 pb-0">
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-1">AI Remix Studio</p>
                        <h2
                            className="font-black text-lk-white text-xl tracking-[-0.02em]"
                            style={{ fontFamily: "var(--font-syne)" }}
                        >
                            Request from {influencerName}
                        </h2>
                        <p className="text-lk-muted text-sm mt-1">
                            <span className="text-lk-muted-bright">{serviceName}</span>
                            <span className="mx-2 text-lk-border-bright">·</span>
                            <span className="text-lk-amber font-bold">${price.toFixed(2)}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-lk-muted hover:text-lk-white transition-colors p-1 mt-1 flex-shrink-0"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* Step pills */}
                <div className="flex items-center gap-2 px-6 pt-5 pb-5">
                    {STEPS_LABELS.map((label, i) => {
                        const done   = i < stepIdx || step === "done";
                        const active = i === stepIdx;
                        return (
                            <span
                                key={label}
                                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all ${
                                    done   ? "bg-lk-cyan/15 text-lk-cyan border border-lk-cyan/30" :
                                    active ? "bg-lk-amber text-lk-black border border-lk-amber" :
                                             "bg-lk-black text-lk-muted border border-lk-border"
                                }`}
                                style={active || done ? { fontFamily: "var(--font-syne)" } : {}}
                            >
                                {done ? "✓ " : ""}{label}
                            </span>
                        );
                    })}
                    {/* divider lines */}
                    <div className="flex-1 h-px bg-lk-border" />
                </div>

                <div className="px-6 pb-6">
                    {/* Divider */}
                    <div className="h-px bg-lk-border mb-5" />

                    {error && (
                        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm">{error}</div>
                    )}

                    {/* ── Prompt step ── */}
                    {step === "prompt" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-[0.12em] mb-2">
                                    Describe the scene
                                </label>
                                <textarea
                                    className="w-full bg-lk-black border border-lk-border text-lk-white placeholder:text-lk-muted rounded-xl px-4 py-3 text-sm focus:border-lk-amber outline-none transition-colors resize-none"
                                    rows={4}
                                    placeholder={`e.g. "Me and ${influencerName} at a rooftop party in NYC, photorealistic, evening glow…"`}
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="w-full py-3.5 bg-lk-amber text-lk-black font-bold rounded-full text-sm tracking-wide hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-lk-amber/20"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {isGenerating ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                                        Generating…
                                    </span>
                                ) : "Generate Preview →"}
                            </button>
                        </div>
                    )}

                    {/* ── Preview step ── */}
                    {step === "preview" && previewUrl && (
                        <div className="space-y-5">
                            <div className="relative rounded-xl overflow-hidden border border-lk-border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={previewUrl} alt="Generated Preview" className="w-full h-auto" />
                                <div className="absolute top-3 right-3 bg-lk-black/80 backdrop-blur-sm text-lk-amber text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest border border-lk-amber/30">
                                    PREVIEW
                                </div>
                            </div>
                            <div className="bg-lk-black border border-lk-border rounded-xl p-4 text-sm text-lk-muted-bright">
                                <span className="text-lk-cyan font-semibold">Note:</span> This is a watermarked preview. The creator will fulfill your request before funds are released from escrow.
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setPreviewUrl(null); setStep("prompt"); }}
                                    className="flex-1 py-3 border border-lk-border text-lk-muted-bright rounded-full font-bold text-sm hover:border-lk-border-bright hover:text-lk-white transition-all"
                                >
                                    Regenerate
                                </button>
                                <button
                                    onClick={handleProceedToPayment}
                                    className="flex-1 py-3 bg-lk-amber text-lk-black rounded-full font-bold text-sm hover:brightness-110 transition-all shadow-lg hover:shadow-lk-amber/20"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    Proceed to Payment →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Payment step ── */}
                    {step === "payment" && clientSecret && (
                        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
                            <CheckoutForm
                                clientSecret={clientSecret}
                                requestId={requestId!}
                                onSuccess={() => setStep("done")}
                                onBack={() => setStep("preview")}
                            />
                        </Elements>
                    )}

                    {/* ── Done ── */}
                    {step === "done" && (
                        <div className="text-center py-8">
                            <div
                                className="text-5xl font-black text-lk-amber mb-4 leading-none"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >✦</div>
                            <h3 className="font-black text-lk-white text-xl tracking-[-0.02em] mb-2" style={{ fontFamily: "var(--font-syne)" }}>
                                Request submitted.
                            </h3>
                            <p className="text-lk-muted text-sm mb-6 leading-relaxed max-w-sm mx-auto">
                                Your payment is held in escrow. The creator will review and fulfill your request — you&apos;ll be notified when it&apos;s done.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-lk-amber text-lk-black rounded-full font-bold text-sm hover:brightness-110 transition-all"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
