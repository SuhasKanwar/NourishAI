export const DATABASE_URL: string | undefined = process.env.DATABASE_URL;
export const GOOGLE_CLIENT_ID: string = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET: string = process.env.GOOGLE_CLIENT_SECRET!;
export const NEXTAUTH_SECRET: string = process.env.NEXTAUTH_SECRET || "secret";
export const MICROSERVICE_BASE_URL: string = process.env.MICROSERVICE_BASE_URL || "http://localhost:8000";