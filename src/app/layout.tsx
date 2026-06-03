import type {Metadata} from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
    title: "Elict",
    description: "A Socratic AI Tutor for my sister. Escaping the ‘answer-feeding’ trap with Nextjs & LangGraph & DeepSeek.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
        <body className="antialiased">
        {/* Providers 包裹：TooltipProvider 等全局客户端 Provider */}
        <Providers>
          {children}
        </Providers>
        {/* 全局 Toast 挂载点，统一错误/通知提示 */}
        <Toaster />
        </body>
        </html>
    );
}
