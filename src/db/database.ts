import { useSQLiteContext } from "expo-sqlite";
import { Platform } from "react-native";
import { Stop } from "../types/routes";

// Lightweight SQLite mock for the Web platform using localStorage
class WebSQLiteMock {
  private getStops(): Stop[] {
    if (typeof window === "undefined" || !window.localStorage) {
      return [];
    }
    const data = localStorage.getItem("route_stops");
    return data ? JSON.parse(data) : [];
  }

  private saveStops(stops: Stop[]) {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("route_stops", JSON.stringify(stops));
    }
  }

  async getAllAsync<T>(sql: string, args: any[] = []): Promise<T[]> {
    console.log("🕸️ Web SQLite Mock [getAllAsync]:", sql, args);
    const stops = this.getStops();

    if (sql.includes("ORDER BY display_order")) {
      stops.sort((a, b) => a.display_order - b.display_order);
    }
    return stops as T[];
  }

  async runAsync(sql: string, args: any[] = []): Promise<any> {
    console.log("🕸️ Web SQLite Mock [runAsync]:", sql, args);
    let stops = this.getStops();

    if (sql.startsWith("INSERT INTO stops")) {
      // Columns: id, address, nickname, lat, lng, display_order, is_important, is_completed, is_start
      const [id, address, nickname, lat, lng, display_order, is_important, is_completed, is_start] = args;
      stops.push({
        id,
        address,
        nickname: nickname || undefined,
        lat: Number(lat),
        lng: Number(lng),
        is_important: Boolean(is_important),
        is_completed: Boolean(is_completed),
        is_start: Boolean(is_start),
        display_order: Number(display_order),
      });
      this.saveStops(stops);
    } else if (sql.startsWith("UPDATE stops SET is_start = 0")) {
      stops.forEach((s) => (s.is_start = false));
      this.saveStops(stops);
    } else if (sql.startsWith("UPDATE stops SET is_start = 1 WHERE id = ?")) {
      const [id] = args;
      stops.forEach((s) => {
        if (s.id === id) s.is_start = true;
      });
      this.saveStops(stops);
    } else if (sql.startsWith("UPDATE stops SET display_order = ? WHERE id = ?")) {
      const [display_order, id] = args;
      stops.forEach((s) => {
        if (s.id === id) s.display_order = Number(display_order);
      });
      this.saveStops(stops);
    } else if (sql.startsWith("UPDATE stops SET")) {
      // Parse UPDATE stops SET field = ? WHERE id = ?
      const match = sql.match(/UPDATE stops SET (\w+) = \? WHERE id = \?/i);
      if (match) {
        const field = match[1];
        const [value, id] = args;
        stops.forEach((s: any) => {
          if (s.id === id) {
            if (["is_important", "is_completed", "is_start"].includes(field)) {
              s[field] = Boolean(value);
            } else {
              s[field] = value;
            }
          }
        });
        this.saveStops(stops);
      }
    } else if (sql.startsWith("DELETE FROM stops WHERE id = ?")) {
      const [id] = args;
      stops = stops.filter((s) => s.id !== id);
      this.saveStops(stops);
    }

    return { changes: 1, lastInsertRowId: Date.now() };
  }

  async execAsync(sql: string): Promise<void> {
    console.log("🕸️ Web SQLite Mock [execAsync]: Schema init or Alter table (ignored on web)");
  }
}

// Single instance for web
const webDbInstance = new WebSQLiteMock();

export function useAppDatabase() {
  if (Platform.OS === "web") {
    return webDbInstance;
  }
  return useSQLiteContext();
}
