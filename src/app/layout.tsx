import type {Metadata} from "next";
import "./globals.css";

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
        {children}
        </body>
        </html>
    );
}
