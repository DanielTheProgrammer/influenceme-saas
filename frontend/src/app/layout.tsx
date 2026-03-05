import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthContext from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "InfluenceMe",
    description: "The premier marketplace for fan-influencer engagement.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthContext>
                    <Navbar />
                    <main className="min-h-screen bg-gray-50 text-gray-800">
                        {children}
                    </main>
                    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
                </AuthContext>
            </body>
        </html>
    );
}
