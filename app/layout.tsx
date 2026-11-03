import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";
export const metadata: Metadata = {
  title: "LendLoop — A little closer. A lot more possible.",
  description:
    "Borrow what you need. Lend what you don’t. Your neighborhood tool library.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
