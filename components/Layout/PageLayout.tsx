"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { canAccessRoute, getAccessDeniedReason, UserRole } from "@/lib/rbac";

export const PageLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [ready, setReady] = useState(false);
    const [accessDenied, setAccessDenied] = useState<string | null>(null);

    useEffect(() => {
        // Login page never needs shell or auth check
        if (pathname === "/login") {
            setReady(true);
            setAccessDenied(null);
            return;
        }

        const checkAccess = () => {
            const role = localStorage.getItem("batchnexus_role") as UserRole | null;
            if (!role) {
                router.replace("/login");
                return;
            }
            // Enforce role-based route access. Show Access Denied then redirect.
            if (!canAccessRoute(role, pathname)) {
                const reason = getAccessDeniedReason(role, pathname);
                setAccessDenied(reason);
                // Redirect to dashboard after a brief delay so user sees the message
                setTimeout(() => {
                    router.replace("/");
                }, 2000);
                return;
            }
            setAccessDenied(null);
            setReady(true);
        };

        checkAccess();
        // Re-check when the active role changes (topbar role switcher).
        window.addEventListener("roleChange", checkAccess);
        return () => window.removeEventListener("roleChange", checkAccess);
    }, [pathname]);

    // Login page — render children only, no shell
    if (pathname === "/login") {
        return <>{children}</>;
    }

    // Access Denied state — show message before redirect
    if (accessDenied) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center p-8 max-w-md">
                    <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">lock</span>
                    <h1 className="text-xl font-bold text-on-background mb-2">Access Denied</h1>
                    <p className="text-on-background/70 mb-4">{accessDenied}</p>
                    <p className="text-sm text-on-background/50">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    // Waiting for auth check
    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-on-background font-body antialiased">
            <Sidebar />
            <TopBar />
            <main className="flex-1 md:ml-64 p-4 md:p-8 md:w-[calc(100%-16rem)] overflow-x-hidden pb-24 md:pb-8">
                <div className="max-w-[1440px] mx-auto w-full">
                    {children}
                </div>
            </main>
            <MobileNav />
        </div>
    );
};
