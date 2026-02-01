import { useState, useMemo } from "react";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/ui/stat-card";
import { Loader2, DollarSign, TrendingUp, Archive, BarChart3, LineChart, IndianRupee } from "lucide-react";
// Added PieChart components
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function Dashboard() {
  const now = new Date();
  const [graphYear, setGraphYear] = useState(format(now, "yyyy"));
  const { data: stats, isLoading } = useDashboardStats(graphYear);
  const [activeTab, setActiveTab] = useState("profit");

  const filteredMonthlyData = useMemo(() => {
    return stats?.monthlyData || [];
  }, [stats?.monthlyData]);

  const formattedCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const currentYearNum = parseInt(format(now, "yyyy"));
  const years = Array.from({ length: 6 }, (_, i) => ({
    value: (currentYearNum - i).toString(),
    label: (currentYearNum - i).toString(),
  }));

  // Logic for the Donut Chart Data
  const donutData = useMemo(() => {
    if (!stats) return [];
    const grossProfit = Math.max(stats.currentMonthProfit + (stats as any).currentMonthExpense || 0, 0);
    const expensesValue = Math.abs((stats as any).currentMonthExpense || 0);

    return [
      { name: "Gross Profit", value: grossProfit, color: "#22c55e" }, // Green
      { name: "Expenses", value: expensesValue, color: "#ef4444" },    // Red
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-2">Overview of your business performance.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="profit" className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Current Month Net Profit"
              value={formattedCurrency(stats.currentMonthProfit)}
              icon={TrendingUp}
              description="Sales profit minus expenses"
            />
            <StatCard
              title="Yearly Net Profit"
              value={formattedCurrency(stats.totalYearlyProfit)}
              icon={DollarSign}
              description="Total net profit this year"
            />
            <StatCard
              title="Inventory Value"
              value={formattedCurrency(stats.totalInventoryValue)}
              icon={Archive}
              description="Total asset value in stock"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle>Monthly Net Profit Overview</CardTitle>
                <Select value={graphYear} onValueChange={setGraphYear}>
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => format(new Date(value), 'MMM')} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`} 
                      />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar 
                        dataKey="profit" 
                        fill="currentColor" 
                        radius={[4, 4, 0, 0]} 
                        className="fill-primary" 
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ANIMATED DONUT CHART SECTION */}
            <Card className="col-span-3 shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle>Current Month Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formattedCurrency(value)} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Text Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Net Profit</span>
                    <span className={`text-xl font-bold ${stats.currentMonthProfit < 0 ? "text-red-500" : "text-green-600"}`}>
                      {formattedCurrency(stats.currentMonthProfit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Current Month Revenue"
              value={formattedCurrency(stats.currentMonthRevenue)}
              icon={LineChart}
              description="Total sales amount for this month"
            />
            <StatCard
              title="Yearly Revenue"
              value={formattedCurrency(stats.totalYearlyRevenue)}
              icon={IndianRupee}
              description="Total sales amount this year"
            />
            <StatCard
              title="Inventory Value"
              value={formattedCurrency(stats.totalInventoryValue)}
              icon={Archive}
              description="Total asset value in stock"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 shadow-sm border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle>Monthly Revenue Overview</CardTitle>
                <Select value={graphYear} onValueChange={setGraphYear}>
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredMonthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => format(new Date(value), 'MMM')} 
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `₹${value}`} 
                      />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="currentColor" 
                        radius={[4, 4, 0, 0]} 
                        className="fill-primary" 
                        barSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
