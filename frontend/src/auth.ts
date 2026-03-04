import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const formData = new URLSearchParams();
                formData.append("username", credentials.email as string);
                formData.append("password", credentials.password as string);

                try {
                    const res = await fetch(`${API_URL}/token`, {
                        method: "POST",
                        body: formData,
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    });

                    if (!res.ok) return null;

                    const data = await res.json();

                    // Fetch user info
                    const userRes = await fetch(`${API_URL}/users/me/`, {
                        headers: { Authorization: `Bearer ${data.access_token}` },
                    });

                    if (!userRes.ok) return null;

                    const user = await userRes.json();

                    return {
                        id: String(user.id),
                        email: user.email,
                        role: user.role,
                        accessToken: data.access_token,
                    };
                } catch {
                    return null;
                }
            },
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        jwt({ token, user }) {
            if (user) {
                token.accessToken = (user as any).accessToken;
                token.role = (user as any).role;
            }
            return token;
        },
        session({ session, token }) {
            (session as any).accessToken = token.accessToken;
            (session as any).role = token.role;
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
});
