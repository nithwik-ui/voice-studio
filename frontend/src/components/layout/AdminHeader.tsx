"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Notifications } from "./Notifications";
import { useAuth } from "@/hooks/useAuth";

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Admin";

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high z-40 flex items-center justify-between px-space-lg">
      <div className="flex items-center gap-space-lg">
        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <span className="font-label-md text-label-md text-outline">Workspaces</span>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="font-label-md text-label-md text-on-surface font-semibold">Studio Workspace</span>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/admin"
            className={`px-3 py-1.5 text-body-md rounded-lg transition-colors ${
              pathname === "/admin"
                ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            Overview
          </Link>
          <Link
            href="/admin/users"
            className={`px-3 py-1.5 text-body-md rounded-lg transition-colors ${
              pathname.startsWith("/admin/users")
                ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            Users
          </Link>
          <Link
            href="/admin/projects"
            className={`px-3 py-1.5 text-body-md rounded-lg transition-colors ${
              pathname.startsWith("/admin/projects")
                ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            Videos & Projects
          </Link>
          <Link
            href="/admin/settings"
            className={`px-3 py-1.5 text-body-md rounded-lg transition-colors ${
              pathname.startsWith("/admin/settings")
                ? "bg-primary-container text-on-primary font-semibold shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            Settings
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-space-md">
        <Notifications />
        <div className="flex items-center gap-2.5 pl-space-xs border-l border-surface-container-high">
          <div className="relative flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-xs uppercase ring-1 ring-outline-variant/40">
              {displayName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="font-label-md text-label-md text-on-surface font-semibold leading-none truncate max-w-[140px]">
              {displayName}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight mt-0.5">
              {role || "Studio Lead"}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
