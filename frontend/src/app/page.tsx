import Link from "next/link";

export default function HomePage() {
    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                        Connect With Your Favorite Influencers
                    </h1>
                    <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                        InfluenceMe is the marketplace where fans get real engagement — story tags, shoutouts, follows, and more — directly from the influencers they love.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/browse"
                            className="px-8 py-4 bg-white text-blue-700 font-bold rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
                        >
                            Browse Influencers
                        </Link>
                        <Link
                            href="/register"
                            className="px-8 py-4 bg-blue-500 text-white font-bold rounded-xl text-lg hover:bg-blue-400 transition-colors border-2 border-blue-400"
                        >
                            Join as Influencer
                        </Link>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-14 text-gray-900">How It Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {[
                            {
                                step: "1",
                                title: "Browse Influencers",
                                desc: "Explore our marketplace of verified influencers across Instagram and TikTok. Filter by engagement type and price.",
                                icon: "🔍",
                            },
                            {
                                step: "2",
                                title: "Generate & Request",
                                desc: "Use our AI studio to preview exactly how your engagement will look. Submit your request and pay securely.",
                                icon: "✨",
                            },
                            {
                                step: "3",
                                title: "Get Your Engagement",
                                desc: "The influencer fulfills your request. Verify and release payment — only when you're satisfied.",
                                icon: "🎉",
                            },
                        ].map((item) => (
                            <div key={item.step} className="text-center">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                                <p className="text-gray-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-14 text-gray-900">Why InfluenceMe?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Secure Escrow Payments",
                                desc: "Your money is held safely until you confirm the influencer fulfilled their promise. No risk, no chargebacks.",
                                icon: "🔒",
                            },
                            {
                                title: "AI-Powered Previews",
                                desc: "See exactly what your shoutout or story tag will look like before you pay — powered by Stability AI.",
                                icon: "🤖",
                            },
                            {
                                title: "Verified Influencers",
                                desc: "Every influencer on our platform connects their real Instagram or TikTok handles. No fakes.",
                                icon: "✅",
                            },
                            {
                                title: "Counter-Offers & Negotiation",
                                desc: "Influencers can propose alternative pricing or terms. You stay in control of every transaction.",
                                icon: "🤝",
                            },
                        ].map((f) => (
                            <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm flex gap-4">
                                <div className="text-3xl flex-shrink-0">{f.icon}</div>
                                <div>
                                    <h3 className="text-lg font-bold mb-1 text-gray-900">{f.title}</h3>
                                    <p className="text-gray-500 text-sm">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-4 text-gray-900">Simple Pricing</h2>
                    <p className="text-center text-gray-500 mb-14">Fans always browse and buy for free. Influencers pay only when they want pro features.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Fan */}
                        <div className="border border-gray-200 rounded-2xl p-8 text-center">
                            <h3 className="text-xl font-bold mb-2">Fan</h3>
                            <div className="text-4xl font-extrabold text-blue-600 mb-1">Free</div>
                            <p className="text-gray-400 text-sm mb-6">Forever</p>
                            <ul className="text-sm text-gray-600 space-y-2 mb-8 text-left">
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Browse all influencers</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> AI preview generation</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Secure escrow payments</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Request tracking dashboard</li>
                            </ul>
                            <Link href="/register" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                                Get Started
                            </Link>
                        </div>

                        {/* Influencer Basic */}
                        <div className="border border-gray-200 rounded-2xl p-8 text-center">
                            <h3 className="text-xl font-bold mb-2">Influencer Basic</h3>
                            <div className="text-4xl font-extrabold text-blue-600 mb-1">Free</div>
                            <p className="text-gray-400 text-sm mb-6">20% platform fee</p>
                            <ul className="text-sm text-gray-600 space-y-2 mb-8 text-left">
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> List up to 3 services</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Accept / reject requests</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Counter-offer capability</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Earnings dashboard</li>
                            </ul>
                            <Link href="/register" className="block w-full py-3 border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors">
                                Join as Influencer
                            </Link>
                        </div>

                        {/* Influencer Pro */}
                        <div className="border-2 border-blue-600 rounded-2xl p-8 text-center relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                MOST POPULAR
                            </div>
                            <h3 className="text-xl font-bold mb-2">Influencer Pro</h3>
                            <div className="text-4xl font-extrabold text-blue-600 mb-1">$29</div>
                            <p className="text-gray-400 text-sm mb-6">per month · 10% platform fee</p>
                            <ul className="text-sm text-gray-600 space-y-2 mb-8 text-left">
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Unlimited services</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Reduced 10% platform fee</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Priority listing in browse</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Advanced analytics</li>
                                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Stripe Connect payouts</li>
                            </ul>
                            <Link href="/register" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-4 bg-gradient-to-br from-indigo-600 to-blue-700 text-white text-center">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-4xl font-extrabold mb-4">Ready to get started?</h2>
                    <p className="text-blue-100 text-lg mb-10">
                        Join thousands of fans and influencers already using InfluenceMe to create authentic connections.
                    </p>
                    <Link
                        href="/browse"
                        className="inline-block px-10 py-4 bg-white text-blue-700 font-bold rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
                    >
                        Browse Influencers Now →
                    </Link>
                </div>
            </section>
        </div>
    );
}
