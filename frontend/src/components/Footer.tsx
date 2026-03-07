import Link from "next/link";

export default function Footer() {
    return (
        <footer className="border-t border-lk-border bg-lk-black">
            <div className="max-w-7xl mx-auto px-5 py-14">
                <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-12">
                    {/* Brand */}
                    <div className="max-w-xs">
                        <span
                            className="text-2xl font-black text-lk-amber tracking-[-0.04em] block mb-4"
                            style={{ fontFamily: "var(--font-syne)" }}
                        >
                            LEAKY
                        </span>
                        <p className="text-lk-muted text-sm leading-relaxed">
                            The marketplace where social proof meets strategy.
                            Buy the story. Own the narrative.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap gap-x-16 gap-y-8">
                        <div>
                            <p className="text-[10px] font-bold text-lk-muted uppercase tracking-[0.18em] mb-4">Platform</p>
                            <div className="space-y-3">
                                <Link href="/browse" className="block text-sm text-lk-muted-bright hover:text-lk-white transition-colors">Browse Creators</Link>
                                <Link href="/register" className="block text-sm text-lk-muted-bright hover:text-lk-white transition-colors">Sign Up</Link>
                                <Link href="/login" className="block text-sm text-lk-muted-bright hover:text-lk-white transition-colors">Log In</Link>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-lk-muted uppercase tracking-[0.18em] mb-4">Legal</p>
                            <div className="space-y-3">
                                <Link href="/privacy" className="block text-sm text-lk-muted-bright hover:text-lk-white transition-colors">Privacy Policy</Link>
                                <Link href="/terms" className="block text-sm text-lk-muted-bright hover:text-lk-white transition-colors">Terms of Service</Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-lk-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-lk-muted text-xs">
                        &copy; {new Date().getFullYear()} Leaky. All rights reserved.
                    </p>
                    <p className="text-lk-muted text-xs italic tracking-wide">
                        &ldquo;Your moment is waiting.&rdquo;
                    </p>
                </div>
            </div>
        </footer>
    );
}
