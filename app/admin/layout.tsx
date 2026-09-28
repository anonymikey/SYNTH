import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-invoke-path") ?? (await headers()).get("x-nextjs-url") ?? "";
  if (pathname.includes("/admin/login")) return children;
  const session = await hasAdminSession();
  return session ? children : redirect("/admin/login");
}
