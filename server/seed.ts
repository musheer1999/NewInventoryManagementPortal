import { db } from "./db";
import { products, buyBills, buyBillItems, sellBills, sellBillItems } from "@shared/schema";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // Check if data exists
  const existingProducts = await storage.getProducts();
  if (existingProducts.length > 0) {
    console.log("Database already seeded.");
    return;
  }

  // Create Buy Bill (Initial Inventory)
  console.log("Creating initial buy bill...");
  await storage.createBuyBill({
    dealerName: "AutoParts Wholesalers",
    billDate: new Date().toISOString().split('T')[0],
    items: [
      {
        name: "Brake Pad (Honda City)",
        company: "Bosch",
        productId: "BP-HC-001",
        uniqueId: "brake-pad-honda-city-bosch-bp-hc-001", // manual override or let backend generate? backend generates if missing. let's provide to be safe or test generation.
        // Let's test generation by NOT providing uniqueId for one, and providing for others.
        buyPrice: 850,
        quantity: 10
      },
      {
        name: "Engine Oil 5W-30",
        company: "Castrol",
        productId: "EO-5W30-1L",
        buyPrice: 450,
        quantity: 50
      },
      {
        name: "Oil Filter",
        company: "Purolator",
        productId: "OF-Gen",
        buyPrice: 120,
        quantity: 20
      }
    ]
  });

  // Create Sell Bill (First Sale)
  console.log("Creating initial sell bill...");
  // We need to fetch products to get their generated uniqueIds or use the ones we know
  const productsList = await storage.getProducts();
  const brakePad = productsList.find(p => p.name.includes("Brake Pad"));
  const engineOil = productsList.find(p => p.name.includes("Engine Oil"));

  if (brakePad && engineOil) {
    await storage.createSellBill({
      customerName: "Rahul Sharma",
      customerPhone: "9876543210",
      billDate: new Date().toISOString().split('T')[0],
      items: [
        {
          uniqueId: brakePad.uniqueId,
          sellingPrice: 1200,
          quantity: 2
        },
        {
          uniqueId: engineOil.uniqueId,
          sellingPrice: 650,
          quantity: 1
        }
      ]
    });
  }

  console.log("Seeding complete.");
}

seed().catch(console.error);
