import { UserSidebar } from "./UserSidebar";
import { UserHeader } from "./UserHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['USER']}>
      <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex">
        <UserSidebar />
        <div className="flex-1 flex flex-col pl-64">
          <UserHeader />
          <main className="flex-1 pt-16 relative">
            <div className="px-space-xl py-space-lg w-full h-full max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
