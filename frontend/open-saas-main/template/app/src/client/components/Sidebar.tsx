import { Link, useLocation } from "react-router-dom";
import { cn } from "../utils";
import { useAuth } from "wasp/client/auth";
import {
  LayoutDashboard,
  ShieldAlert,
  ScanSearch,
  FileText,
  Settings,
  Plus,
  Users,
  CreditCard,
  User,
  MessageSquarePlus,
  History,
  Shield
} from "lucide-react";

interface SidebarItem {
  name: string;
  to: string;
  icon?: any;
}

export function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { data: user } = useAuth();

  const getLinks = (): SidebarItem[] => {
    if (path.startsWith("/chat")) {
      return [
        { name: "New Chat", to: "/chat", icon: MessageSquarePlus },
        { name: "History", to: "/chat", icon: History },
      ];
    } else if (path.startsWith("/sast")) {
      return [
        { name: "Dashboard", to: "/sast", icon: LayoutDashboard },
        { name: "New Scan", to: "/sast/new", icon: Plus },
        { name: "Projects", to: "/sast/projects", icon: ShieldAlert },
        // { name: "Reports", to: "/sast/reports", icon: FileText },
      ];
    } else if (path.startsWith("/waf")) {
      return [
        { name: "Dashboard", to: "/waf", icon: LayoutDashboard },
        { name: "Rules", to: "/waf/rules", icon: ShieldAlert },
      ];
    } else if (path.startsWith("/osint")) {
      return [
        { name: "Dashboard", to: "/osint", icon: LayoutDashboard },
        { name: "Scans", to: "/osint/scans", icon: ScanSearch },
      ];
    } else {
      // General / Dashboard Unificado
      return [
        { name: "Overview", to: "/dashboard", icon: LayoutDashboard },
        { name: "Organization", to: "/settings/organization", icon: Users },
        { name: "Billing", to: "/settings/billing", icon: CreditCard },
      ];
    }
  };

  const getModuleHeader = () => {
    if (path.startsWith("/chat")) return "// AI SHIELD";
    if (path.startsWith("/sast")) return "// SAST MODULE";
    if (path.startsWith("/waf")) return "// WAF DEFENSE";
    if (path.startsWith("/osint")) return "// INTELLIGENCE";
    return "// CORE SYSTEM";
  };

  const links = getLinks();

  return (
    <div className="w-64 h-[calc(100vh-4rem)] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-black hidden lg:block sticky top-16 flex flex-col justify-between">
      <nav className="space-y-1 p-4">
        <div className="px-3 mb-3 mt-2">
            <span className="text-[10px] uppercase tracking-widest text-black dark:text-white font-mono font-bold">
                {getModuleHeader()}
            </span>
        </div>

        {links.map((link) => {
           const isActive = path === link.to;
           return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 border-l-2 group",
              isActive
                ? "bg-blue-100 dark:bg-blue-900/20 text-black dark:text-white border-blue-500 font-mono"
                : "border-transparent text-black dark:text-white hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 font-medium"
            )}
          >
            {link.icon && <link.icon className={cn("h-4 w-4 transition-colors", "text-black dark:text-white")} />}
            <span className={isActive ? "tracking-wide" : ""}>{link.name}</span>
          </Link>
        )})}
      </nav>
    </div>
  );
}
