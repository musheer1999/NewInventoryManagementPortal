import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useCreatePurchaseBill } from "@/hooks/use-bills";
import { useProducts } from "@/hooks/use-products";
import { Plus, Trash2, Save, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";

// 1. Define Product Interface for TypeScript Safety
interface Product {
  uniqueId: string;
  name: string;
  company: string;
  productId?: string;
}

const purchaseFormSchema = z.object({
  dealerName: z.string().optional(),
  dealerGSTNumber: z.string().optional(),
  gstPercentage: z.coerce.number().min(0).max(100).optional(),
  billDate: z.string(),
  items: z.array(z.object({
    uniqueId: z.string().optional(),
    name: z.string().min(1, "Name required"),
    company: z.string().min(1, "Company required"),
    productId: z.string().optional(),
    buyPrice: z.coerce.number().min(0.01, "Price > 0"),
    quantity: z.coerce.number().min(1, "Qty >= 1"),
    totalCost: z.coerce.number().optional(),
  })).min(1, "Add at least one item"),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

export default function PurchaseEntry() {
  const { toast } = useToast();
  const { mutate: createBill, isPending } = useCreatePurchaseBill();
  const { data: products } = useProducts();

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      dealerName: "",
      billDate: format(new Date(), "yyyy-MM-dd"),
      items: [{ name: "", company: "", buyPrice: 0, quantity: 1, uniqueId: "", productId: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (data: PurchaseFormValues) => {
    // 2. Remove totalCost before sending to backend
    const { items, ...rest } = data;
    const cleanedItems = items.map(({ totalCost, ...item }) => item);

    const payload = {
      ...rest,
      items: cleanedItems,
      gstPercentage: data.gstPercentage || undefined,
    };
    createBill(payload, {
      onSuccess: () => {
        toast({ title: "Purchase recorded", description: "Inventory updated successfully." });
        form.reset({
          dealerName: "",
          dealerGSTNumber: "",
          gstPercentage: undefined,
          billDate: format(new Date(), "yyyy-MM-dd"),
          items: [{ name: "", company: "", buyPrice: 0, quantity: 1, uniqueId: "", productId: "" }]
        });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const calculateTotal = () => {
    const items = form.watch("items");
    return items.reduce((sum, item) => sum + (Number(item.buyPrice || 0) * Number(item.quantity || 0)), 0);
  };

  const handleProductSelect = (index: number, product: Product) => {
    form.setValue(`items.${index}.uniqueId`, product.uniqueId);
    form.setValue(`items.${index}.name`, product.name);
    form.setValue(`items.${index}.company`, product.company);
    form.setValue(`items.${index}.productId`, product.productId || "");
    
    // Reset totalCost when product changes to avoid stale calculations
    form.setValue(`items.${index}.totalCost`, undefined);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Purchase Entry</h2>
          <p className="text-muted-foreground">Record new stock arrivals.</p>
        </div>
        <div className="text-right bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <p className="text-xs text-muted-foreground font-medium uppercase">Total Bill Amount</p>
          <p className="text-2xl font-bold text-slate-800">₹{calculateTotal().toFixed(2)}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-md border-0 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary to-accent" />
            <CardHeader className="bg-slate-50/50 pb-4">
              <CardTitle className="text-lg">Bill Details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
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
                name="dealerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer Name (Optional)</FormLabel>
                    <FormControl><Input placeholder="Enter dealer name" {...field} className="bg-white" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dealerGSTNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer GST Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="Enter dealer GST" {...field} className="bg-white" /></FormControl>
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
              <CardTitle className="text-lg">Items</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => append({ name: "", company: "", buyPrice: 0, quantity: 1, uniqueId: "", productId: "" })} 
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100 relative group animate-in">

                  {/* Unique ID with Autocomplete Dropdown */}
                  <div className="col-span-12 md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.uniqueId`}
                      render={({ field }) => (
                        <FormItem className="relative">
                          <FormLabel className="text-xs">Unique ID</FormLabel>
                          <FormControl>
                            <AutocompleteInput 
                              {...field}
                              products={products || []}
                              onProductSelect={(prod) => handleProductSelect(index, prod)}
                              placeholder="Type Unique ID..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-6 md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Product Name</FormLabel>
                          <FormControl><Input {...field} className="h-9 bg-white" placeholder="Name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.company`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Company</FormLabel>
                          <FormControl><Input {...field} className="h-9 bg-white" placeholder="Company" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Product ID (Optional)</FormLabel>
                          <FormControl><Input {...field} className="h-9 bg-white" placeholder="SKU123" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-6 md:col-span-2">
                    <FormField control={form.control} name={`items.${index}.buyPrice`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Buy Price (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              className="h-9 bg-white" 
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                field.onChange(val);
                                const qty = form.getValues(`items.${index}.quantity`) || 0;
                                if (qty > 0) {
                                  form.setValue(`items.${index}.totalCost`, val * qty);
                                }
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              className="h-9 bg-white" 
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                field.onChange(val);
                                const total = form.getValues(`items.${index}.totalCost`) || 0;
                                const price = form.getValues(`items.${index}.buyPrice`) || 0;
                                if (val > 0) {
                                  if (total > 0) {
                                    form.setValue(`items.${index}.buyPrice`, total / val);
                                  } else {
                                    form.setValue(`items.${index}.totalCost`, price * val);
                                  }
                                }
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-2">
                    <FormField control={form.control} name={`items.${index}.totalCost`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Total Cost (₹)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              className="h-9 bg-white" 
                              placeholder="Total"
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                field.onChange(val);
                                const qty = form.getValues(`items.${index}.quantity`) || 0;
                                if (qty > 0 && val > 0) {
                                  form.setValue(`items.${index}.buyPrice`, val / qty);
                                }
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-2 flex items-end justify-between pb-1">
                    <div className="text-sm font-medium text-muted-foreground">
                      Subtotal: <span className="text-slate-900 ml-2">₹{(form.watch(`items.${index}.buyPrice`) * form.watch(`items.${index}.quantity`)).toFixed(2)}</span>
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} size="lg" className="w-full md:w-auto shadow-lg shadow-primary/20">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Purchase Entry
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

/**
 * CUSTOM AUTOCOMPLETE INPUT COMPONENT
 */

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  [key: string]: any; 
}

const AutocompleteInput = ({ 
  value, 
  onChange, 
  products, 
  onProductSelect, 
  placeholder, 
  ...props 
}: AutocompleteInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter products as user types
  useEffect(() => {
    if (value && value.length > 0) {
      const matches = products.filter((p) => 
        p.uniqueId.toLowerCase().includes(value.toLowerCase()) ||
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setFiltered(matches);
      // Only show dropdown if matches exist and what's typed isn't already a perfect match
      const exactMatch = products.find(p => p.uniqueId === value);
      setIsOpen(matches.length > 0 && !exactMatch);
    } else {
      setIsOpen(false);
    }
  }, [value, products]);

  // Close dropdown when clicking outside
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
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          {...props}
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            // Autofill if user types an ID perfectly
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
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
          {filtered.map((product) => (
            <div
              key={product.uniqueId}
              className="px-3 py-2 cursor-pointer hover:bg-slate-100 border-b border-slate-50 last:border-0 transition-colors"
              onMouseDown={(e) => {
                // Using onMouseDown prevents blur from firing before selection
                e.preventDefault();
                onProductSelect(product);
                setIsOpen(false);
              }}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                   <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                    {product.uniqueId}
                   </span>
                   <span className="text-[11px] text-muted-foreground">
                    • {product.company}
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