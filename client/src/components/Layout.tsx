import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingCart, Truck, History, Package, Receipt } from "lucide-react";
import { clsx } from "clsx";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inventory", label: "Inventory", icon: Package },
    { href: "/purchase", label: "Purchase Entry", icon: Truck },
    { href: "/sell", label: "Sell Entry", icon: ShoppingCart },
    { href: "/transactions", label: "Transactions", icon: History },
    { href: "/expenses", label: "Expenses", icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            InventFlow
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Smart Inventory Manager</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              System Status
            </p>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Operational
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto max-w-7xl p-4 md:p-8 animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
