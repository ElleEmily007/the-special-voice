import AdminShell from "./_components/AdminShell";

export const metadata = {
  title: "Admin — The Special Voice",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
