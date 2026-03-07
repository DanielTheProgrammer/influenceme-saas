"use client";

import React from "react";
import Link from "next/link";

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    reset = () => this.setState({ hasError: false, error: null });

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-[60vh] flex items-center justify-center px-4 bg-lk-black">
                    <div className="text-center max-w-md">
                        <div className="text-5xl mb-5">😵</div>
                        <h2
                            className="text-2xl font-bold text-lk-white mb-2"
                            style={{ fontFamily: "var(--font-syne)" }}
                        >
                            Something went wrong
                        </h2>
                        <p className="text-lk-muted text-sm mb-7">
                            {this.state.error?.message || "An unexpected error occurred."}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.reset}
                                className="px-5 py-2.5 bg-lk-amber text-lk-black font-bold rounded-full hover:brightness-110 transition-all text-sm"
                            >
                                Try again
                            </button>
                            <Link
                                href="/"
                                className="px-5 py-2.5 border border-lk-border text-lk-muted-bright font-medium rounded-full hover:border-lk-border-bright hover:text-lk-white transition-all text-sm"
                            >
                                Go home
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
