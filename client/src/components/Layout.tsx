import { Link, Outlet, useNavigate } from "react-router-dom";
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
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Ticket Manager
          </Link>
          <Link
            to="/tickets"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            Tickets
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link
              to="/users"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Users
            </Link>
          )}
        </div>

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
