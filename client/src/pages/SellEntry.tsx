import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useCreateSellBill } from "@/hooks/use-bills";
import { useProducts } from "@/hooks/use-products";
import { Plus, Trash2, CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Product {
  uniqueId: string;
  name: string;
  company: string;
  quantity: number; 
  productId?: string;
}

const sellFormSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerGSTNumber: z.string().optional(),
  gstPercentage: z.coerce.number().min(0).max(100).optional(),
  billDate: z.string(),
  items: z.array(z.object({
    uniqueId: z.string().min(1, "Select a product"),
    name: z.string(), 
    stock: z.number(), 
    sellingPrice: z.coerce.number().min(0.01, "Price > 0"),
    quantity: z.coerce.number().min(1, "Qty >= 1"),
  })).min(1, "Add at least one item"),
});

type SellFormValues = z.infer<typeof sellFormSchema>;

export default function SellEntry() {
  const { toast } = useToast();
  const { mutate: createBill, isPending } = useCreateSellBill();
  const { data: products } = useProducts();

  const form = useForm<SellFormValues>({
    resolver: zodResolver(sellFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      billDate: format(new Date(), "yyyy-MM-dd"),
      items: [{ uniqueId: "", name: "", stock: 0, sellingPrice: 0, quantity: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: SellFormValues) => {
    const invalidItem = data.items.find(item => item.quantity > item.stock);
    if (invalidItem) {
      toast({ 
        title: "Stock Error", 
        description: `Insufficient stock for ${invalidItem.name}. Available: ${invalidItem.stock}`, 
        variant: "destructive" 
      });
      return;
    }

    const payload = {
      ...data,
      gstPercentage: data.gstPercentage || undefined,
    };

    createBill(payload, {
      onSuccess: () => {
        toast({ title: "Sale recorded", description: "Inventory and profit updated." });
        form.reset({
          customerName: "",
          customerPhone: "",
          customerGSTNumber: "",
          gstPercentage: undefined,
          billDate: format(new Date(), "yyyy-MM-dd"),
          items: [{ uniqueId: "", name: "", stock: 0, sellingPrice: 0, quantity: 1 }]
        });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

const handleProductSelect = (index: number, product: Product) => {
  // Use setValue with the 'shouldValidate' option to force a re-check
  form.setValue(`items.${index}.uniqueId`, product.uniqueId, { shouldValidate: true });
  form.setValue(`items.${index}.name`, product.name);
  form.setValue(`items.${index}.stock`, Number(product.quantity)); // Ensure it's a number

  // Optional: If you want to automatically set quantity to 1 
  // only if stock is available, otherwise 0
  if (product.quantity <= 0) {
    form.setValue(`items.${index}.quantity`, 0);
  } else {
    form.setValue(`items.${index}.quantity`, 1);
  }
};
  const calculateTotal = () => {
    const items = form.watch("items");
    return items.reduce((sum, item) => sum + (Number(item.sellingPrice || 0) * Number(item.quantity || 0)), 0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-accent">Sell Entry</h2>
          <p className="text-muted-foreground">Process customer order.</p>
        </div>
        <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Sale Value</p>
          <p className="text-2xl font-bold text-slate-800">₹{calculateTotal().toFixed(2)}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-md border-0 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-accent to-primary" />
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-lg">Customer & Date</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 pt-6">
              <FormField
                control={form.control}
                name="billDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Date</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} className="bg-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="9876543210" {...field} className="bg-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customerGSTNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer GST Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="Enter customer GST" {...field} className="bg-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST % (Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} className="bg-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/50">
              <CardTitle className="text-lg">Cart Items</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ uniqueId: "", name: "", stock: 0, sellingPrice: 0, quantity: 1 })}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {fields.map((field, index) => {
                const currentStock = form.watch(`items.${index}.stock`);
                const currentQty = form.watch(`items.${index}.quantity`);
                const currentId = form.watch(`items.${index}.uniqueId`);

                // FIX: Only show stock warning if a product is actually selected
                const isOverStock = !!currentId && currentQty > currentStock;

                return (
                  <div key={field.id} className="grid grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 relative group animate-in">

                    <div className="col-span-12 md:col-span-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.uniqueId`}
                        render={({ field }) => (
                          <FormItem className="relative">
                            <FormLabel className="text-xs">Select Product</FormLabel>
                            <FormControl>
                              <AutocompleteInput 
                                {...field}
                                products={products || []}
                                onProductSelect={(prod) => handleProductSelect(index, prod)}
                                placeholder="Search inventory..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {currentStock > 0 && (
                        <p className="text-[10px] text-green-600 mt-1 font-medium">
                          Available Stock: {currentStock}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.sellingPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Selling Price (₹)</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} className="h-9 bg-white" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="col-span-6 md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                className={cn("h-9 bg-white", isOverStock && "border-red-500 ring-red-200")} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {isOverStock && <p className="text-[10px] text-red-500 mt-1 font-bold">Exceeds stock!</p>}
                    </div>

                    <div className="col-span-12 md:col-span-2 flex items-end justify-end pb-1">
                      {fields.length > 1 && (
                         <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => remove(index)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Complete Sale
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

/**
 * AUTOCOMPLETE COMPONENT
 */
interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  [key: string]: any; 
}

const AutocompleteInput = ({ value, onChange, products, onProductSelect, placeholder, ...props }: AutocompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && value.length > 0) {
      const matches = products.filter((p) => 
        p.uniqueId.toLowerCase().includes(value.toLowerCase()) ||
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFiltered(matches);
      const exactMatch = products.find(p => p.uniqueId === value);
      setIsOpen(matches.length > 0 && !exactMatch);
    } else {
      setIsOpen(false);
    }
  }, [value, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          {...props}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            const perfectMatch = products.find((p) => p.uniqueId === val);
            if (perfectMatch) onProductSelect(perfectMatch);
          }}
          placeholder={placeholder}
          className="h-9 bg-white pr-8"
          autoComplete="off"
        />
        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
          {filtered.map((product) => (
            <div
              key={product.uniqueId}
              className="px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                onProductSelect(product);
                setIsOpen(false);
              }}
            >
              <div className="flex flex-col">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    product.quantity > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    Stock: {product.quantity}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    {product.uniqueId}
                   </span>
                   <span className="text-[11px] text-muted-foreground uppercase">
                    {product.company}
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};