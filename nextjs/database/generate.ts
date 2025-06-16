import fs from "fs/promises";
import path from "path";

type ItemType = {
  id: number;
  src: string;
  srcHighRes: string;
};

const INVENTORY_FILE = path.join(process.cwd(), "database", "inventory.json");

const readInventoryFromFile = async (): Promise<ItemType[] | null> => {
  try {
    const data = await fs.readFile(INVENTORY_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const writeInventoryToFile = async (items: ItemType[]): Promise<void> => {
  await fs.writeFile(INVENTORY_FILE, JSON.stringify(items, null, 2));
};

const isValidImage = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return false;

    // Check if the response is actually an image
    const contentType = response.headers.get("content-type");
    return contentType?.startsWith("image/") ?? false;
  } catch {
    return false;
  }
};

const generateRandomInventoryItem = async (): Promise<ItemType[]> => {
  const items: ItemType[] = [];
  const usedIds = new Set<number>();

  // Try to load existing items from file
  const existingItems = await readInventoryFromFile();
  if (existingItems) {
    items.push(...existingItems);
    existingItems.forEach((item) => usedIds.add(item.id));
  }

  while (items.length < 1000) {
    // Generate a random ID and check if it's already used
    let randomId = Math.floor(Math.random() * 100001);

    if (!usedIds.has(randomId)) {
      let imageUrl = `https://picsum.photos/id/${
        randomId % 1000
      }/${400}/${400}`;
      let highResImageUrl = `https://picsum.photos/id/${
        randomId % 1000
      }/${800}/${800}`;

      let isValid = await isValidImage(imageUrl);
      let isHighResValid = await isValidImage(highResImageUrl);

      while (!isValid || !isHighResValid) {
        randomId = Math.floor(Math.random() * 100001);
        imageUrl = `https://picsum.photos/id/${randomId % 1000}/${400}/${400}`;
        highResImageUrl = `https://picsum.photos/id/${
          randomId % 1000
        }/${800}/${800}`;
        isValid = await isValidImage(imageUrl);
        isHighResValid = await isValidImage(highResImageUrl);
      }

      usedIds.add(randomId);
      const newItem = {
        id: randomId,
        src: imageUrl,
        srcHighRes: highResImageUrl,
      };
      items.push(newItem);

      // Write to file after each successful image generation
      await writeInventoryToFile(items);
    }
  }

  return items;
};

class Inventory {
  private static inventoryItems: ItemType[];

  static async getInventoryItems(): Promise<ItemType[]> {
    if (!Inventory.inventoryItems) {
      // Try to read from file first
      const cachedItems = await readInventoryFromFile();
      if (cachedItems) {
        Inventory.inventoryItems = cachedItems;
      } else {
        // Generate new items if no cache exists
        Inventory.inventoryItems = await generateRandomInventoryItem();
      }
    }
    return Inventory.inventoryItems;
  }
}

export default await Inventory.getInventoryItems();
