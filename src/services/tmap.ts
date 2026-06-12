import { SQLiteDatabase } from "expo-sqlite";
import { Stop, TmapPayload } from "../types/routes";

export const prepareTmapPayload = async (
  db: SQLiteDatabase,
): Promise<TmapPayload> => {
  const stops = await db.getAllAsync<Stop>(
    "SELECT * FROM stops ORDER BY display_order",
  );

  console.log("📋 prepareTmapPayload: Fetched", stops.length, "stops");
  console.log(
    "📋 All stops:",
    stops.map((s) => ({
      id: s.id,
      nickname: s.nickname,
      is_start: s.is_start,
      is_important: s.is_important,
      lat: s.lat,
      lng: s.lng,
    })),
  );

  // Handle empty stops array
  if (stops.length === 0) {
    console.warn("⚠️ No stops in database");
    return { stops: [] };
  }

  // Find the start point (if marked) or use the first stop
  let startStop = stops.find((stop) => stop.is_start);
  if (!startStop) {
    startStop = stops[0];
  }

  console.log(
    "🔴 START POINT:",
    startStop.nickname || startStop.address,
    "- Lat:",
    startStop.lat,
    "Lng:",
    startStop.lng,
  );

  // Separate start from other stops
  const otherStops = stops.filter((stop) => stop.id !== startStop!.id);

  // Sort remaining stops: priority stops first, then by display_order
  const sortedOtherStops = otherStops.sort((a, b) => {
    if (a.is_important && !b.is_important) return -1;
    if (!a.is_important && b.is_important) return 1;
    return a.display_order - b.display_order;
  });

  // Combine: start first, then other stops
  const finalStops = [startStop, ...sortedOtherStops];

  console.log(
    "📍 FINAL ROUTE ORDER:",
    finalStops.map((s, i) => ({
      order: i,
      nickname: s.nickname || s.address,
      is_start: s.is_start,
      is_important: s.is_important,
    })),
  );

  const payload: TmapPayload = {
    stops: finalStops.map((stop) => ({
      lat: stop.lat,
      lng: stop.lng,
      // Add other fields if Tmap requires, like name or priority
    })),
    // Add other options like optimization parameters
  };

  return payload;
};

// Function to update stop order based on optimized route
export const updateStopsOrder = async (
  db: SQLiteDatabase,
  optimizedRoute: any,
  originalStops: Stop[],
): Promise<void> => {
  console.log("🔄 Updating stops order based on optimized route...");
  console.log("📍 Original stops:", originalStops.length);
  console.log(
    "📍 Optimized route data:",
    JSON.stringify(optimizedRoute, null, 2),
  );

  // Start with the original stops to maintain the start point
  let reorderedStops = [...originalStops];

  // Try to extract waypoint order from different response formats
  try {
    // Check if API returned waypoint/route sequence
    if (optimizedRoute?.resultData?.route) {
      const routes = optimizedRoute.resultData.route;
      console.log("📊 Found route data:", routes);

      if (routes[0]?.summary) {
        // Has waypoint summary, use it to reorder
        const waypoints = routes[0].summary.waypoint || [];
        if (waypoints.length > 0) {
          console.log("📍 Waypoints order:", waypoints);
          reorderedStops = orderStopsByWaypoints(originalStops, waypoints);
        }
      }
    } else if (optimizedRoute?.resultData?.routePacket) {
      // Alternative format with routePacket
      const packets = Array.isArray(optimizedRoute.resultData.routePacket)
        ? optimizedRoute.resultData.routePacket
        : [optimizedRoute.resultData.routePacket];

      if (packets.length > 0) {
        console.log("📦 Found waypoints in packets");
        reorderedStops = orderStopsByPackets(originalStops, packets);
      }
    } else {
      // No optimization data found, use priority-based sorting
      console.log("ℹ️ No optimization data, using priority-based sorting");
      const priorityStops = originalStops.filter((stop) => stop.is_important);
      const regularStops = originalStops.filter((stop) => !stop.is_important);
      reorderedStops = [...priorityStops, ...regularStops];
    }
  } catch (error) {
    console.warn("⚠️ Could not extract waypoint order from response:", error);
    // Fall back to priority-based sorting
    const priorityStops = originalStops.filter((stop) => stop.is_important);
    const regularStops = originalStops.filter((stop) => !stop.is_important);
    reorderedStops = [...priorityStops, ...regularStops];
  }

  console.log(
    "📋 Reordered stops IDs:",
    reorderedStops.map((s) => s.id),
  );

  // Update display_order in database (0-indexed)
  for (let i = 0; i < reorderedStops.length; i++) {
    console.log(reorderedStops[i]);
    console.log(`  Updating stop #${i}: ${reorderedStops[i].id} -> order ${i}`);
    await db.runAsync("UPDATE stops SET display_order = ? WHERE id = ?", [
      i,
      reorderedStops[i].id,
    ]);
  }

  console.log("✅ Stops order updated successfully");
};

