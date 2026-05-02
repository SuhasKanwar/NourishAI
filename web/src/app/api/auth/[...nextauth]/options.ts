import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET } from "@/lib/config";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            profile(profile) {
                if (!profile || !profile.sub) {
                    throw new Error("Google profile 'sub' (id) missing");
                }
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                };
            },
            allowDangerousEmailAccountLinking: true
        })
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user?.email) return false;
            await prisma.user.upsert({
                where: { email: user.email },
                update: {
                    id: user.id,
                    name: user.name ?? null,
                    image: user.image ?? null,
                },
                create: {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? null,
                    image: user.image ?? null,
                }
            });
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id?.toString();
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: user.id as string },
                        select: { createdAt: true },
                    });
                    if (dbUser?.createdAt) {
                        (token as any).createdAt = dbUser.createdAt.toISOString();
                    }
                } catch {

                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                (session.user as any).id = token.id;
                if ((token as any).createdAt) {
                    (session.user as any).createdAt = (token as any).createdAt;
                }
            }
            return session;
        }
    },
    session: {
        strategy: 'jwt'
    },
    secret: NEXTAUTH_SECRET
};