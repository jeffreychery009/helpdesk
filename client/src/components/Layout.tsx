import { Outlet, useNavigate } from "react-router-dom";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Ticket Manager
        </span>

        <div className="flex items-center gap-4">
          <span className="text-sm">{session?.user?.name}</span>
          <Button variant="default" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
