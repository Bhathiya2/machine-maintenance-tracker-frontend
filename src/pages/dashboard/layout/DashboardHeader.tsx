import { Link, useNavigate } from "react-router";
import {
  BarChart2,
  Bell,
  Camera,
  ChevronRight,
  ClipboardList,
  Cpu,
  Flag,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthContext } from "@/context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { VIEW_LABELS, VIEW_ROUTES } from "../constants";
import type { DashboardHeaderState } from "@/hooks/dashboard/useDashboardHeader";
import type { AppUser, ViewName } from "../types";

const VIEW_ICONS: Record<ViewName, LucideIcon> = {
  dashboard: LayoutDashboard,
  machines: Cpu,
  workorders: ClipboardList,
  faults: Flag,
  repairs: Camera,
  analytics: BarChart2,
  finance: Receipt,
  notifications: Bell,
  users: Users,
  roles: Shield,
};

const VIEW_DESCRIPTIONS: Partial<Record<ViewName, string>> = {
  dashboard: "Fleet overview and daily maintenance summary",
  machines: "Registry, status, and machine details",
  workorders: "Assign, track, and close work orders",
  faults: "Fault reports — report machine problems and track them",
  repairs: "Historical repair logs and photos",
  analytics: "Cost trends and performance metrics",
  finance: "Work order costs and budget tracking",
  notifications: "Alerts and activity updates",
  users: "Manage team members, roles, and site access",
  roles: "Create roles and assign permissions to users",
};

function userInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface DashboardHeaderProps {
  view: ViewName;
  currentUser: AppUser;
  unreadCount: number;
  openFaultCount: number;
  header: DashboardHeaderState;
  onOpenNav: () => void;
}

export function DashboardHeader({
  view,
  currentUser,
  unreadCount,
  openFaultCount,
  header,
  onOpenNav,
}: DashboardHeaderProps) {
  const { logout, user: authUser } = useAuthContext();
  const navigate = useNavigate();
  const {
    isOnline,
    isAway,
    searchRef,
    searchPanelRef,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectSearchResult,
    showSearchResults,
    openSearch,
  } = header;

  const PageIcon = VIEW_ICONS[view];
  const displayName = authUser?.name ?? currentUser.name;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 shadow-xs">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Mobile Nav toggle + Page Breadcrumb & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9 shrink-0 lg:hidden"
            onClick={onOpenNav}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {view === "finance" ? (
                <span className="text-sm font-bold leading-none">৳</span>
              ) : (
                <PageIcon className="size-4.5" strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/90">{VIEW_LABELS[view]}</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="truncate text-muted-foreground hidden sm:inline">{currentUser.site}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div
          ref={searchPanelRef}
          className="relative hidden flex-1 max-w-sm md:block"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <input
              ref={searchRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={openSearch}
              placeholder="Search all modules (machines, WOs, faults, users, roles…)"
              className="h-9.5 w-full rounded-full border border-border/80 bg-muted/40 pl-9 pr-16 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:bg-background focus:border-ring focus:ring-2 focus:ring-ring/20"
              aria-label="Search"
              aria-expanded={showSearchResults}
              aria-controls="dashboard-global-search"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/80 lg:inline-flex">
              Ctrl K
            </kbd>
          </div>

          {showSearchResults && (
            <div
              id="dashboard-global-search"
              className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            >
              {isSearching ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {searchResults.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => selectSearchResult(item)}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                      >
                        <span className="mt-0.5 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.type}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {item.label}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  No results for “{searchQuery}”
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions & User Menu */}
        <div className="flex shrink-0 items-center gap-2">
          {openFaultCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-1.5 border-red-200/80 bg-red-50/80 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 sm:inline-flex text-xs font-medium"
              onClick={() => navigate(VIEW_ROUTES.faults)}
            >
              <Flag className="size-3.5" />
              <span>{openFaultCount} open fault{openFaultCount > 1 ? "s" : ""}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="relative size-9 rounded-full"
            onClick={() => navigate(VIEW_ROUTES.notifications)}
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          <div className="h-4 w-px bg-border/80 mx-0.5 hidden sm:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-border/80 bg-card p-1 pr-2.5 transition-colors hover:bg-muted/60 cursor-pointer"
              >
                <div className="relative flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {userInitials(displayName)}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card",
                      !isOnline
                        ? "bg-muted-foreground"
                        : isAway
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    )}
                  />
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[110px] truncate text-xs font-semibold leading-tight text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {currentUser.role}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  {authUser?.email ?? "Signed in"}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Status: {isOnline ? (isAway ? "Away" : "Online") : "Offline"}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className="cursor-pointer">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/users" className="cursor-pointer">
                  <User className="size-4" />
                  User management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
