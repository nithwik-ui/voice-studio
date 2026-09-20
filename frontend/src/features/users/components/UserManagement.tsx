"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function UsersManagement() {
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add User Modal state
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "USER", password: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${apiUrl}/api/users/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newUser)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to create user");
      }
      
      setShowModal(false);
      setNewUser({ name: "", email: "", role: "USER", password: "" });
      fetchUsers(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === "active" && u.status !== "ACTIVE") return false;
    if (filter === "disabled" && u.status !== "DISABLED" && u.status !== "INACTIVE") return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (u.full_name?.toLowerCase().includes(query) || 
              u.email?.toLowerCase().includes(query) || 
              u.username?.toLowerCase().includes(query));
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Users</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">Manage users and their assigned work.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary text-on-primary font-title-md text-title-md hover:bg-primary-container shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low/50">
              <h3 className="font-title-lg font-bold text-on-surface">Add New User</h3>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              {error && <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-sm">{error}</div>}
              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                  <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Temporary Password</label>
                  <input type="password" required minLength={6} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary outline-none">
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-medium text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer">Cancel</button>
                  <button type="submit" disabled={adding} className="px-4 py-2 bg-primary text-on-primary font-medium rounded-lg hover:bg-primary-container disabled:opacity-50 cursor-pointer shadow-sm">
                    {adding ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="relative flex-1 max-w-lg">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
          <input 
            type="text" 
            className="w-full pl-10 pr-space-md py-2 text-on-surface placeholder:text-outline bg-surface-container-low rounded-lg font-body-md text-body-md outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all"
            placeholder="Search by name, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-lg self-start md:self-auto">
          <button 
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
              filter === "all" ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            All <span className="ml-1 text-outline font-normal">({users.length})</span>
          </button>
          <button 
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
              filter === "active" ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Active
          </button>
          <button 
            onClick={() => setFilter("disabled")}
            className={`px-3 py-1.5 rounded-md font-label-md text-label-md transition-all cursor-pointer ${
              filter === "disabled" ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container-high">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/70 text-outline uppercase tracking-wider font-label-sm text-label-sm">
                <th className="py-3.5 px-space-lg font-semibold" scope="col">User</th>
                <th className="py-3.5 px-space-md font-semibold" scope="col">Email</th>
                <th className="py-3.5 px-space-md font-semibold text-center" scope="col">Role</th>
                <th className="py-3.5 px-space-md font-semibold" scope="col">Status</th>
                <th className="py-3.5 px-space-lg font-semibold text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">No users found.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-space-md px-space-lg">
                      <div className="flex items-center gap-space-sm">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-title-md text-title-md font-semibold bg-primary-container text-primary`}>
                          {user.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-title-md text-title-md font-semibold truncate ${user.status !== 'ACTIVE' ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                            {user.full_name}
                          </span>
                          <span className="font-label-sm text-label-sm text-outline">@{user.username || user.email.split('@')[0]}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-space-md px-space-md ${user.status !== 'ACTIVE' ? 'text-outline' : 'text-on-surface-variant'}`}>
                      {user.email}
                    </td>
                    <td className="py-space-md px-space-md text-center">
                      <span className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-surface-container-high font-label-md text-label-md font-semibold ${user.role === 'ADMIN' ? 'text-primary' : 'text-on-surface'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-space-md px-space-md">
                      {user.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-space-md px-space-lg text-right">
                      <div className="inline-flex items-center gap-space-xs">
                        <button className="px-space-sm py-1 font-title-md text-title-md text-primary hover:text-primary-container font-semibold transition-colors cursor-pointer">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
