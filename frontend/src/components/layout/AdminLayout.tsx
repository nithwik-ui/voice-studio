import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex">
        <AdminSidebar />
        <div className="flex-1 flex flex-col pl-64">
          <AdminHeader />
          <main className="flex-1 pt-16 relative">
            <div className="px-space-lg py-space-lg w-full h-full max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
