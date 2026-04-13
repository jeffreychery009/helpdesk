import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../lib/auth-client";

export default function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
