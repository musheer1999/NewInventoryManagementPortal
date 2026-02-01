import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Receipt, Plus, Trash2, IndianRupee, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const expenseFormSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
  expenseType: z.enum(['Transport', 'Rent', 'Electricity', 'Salary', 'Miscellaneous']),
  expenseDate: z.date(),
  description: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function Expenses() {
  const { toast } = useToast();
  
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(format(now, "MM"));
  const [filterYear, setFilterYear] = useState(format(now, "yyyy"));
  const [graphYear, setGraphYear] = useState(format(now, "yyyy"));

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: [api.expenses.list.path],
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: [api.expenses.summary.path, graphYear],
    queryFn: async () => {
      const url = `${api.expenses.summary.path}?year=${graphYear}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch expense summary");
      return res.json();
    }
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      expenseType: 'Miscellaneous',
      expenseDate: new Date(),
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const formattedValues = {
        ...values,
        expenseDate: format(values.expenseDate, 'yyyy-MM-dd'),
      };
      const res = await apiRequest("POST", api.expenses.create.path, formattedValues);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.summary.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
      form.reset({
        amount: 0,
        expenseType: 'Miscellaneous',
        expenseDate: new Date(),
        description: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.expenses.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.expenses.summary.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      toast({
        title: "Deleted",
        description: "Expense record removed",
      });
    },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    createMutation.mutate(values);
  };

  const formattedCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter((exp: any) => {
      const expDate = parseISO(exp.expenseDate);
      return format(expDate, "MM") === filterMonth && format(expDate, "yyyy") === filterYear;
    });
  }, [expenses, filterMonth, filterYear]);

  const filteredGraphData = useMemo(() => {
    return summary?.monthlyData || [];
  }, [summary?.monthlyData]);

  if (isLoadingExpenses || isLoadingSummary) {
    return (
      <div className="h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const months = [
    { value: "01", label: "January" }, { value: "02", label: "February" },
    { value: "03", label: "March" }, { value: "04", label: "April" },
    { value: "05", label: "May" }, { value: "06", label: "June" },
    { value: "07", label: "July" }, { value: "08", label: "August" },
    { value: "09", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  const currentYearNum = parseInt(format(now, "yyyy"));
  const years = Array.from({ length: 11 }, (_, i) => ({
    value: (currentYearNum - 5 + i).toString(),
    label: (currentYearNum - 5 + i).toString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
        <p className="text-muted-foreground mt-2">Manage your shop expenses and overheads.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Monthly Expense"
          value={formattedCurrency(summary?.currentMonthExpense || 0)}
          icon={Receipt}
          description="Total expenses for this month"
        />
        <StatCard
          title="Yearly Expense"
          value={formattedCurrency(summary?.totalYearlyExpense || 0)}
          icon={IndianRupee}
          description="Total expenses this year"
        />
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="add">Add Expense</TabsTrigger>
          <TabsTrigger value="list">Expense List</TabsTrigger>
          <TabsTrigger value="graph">Expense Graph</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card className="max-w-2xl mx-auto shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle>Record New Expense</CardTitle>
              <CardDescription>Enter the details of your shop expense.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expenseType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Transport">Transport</SelectItem>
                            <SelectItem value="Rent">Rent</SelectItem>
                            <SelectItem value="Electricity">Electricity</SelectItem>
                            <SelectItem value="Salary">Salary</SelectItem>
                            <SelectItem value="Miscellaneous">Miscellaneous</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expense Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Extra details..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Save Expense
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Your shop expenditures for the selected period.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense: any) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{format(new Date(expense.expenseDate), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700">{expense.expenseType}</span>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">{expense.description || "-"}</TableCell>
                        <TableCell className="text-right font-semibold">₹{Number(expense.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(expense.id)} disabled={deleteMutation.isPending} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graph">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Expense Trends</CardTitle>
                <CardDescription>Monthly expense overview for the selected year.</CardDescription>
              </div>
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
                  <BarChart data={filteredGraphData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" vertical={false} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => format(new Date(value), 'MMM')} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="amount" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
