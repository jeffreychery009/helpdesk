import { Outlet, useNavigate } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client";

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
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {session?.user?.name}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm px-3 py-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
