import { Link, useLocation } from "wouter";
import { useAuthContext } from "@/lib/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, MapPin, Settings, LogOut, User } from "lucide-react";

export function Navigation() {
  const { user, logout } = useAuthContext();
  const [location] = useLocation();

  if (!user) return null;

  const navLinks = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/courses", label: "Courses", icon: MapPin },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard">
            <a className="flex items-center gap-2 hover-elevate rounded-lg px-2 py-1" data-testid="link-home">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <span className="text-lg font-bold">G</span>
              </div>
              <span className="text-lg font-semibold">Golf Day OS</span>
            </a>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.path || location.startsWith(link.path + "/");
              return (
                <Link key={link.path} href={link.path}>
                  <a
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate ${
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    }`}
                    data-testid={`link-nav-${link.label.toLowerCase()}`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </a>
                </Link>
              );
            })}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <a className="flex items-center gap-2 cursor-pointer" data-testid="link-settings">
                  <User className="h-4 w-4" />
                  Settings
                </a>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-destructive focus:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
