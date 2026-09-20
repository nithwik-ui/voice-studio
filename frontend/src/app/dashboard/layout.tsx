import { UserLayout } from "@/components/layout/UserLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <UserLayout>{children}</UserLayout>;
}
