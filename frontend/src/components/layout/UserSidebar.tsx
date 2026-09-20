"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, getInitials } from "@/hooks/useAuth";

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || (user?.email === "nithwik59@gmail.com" ? "Nithwik Reddy" : "Voice Artist");
  const displayRole = role === "ADMIN" ? "Administrator" : "Voice Artist";
  const initials = getInitials(displayName);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: "home" },
    { name: "My Projects", path: "/dashboard/projects", icon: "folder_open" },
    { name: "Notifications", path: "/notifications", icon: "notifications" },
    { name: "Profile & Settings", path: "/dashboard/settings", icon: "person" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-surface-container-high">
      <div className="h-16 px-space-md flex items-center gap-space-sm">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm shadow-primary/20">
          <span className="material-symbols-outlined text-[20px]">graphic_eq</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-title-md text-title-md text-on-surface truncate leading-none font-bold">VoiceFlow</span>
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold mt-space-xs">
            {displayRole}
          </span>
        </div>
      </div>

      <div className="px-space-md py-space-sm">
        <nav className="flex flex-col gap-space-xs">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== "/dashboard");
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center justify-between px-space-md py-space-sm rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-label-md font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-body-md"
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span className="text-body-md">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-space-md flex flex-col gap-space-sm">
        <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-sm border border-outline-variant/30">
          <div className="flex items-center gap-space-sm min-w-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-outline-variant/40"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0 ring-1 ring-outline-variant/40 tracking-wider">
                {initials}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md text-on-surface font-semibold truncate leading-tight">
                {displayName}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                {displayRole}
              </span>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer" 
            title="Sign out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
