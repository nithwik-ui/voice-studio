"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, getInitials } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function UserSettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setUsername(profile.username || "");
      setEmail(profile.email || user?.email || "");
    } else if (user) {
      setEmail(user.email || "");
    }
  }, [profile, user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("auth_user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordErr("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErr("Password must be at least 6 characters.");
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordMsg("");
      setPasswordErr("");

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setPasswordMsg("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(""), 3500);
    } catch (err: any) {
      setPasswordErr(err.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const initials = getInitials(fullName || "Voice Artist");

  return (
    <div className="flex flex-col gap-space-lg w-full max-w-3xl pb-12">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
          Profile & Settings
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Manage your artist identity, credentials, and studio preferences.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-xl tracking-wider ring-2 ring-primary/20">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-title-lg font-bold text-on-surface truncate">
            {fullName || "Nithwik Reddy"}
          </h2>
          <p className="text-xs text-on-surface-variant font-mono truncate">{email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-container/40 text-primary">
            {profile?.role === "ADMIN" ? "Administrator" : "Voice Artist (Talent)"}
          </span>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
        <h2 className="font-title-md font-bold text-on-surface mb-4">Personal Information</h2>

        {successMsg && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-error/10 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm focus:outline-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm focus:outline-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-low text-on-surface-variant text-sm cursor-not-allowed font-mono"
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              Email is managed by Supabase Authentication and cannot be changed here.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Form */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
        <h2 className="font-title-md font-bold text-on-surface mb-4">Account Security</h2>

        {passwordMsg && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div className="p-3 mb-4 rounded-lg bg-error/10 text-error text-xs font-semibold flex items-center gap-2 border border-error/20">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm focus:outline-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-sm focus:outline-primary"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {passwordSaving ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>

        <div className="pt-6 mt-6 border-t border-surface-container-high/40 flex items-center justify-between">
          <div>
            <h3 className="font-title-sm font-bold text-on-surface text-xs">Sign Out</h3>
            <p className="text-[11px] text-on-surface-variant">Log out of your studio session on this device.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
