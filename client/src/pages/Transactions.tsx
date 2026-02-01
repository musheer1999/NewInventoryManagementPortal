import { useState, useMemo } from "react";
import { useTransactions, usePurchaseBillsByYear, useDeletePurchaseBill, useDeleteSellBill } from "@/hooks/use-bills";
import { format } from "date-fns";
import {
  Loader2,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function Transactions() {
  const [date, setDate] = useState<Date>(new Date());
  const formattedDate = format(date, "yyyy-MM-dd");

  const { data, isLoading } = useTransactions(formattedDate);
  const { mutate: deletePurchase } = useDeletePurchaseBill();
  const { mutate: deleteSell } = useDeleteSellBill();
  const { toast } = useToast();

  const [deleteId, setDeleteId] = useState<{ id: number; type: "buy" | "sell" } | null>(null);
  const [purchaseSearch, setPurchaseSearch] = useState("");

  const handleDelete = () => {
    if (!deleteId) return;
    const mutation = deleteId.type === "buy" ? deletePurchase : deleteSell;

    mutation(deleteId.id, {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Transaction removed successfully." });
        setDeleteId(null);
      },
      onError: (err: any) => {
        toast({ title: "Failed", description: err.message, variant: "destructive" });
        setDeleteId(null);
      },
    });
  };

  const sortByLatest = (arr: any[]) =>
    [...arr].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const filteredBuyBills = useMemo(() => {
    const bills = data?.buyBills.map((b: any) => ({ ...b, type: "buy" })) || [];
    if (!purchaseSearch) return bills;
    const search = purchaseSearch.toLowerCase();
    return bills.filter((bill: any) => 
      bill.dealerName?.toLowerCase().includes(search) ||
      bill.dealerGSTNumber?.toLowerCase().includes(search)
    );
  }, [data?.buyBills, purchaseSearch]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">Review daily business activity.</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal bg-white shadow-sm",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-64 items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="all">All Activity</TabsTrigger>
            <TabsTrigger value="buy">Purchases</TabsTrigger>
            <TabsTrigger value="sell">Sales</TabsTrigger>
            <TabsTrigger value="search">Purchase Search</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            <TransactionList
              bills={sortByLatest([
                ...(data?.buyBills.map((b: any) => ({ ...b, type: "buy" })) || []),
                ...(data?.sellBills.map((b: any) => ({ ...b, type: "sell" })) || []),
              ])}
              onDelete={setDeleteId}
            />
          </TabsContent>

          <TabsContent value="buy" className="space-y-4 mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by dealer name or GST number"
                className="pl-10 bg-white shadow-sm border-slate-200"
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
              />
            </div>
            <TransactionList
              bills={sortByLatest(filteredBuyBills)}
              onDelete={setDeleteId}
            />
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-6">
            <TransactionList
              bills={sortByLatest(
                data?.sellBills.map((b: any) => ({ ...b, type: "sell" })) || []
              )}
              onDelete={setDeleteId}
            />
          </TabsContent>

          <TabsContent value="search" className="space-y-6 mt-6">
            <PurchaseSearchTab />
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the transaction and reverse stock changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PurchaseSearchTab() {
  const now = new Date();
  const [year, setYear] = useState(format(now, "yyyy"));
  const [search, setSearch] = useState("");
  const { data: bills, isLoading } = usePurchaseBillsByYear(parseInt(year));

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = (parseInt(format(now, "yyyy")) - i).toString();
    return { value: y, label: y };
  });

  const filteredBills = useMemo(() => {
    const buyBills = (bills || []).map((b: any) => ({ ...b, type: "buy" }));
    if (!search) return buyBills;
    const s = search.toLowerCase();
    return buyBills.filter((b: any) => 
      b.dealerName?.toLowerCase().includes(s) ||
      b.dealerGSTNumber?.toLowerCase().includes(s)
    );
  }, [bills, search]);

  const sortedBills = [...filteredBills].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="md:col-span-1">
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Year</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="bg-white border-slate-200">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-medium text-muted-foreground uppercase mb-1 block">Search Dealer / GST</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by dealer name or GST number"
              className="pl-10 bg-white border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center h-48 items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <TransactionList bills={sortedBills} onDelete={() => {}} readOnly={true} />
      )}
    </div>
  );
}

/* ---------- BELOW CODE IS UNCHANGED (UI SAFE) ---------- */

function TransactionList({ bills, onDelete, readOnly = false }: { bills: any[]; onDelete: any; readOnly?: boolean }) {
  if (bills.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-muted-foreground">No transactions recorded for this date.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bills.map((bill) => (
        <TransactionCard key={`${bill.type}-${bill.id}`} bill={bill} onDelete={onDelete} readOnly={readOnly} />
      ))}
    </div>
  );
}

function TransactionCard({ bill, onDelete, readOnly = false }: { bill: any; onDelete: any; readOnly?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isBuy = bill.type === "buy";

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="p-5 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isBuy ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
            )}
          >
            {isBuy ? <ArrowDownLeft /> : <ArrowUpRight />}
          </div>
          <div>
            <h4 className="font-semibold">
              {isBuy
                ? `Purchase from ${bill.dealerName || "Unknown Dealer"}`
                : `Sale to ${bill.customerName || "Walk-in Customer"}`}
            </h4>

            {/* GST Number (only for purchase bills) */}
            {isBuy && bill.dealerGSTNumber && (
              <p className="text-xs text-muted-foreground">
                GSTIN: <span className="font-medium">{bill.dealerGSTNumber}</span>
              </p>
            )}
            
            <p className="text-xs text-muted-foreground">
              ID: #{bill.id} • {format(new Date(bill.createdAt), "h:mm a") }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className={cn("text-lg font-bold", isBuy ? "text-slate-700" : "text-green-600")}>
              {isBuy ? "-" : "+"}₹{Number(bill.totalAmount).toFixed(2)}
            </p>
          </div>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      {expanded && (
        <div className="bg-slate-50 border-t p-5">
          {bill.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between text-sm bg-white p-3 rounded-lg">
              <span>{item.uniqueId} × {item.quantity}</span>
              <span>₹{Number(isBuy ? item.totalCost : item.sellingPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            {!readOnly && (
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete({ id: bill.id, type: bill.type });
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Record
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
