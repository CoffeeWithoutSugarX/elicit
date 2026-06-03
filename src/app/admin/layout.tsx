export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background p-8">
            <h1 className="text-2xl font-semibold text-foreground mb-6">家长后台</h1>
            {children}
        </div>
    );
}
