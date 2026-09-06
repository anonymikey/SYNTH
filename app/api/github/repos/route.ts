import { NextResponse } from "next/server";
import { getToken, UserAuthorizationRequiredError } from "@vercel/connect";
import { createClient } from "@/lib/supabase/server";

const GITHUB_CONNECTOR = "scl_hxS8siXfDuPj12BQjC1A";

type GitHubRepository = { id: number; full_name: string; private: boolean; default_branch: string; description: string | null; updated_at: string };

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  try {
    const token = await getToken(GITHUB_CONNECTOR, { subject: { type: "user", id: user.id } });
    const search = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "SYNTH" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: "Unable to load repositories" }, { status: response.status });
    const repositories = (await response.json() as GitHubRepository[])
      .filter((repo) => !search || repo.full_name.toLowerCase().includes(search))
      .slice(0, 25)
      .map(({ id, full_name, private: isPrivate, default_branch, description, updated_at }) => ({ id, fullName: full_name, private: isPrivate, defaultBranch: default_branch, description, updatedAt: updated_at }));
    return NextResponse.json({ repositories });
  } catch (error) {
    if (error instanceof UserAuthorizationRequiredError) return NextResponse.json({ needsAuthorization: true }, { status: 401 });
    return NextResponse.json({ error: "Unable to access GitHub" }, { status: 502 });
  }
}
