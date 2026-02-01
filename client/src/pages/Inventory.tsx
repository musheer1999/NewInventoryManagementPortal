import { useProducts, useProductHistory } from "@/hooks/use-products";
import { useState, useMemo, useEffect } from "react";
import { Loader2, Search, Eye, PackageOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";

export default function Inventory() {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredProducts = products?.filter((p) =>
    p.quantity > 0 && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalPages = Math.ceil((filteredProducts?.length || 0) / itemsPerPage);

  const paginatedProducts = useMemo(() => {
    if (!filteredProducts) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground">Manage your stock levels and view product history.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead>Unique ID</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Avg Buy Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <PackageOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id} className="group">
                    <TableCell className="font-mono text-xs font-medium">{product.uniqueId}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.company}</TableCell>
                    <TableCell className="text-right">
                      <span className={product.quantity < 10 ? "text-red-500 font-bold" : "text-slate-700"}>
                        {product.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      ₹{Number(product.averageBuyPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{(Number(product.averageBuyPrice) * product.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSelectedProduct(product.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductHistoryDialog 
        open={!!selectedProduct} 
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        productId={selectedProduct} 
      />
    </div>
  );
}

function ProductHistoryDialog({ open, onOpenChange, productId }: { open: boolean, onOpenChange: (o: boolean) => void, productId: number | null }) {
  const { data: history, isLoading } = useProductHistory(productId || 0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>(format(now, "yyyy"));

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter((item) => {
      const date = parseISO(item.billDate);
      const monthMatch = filterMonth === "all" || format(date, "MM") === filterMonth;
      const yearMatch = format(date, "yyyy") === filterYear;
      return monthMatch && yearMatch;
    });
  }, [history, filterMonth, filterYear]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage]);

  const months = [
    { value: "all", label: "All Months" },
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

  // Reset page on filter change or product change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterYear, productId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-3xl
          max-h-[90vh]
          flex flex-col
          p-0
          overflow-hidden
          sm:rounded-lg
          top-[5vh]
          translate-y-0
        "
      >

        <div className="p-6 pb-2">
          <DialogHeader>
            <DialogTitle>Product Purchase History</DialogTitle>
            <DialogDescription>Track cost changes over time for this item.</DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mt-4">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6">
          <div className="border rounded-md">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHistory.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">{format(new Date(item.billDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{item.dealerName || '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">₹{Number(item.buyPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">₹{Number(item.totalCost).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                        No purchase history found for selected period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="p-6 pt-2 border-t mt-auto bg-white">
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
