"use client";

import { usePathname, useRouter } from "next/navigation";
import { Notifications } from "./Notifications";
import { useAuth, getInitials } from "@/hooks/useAuth";

export function UserHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  
  let pageTitle = "Dashboard";
  if (pathname.includes("/projects")) pageTitle = "My Projects";
  else if (pathname.includes("/notifications")) pageTitle = "Notifications";
  else if (pathname.includes("/settings")) pageTitle = "Profile & Settings";
  else if (pathname.includes("/workspace")) pageTitle = "Recording Workspace";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || (user?.email === "nithwik59@gmail.com" ? "Nithwik Reddy" : "Voice Artist");
  const initials = getInitials(displayName);

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container-high">
      <div className="w-full h-16 px-space-xl flex items-center justify-between">
        <div className="flex items-center gap-space-sm text-on-surface-variant font-label-md text-label-md">
          <span className="text-on-surface-variant">VoiceFlow Studio</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold">{pageTitle}</span>
        </div>
        <div className="flex items-center gap-space-md">
          <Notifications />
          <div className="flex items-center gap-2 pl-space-xs border-l border-surface-container-high">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-xs uppercase ring-1 ring-outline-variant/40 tracking-wider">
                {initials}
              </div>
            )}
            <span className="hidden sm:inline font-label-md text-label-md text-on-surface font-semibold truncate max-w-[140px]">
              {displayName}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
