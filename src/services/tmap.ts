import { SQLiteDatabase } from "expo-sqlite";
import { Stop, TmapPayload } from "../types/routes";

export const prepareTmapPayload = async (
  db: SQLiteDatabase,
): Promise<TmapPayload> => {
  const stops = await db.getAllAsync<Stop>(
    "SELECT * FROM stops ORDER BY display_order",
  );

  // Filter out completed stops if needed, or include all
  // For optimization, probably include all, but prioritize important ones
  // Tmap API expects stops in order, with coordinates

  const payload: TmapPayload = {
    stops: stops.map((stop) => ({
      lat: stop.lat,
      lng: stop.lng,
      // Add other fields if Tmap requires, like name or priority
    })),
    // Add other options like optimization parameters
  };

  return payload;
};

// Function to call Tmap API
// Assuming we have the API key in .env
// Need to create .env and add TMAP_APP_KEY

export const optimizeRoute = async (payload: TmapPayload) => {
  const TMAP_APP_KEY = process.env.EXPO_PUBLIC_TMAP_API_KEY; // Need to load from .env
  console.log("My Key:", process.env.EXPO_PUBLIC_TMAP_API_KEY);
  console.log("My Key:", process.env.TMAP_APP_KEY);
  if (!TMAP_APP_KEY) {
    throw new Error("Tmap App Key not found");
  }

  // Example API call - adjust based on actual Tmap 2026 API
  const response = await fetch(
    "https://apis.openapi.sk.com/tmap/routes/routeOptimization?version=1",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        appKey: TMAP_APP_KEY,
      },
      body: JSON.stringify({
        ...payload,
        // Add required fields for Tmap
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to optimize route");
  }

  return await response.json();
};