// Helper: Match and reorder stops by waypoint sequence
const orderStopsByWaypoints = (stops: Stop[], waypoints: any[]): Stop[] => {
  const orderedStops: Stop[] = [];

  for (const waypoint of waypoints) {
    const lat = waypoint.lat || waypoint.y;
    const lng = waypoint.lng || waypoint.x;

    const matchedStop = stops.find((stop) => {
      const latMatch = Math.abs(stop.lat - lat) < 0.0001;
      const lngMatch = Math.abs(stop.lng - lng) < 0.0001;
      return latMatch && lngMatch && !orderedStops.includes(stop);
    });

    if (matchedStop) {
      orderedStops.push(matchedStop);
    }
  }

  // Add any remaining stops that weren't in the waypoints
  for (const stop of stops) {
    if (!orderedStops.includes(stop)) {
      orderedStops.push(stop);
    }
  }

  return orderedStops;
};

// Helper: Match and reorder stops by route packets
const orderStopsByPackets = (stops: Stop[], packets: any[]): Stop[] => {
  const orderedStops: Stop[] = [];

  for (const packet of packets) {
    // Extract coordinates from packet
    const start = packet.startPoint || packet.start;
    if (!start) continue;

    const lat = start.lat || start.y;
    const lng = start.lng || start.x;

    const matchedStop = stops.find((stop) => {
      const latMatch = Math.abs(stop.lat - lat) < 0.0001;
      const lngMatch = Math.abs(stop.lng - lng) < 0.0001;
      return latMatch && lngMatch && !orderedStops.includes(stop);
    });

    if (matchedStop) {
      orderedStops.push(matchedStop);
    }
  }

  // Add any remaining stops
  for (const stop of stops) {
    if (!orderedStops.includes(stop)) {
      orderedStops.push(stop);
    }
  }

  return orderedStops;
};

export const optimizeRoute = async (payload: TmapPayload) => {
  console.log("🚀 optimizeRoute called");
  console.log("📍 Payload stops count:", payload.stops.length);
  console.log("📍 Payload stops:", JSON.stringify(payload.stops, null, 2));

  if (payload.stops.length < 2) {
    throw new Error("At least 2 stops are required for route optimization");
  }

  const TMAP_APP_KEY = process.env.EXPO_PUBLIC_TMAP_API_KEY;
  console.log("🔑 API Key exists:", !!TMAP_APP_KEY);
  console.log("🔑 API Key length:", TMAP_APP_KEY?.length || 0);

  if (!TMAP_APP_KEY) {
    console.error("❌ API Key missing");
    throw new Error("Tmap App Key not found");
  }

  // Try directions API instead - this might be available
  const url = `https://apis.openapi.sk.com/tmap/routes?version=1&appKey=${TMAP_APP_KEY}`;
  console.log("🌐 Calling API:", url);

  // For directions API, we need start and end points
  const start = payload.stops[0];
  const end = payload.stops[payload.stops.length - 1];
  const waypoints = payload.stops.slice(1, -1);

  const requestBody = {
    startX: start.lng,
    startY: start.lat,
    endX: end.lng,
    endY: end.lat,
    // Add waypoints if supported
    ...(waypoints.length > 0 && {
      passList: waypoints.map((wp) => `${wp.lng},${wp.lat}`).join("_"),
    }),
    reqCoordType: "WGS84GEO",
    resCoordType: "WGS84GEO",
  };
  console.log("📦 Request body:", JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📊 Response status:", response.status);
    console.log("📊 Response statusText:", response.statusText);
    console.log("✅ Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error response:", errorText);
      throw new Error(
        `Failed to optimize route: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("✅ Response data:", JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error("💥 Network or parsing error:", error);
    throw error;
  }
};
