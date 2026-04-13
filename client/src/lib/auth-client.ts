import { createAuthClient } from "better-auth/react";
import type { auth } from "../../../server/src/lib/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [
    inferAdditionalFields<typeof auth>(),
  ],
});

export const useSession = authClient.useSession;
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
