import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/tickets", label: "Tickets", icon: Ticket },
    ...(session?.user?.role === "ADMIN"
      ? [{ to: "/users", label: "Users", icon: Users }]
      : []),
  ];

  function isActive(path: string) {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }

  return (
    <div className="flex min-h-screen gradient-mesh-bg noise-bg">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 h-screen flex flex-col border-r border-border/50 bg-sidebar/80 backdrop-blur-xl transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center gap-2 border-b border-border/50 px-4">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Ticket className="size-4" />
          </div>
          {!collapsed && (
            <span className="font-heading text-sm font-bold tracking-tight text-foreground">
              HelpDesk
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? "bg-primary/10 text-primary glow-blue-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-border/50 p-3">
          <div
            className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}
          >
            <Avatar className="size-8 border border-border/50">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {getInitials(session?.user?.name ?? "U")}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session?.user?.role === "ADMIN" ? "Admin" : "Agent"}
                </p>
              </div>
            )}
          </div>

          <div className={`mt-3 flex gap-1 ${collapsed ? "flex-col items-center" : ""}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted-foreground hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeft className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
            {!collapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="ml-auto text-muted-foreground hover:text-destructive"
              >
                <LogOut className="mr-1.5 size-3.5" />
                Sign out
              </Button>
            )}
            {collapsed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
