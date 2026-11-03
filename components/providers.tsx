"use client";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
export const connected =
  !!client && !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
export default function Providers({ children }: { children: React.ReactNode }) {
  if (!connected) return <>{children}</>;
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={client!} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
