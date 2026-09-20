"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, getInitials } from "@/hooks/useAuth";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Admin Nithwik";
  const initials = getInitials(displayName);

  const navItems = [
    { name: "Overview", path: "/admin", icon: "grid_view" },
    { name: "Users", path: "/admin/users", icon: "group" },
    { name: "Videos & Projects", path: "/admin/projects", icon: "video_library" },
    { name: "Submissions Queue", path: "/admin/submissions", icon: "rate_review" },
    { name: "Drive & Storage", path: "/admin/storage", icon: "cloud_sync" },
    { name: "System Settings", path: "/admin/settings", icon: "settings" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-surface-container-high z-50 flex flex-col pt-space-md pb-space-lg">
      <div className="px-space-lg mb-space-lg flex items-center gap-space-sm">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm shadow-primary/20">
          <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-title-md text-title-md text-on-surface font-bold leading-tight tracking-tight">
              VoiceFlow
            </span>
            <span className="text-xs font-semibold text-outline">Studio</span>
          </div>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-semibold">
            Administrator
          </span>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 px-space-md flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== "/admin");
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center gap-space-sm px-space-sm py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin User Footer with Logout */}
      <div className="px-space-md mt-auto pt-space-md">
        <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between border border-outline-variant/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shrink-0 tracking-wider">
              {initials}
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-on-surface truncate leading-tight">{displayName}</span>
              <span className="text-[10px] text-primary font-semibold">Administrator</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1 text-on-surface-variant hover:text-error rounded transition-colors cursor-pointer"
            title="Sign out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
