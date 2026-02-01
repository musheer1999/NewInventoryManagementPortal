import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import PurchaseEntry from "@/pages/PurchaseEntry";
import SellEntry from "@/pages/SellEntry";
import Transactions from "@/pages/Transactions";
import Expenses from "@/pages/Expenses";
import { Layout } from "@/components/Layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/purchase" component={PurchaseEntry} />
        <Route path="/sell" component={SellEntry} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/expenses" component={Expenses} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
