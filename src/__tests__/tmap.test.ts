import { SQLiteDatabase } from "expo-sqlite";
import {
  optimizeRoute,
  prepareTmapPayload,
  updateStopsOrder,
} from "../services/tmap";
import { Stop, TmapPayload } from "../types/routes";

// Mock fetch globally
global.fetch = jest.fn();

/**
 * DEBUGGING GUIDE FOR "OPTIMIZE ROUTE" BUTTON ERROR
 *
 * Common Issues:
 * 1. EXPO_PUBLIC_TMAP_API_KEY not set in .env file
 * 2. Database query returns empty stops array
 * 3. Stop records missing from database (display_order not set correctly)
 * 4. API response format mismatch
 * 5. Network connectivity issues
 *
 * Run this test with: npm test -- src/__tests__/tmap.test.ts
 */

describe("Tmap Service - optimizeRoute and prepareTmapPayload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    delete process.env.EXPO_PUBLIC_TMAP_API_KEY;
  });

  describe("prepareTmapPayload", () => {
    it("should correctly format stops from database into Tmap payload", async () => {
      const mockStops: Stop[] = [
        {
          id: "1",
          address: "Seoul",
          nickname: "Warehouse",
          lat: 37.7749,
          lng: 127.4194,
          is_important: true,
          is_completed: false,
          display_order: 1,
          is_start: false,
        },
        {
          id: "2",
          address: "Busan",
          nickname: "Store",
          lat: 35.1796,
          lng: 129.0756,
          is_important: false,
          is_completed: false,
          display_order: 2,
          is_start: false,
        },
      ];

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue(mockStops),
      } as unknown as SQLiteDatabase;

      const result = await prepareTmapPayload(mockDb);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        "SELECT * FROM stops ORDER BY display_order",
      );
      expect(result).toEqual({
        stops: [
          { lat: 37.7749, lng: 127.4194 }, // Priority stop first
          { lat: 35.1796, lng: 129.0756 },
        ],
      });
    });

    it("should handle empty stops array", async () => {
      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue([]),
      } as unknown as SQLiteDatabase;

      const result = await prepareTmapPayload(mockDb);

      expect(result).toEqual({ stops: [] });
    });

    it("should maintain display_order when querying from database", async () => {
      const mockStops: Stop[] = [
        {
          id: "3",
          address: "Daegu",
          lat: 35.8722,
          lng: 128.597,
          is_important: false,
          is_completed: false,
          display_order: 3,
          is_start: false,
        },
        {
          id: "1",
          address: "Seoul",
          lat: 37.7749,
          lng: 127.4194,
          is_important: true,
          is_completed: false,
          display_order: 1,
          is_start: false,
        },
      ];

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue(mockStops),
      } as unknown as SQLiteDatabase;

      await prepareTmapPayload(mockDb);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        "SELECT * FROM stops ORDER BY display_order",
      );
    });

    it("should throw error if database query fails", async () => {
      const mockDb = {
        getAllAsync: jest
          .fn()
          .mockRejectedValue(new Error("Database connection failed")),
      } as unknown as SQLiteDatabase;

      await expect(prepareTmapPayload(mockDb)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("optimizeRoute", () => {
    it("should throw error when EXPO_PUBLIC_TMAP_API_KEY is missing", async () => {
      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      await expect(optimizeRoute(payload)).rejects.toThrow(
        "Tmap App Key not found",
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should successfully call Tmap API with correct payload and headers", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          resultCode: 200,
          resultMessage: "OK",
          resultData: {
            optimizedRoute: [
              [127.4194, 37.7749],
              [129.0756, 35.1796],
            ],
          },
        }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await optimizeRoute(payload);

      expect(fetch).toHaveBeenCalledWith(
        "https://apis.openapi.sk.com/tmap/routes?version=1&appKey=test-api-key-12345",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startX: 127.4194,
            startY: 37.7749,
            endX: 129.0756,
            endY: 35.1796,
            reqCoordType: "WGS84GEO",
            resCoordType: "WGS84GEO",
          }),
        },
      );

      expect(result).toEqual({
        resultCode: 200,
        resultMessage: "OK",
        resultData: {
          optimizedRoute: [
            [127.4194, 37.7749],
            [129.0756, 35.1796],
          ],
        },
      });
    });

    it("should throw error on failed API response (non-200 status)", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: jest.fn().mockResolvedValue("Unauthorized"),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(optimizeRoute(payload)).rejects.toThrow(
        "Failed to optimize route",
      );
    });

    it("should handle network errors gracefully", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const networkError = new Error("Network request failed");
      (fetch as jest.Mock).mockRejectedValue(networkError);

      await expect(optimizeRoute(payload)).rejects.toThrow(
        "Network request failed",
      );
    });

    it("should handle empty stops array in payload", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const payload: TmapPayload = { stops: [] };

      await expect(optimizeRoute(payload)).rejects.toThrow(
        "At least 2 stops are required for route optimization",
      );
    });

    it("should properly stringify payload in request body", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ resultCode: 200 }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await optimizeRoute(payload);

      const callArgs = (fetch as jest.Mock).mock.calls[0];
      expect(callArgs[1].body).toBe(
        JSON.stringify({
          startX: 127.4194,
          startY: 37.7749,
          endX: 129.0756,
          endY: 35.1796,
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
        }),
      );
    });

    it("should handle 403 Forbidden response (permission denied)", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "invalid-api-key";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const mockResponse = {
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: jest.fn().mockResolvedValue("Forbidden"),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(optimizeRoute(payload)).rejects.toThrow(
        "Failed to optimize route",
      );
    });

    it("should handle 500 Server Error response", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: jest.fn().mockResolvedValue("Internal Server Error"),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(optimizeRoute(payload)).rejects.toThrow(
        "Failed to optimize route",
      );
    });
  });

  describe("updateStopsOrder", () => {
    it("should reorder stops with priority stops first", async () => {
      const mockStops: Stop[] = [
        {
          id: "1",
          address: "Regular Stop",
          lat: 37.7749,
          lng: 127.4194,
          is_important: false,
          is_completed: false,
          display_order: 1,
          is_start: false,
        },
        {
          id: "2",
          address: "Priority Stop",
          lat: 35.1796,
          lng: 129.0756,
          is_important: true,
          is_completed: false,
          display_order: 2,
          is_start: false,
        },
        {
          id: "3",
          address: "Another Regular Stop",
          lat: 36.5,
          lng: 128.0,
          is_important: false,
          is_completed: false,
          display_order: 3,
          is_start: false,
        },
      ];

      const mockDb = {
        runAsync: jest.fn().mockResolvedValue(undefined),
      } as unknown as SQLiteDatabase;

      await updateStopsOrder(mockDb, {}, mockStops);

      // Should update display_order: priority stop first, then regular stops
      expect(mockDb.runAsync).toHaveBeenCalledTimes(3);
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        "UPDATE stops SET display_order = ? WHERE id = ?",
        [0, "2"], // Priority stop gets order 0
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        "UPDATE stops SET display_order = ? WHERE id = ?",
        [1, "1"], // First regular stop gets order 1
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        "UPDATE stops SET display_order = ? WHERE id = ?",
        [2, "3"], // Second regular stop gets order 2
      );
    });
  });
  describe("Integration: prepareTmapPayload + optimizeRoute", () => {
    it("should handle complete flow from database to API call", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-api-key-12345";

      const mockStops: Stop[] = [
        {
          id: "1",
          address: "Seoul",
          lat: 37.7749,
          lng: 127.4194,
          is_important: true,
          is_completed: false,
          display_order: 1,
          is_start: false,
        },
        {
          id: "2",
          address: "Busan",
          lat: 35.1796,
          lng: 129.0756,
          is_important: false,
          is_completed: false,
          display_order: 2,
          is_start: false,
        },
      ];

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue(mockStops),
        runAsync: jest.fn().mockResolvedValue(undefined),
      } as unknown as SQLiteDatabase;

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          resultCode: 200,
          resultMessage: "OK",
          resultData: {
            optimizedRoute: [
              [127.4194, 37.7749],
              [129.0756, 35.1796],
            ],
          },
        }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Step 1: Prepare payload from database
      const payload = await prepareTmapPayload(mockDb);

      // Step 2: Call optimize route
      const result = await optimizeRoute(payload);

      // Step 3: Update stops order
      await updateStopsOrder(mockDb, result, mockStops);

      expect(payload).toEqual({
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      });

      expect(result.resultCode).toBe(200);
    });
  });

  describe("Real-World Scenarios & Debugging", () => {
    it("should handle stops with integer boolean values from SQLite (common issue)", async () => {
      // SQLite returns 0/1 for boolean fields, not true/false
      const mockStops: any[] = [
        {
          id: "1",
          address: "Seoul",
          lat: 37.7749,
          lng: 127.4194,
          is_important: 1, // Integer from SQLite
          is_completed: 0, // Integer from SQLite
          display_order: 1,
        },
      ];

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue(mockStops),
      } as unknown as SQLiteDatabase;

      const result = await prepareTmapPayload(mockDb);

      // Should still create valid payload despite integer booleans
      expect(result.stops).toHaveLength(1);
      expect(result.stops[0].lat).toBe(37.7749);
      expect(result.stops[0].lng).toBe(127.4194);
    });

    it("should diagnose missing API key on production call", async () => {
      delete process.env.EXPO_PUBLIC_TMAP_API_KEY;

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue([
          {
            id: "1",
            address: "Seoul",
            lat: 37.7749,
            lng: 127.4194,
            is_important: false,
            is_completed: false,
            display_order: 1,
            is_start: false,
          },
          {
            id: "2",
            address: "Busan",
            lat: 35.1796,
            lng: 129.0756,
            is_important: false,
            is_completed: false,
            display_order: 2,
            is_start: false,
          },
        ]),
      } as unknown as SQLiteDatabase;

      const payload = await prepareTmapPayload(mockDb);

      // This should throw with clear message
      await expect(optimizeRoute(payload)).rejects.toThrow(
        "Tmap App Key not found",
      );

      // Debugging info
      console.log("🔧 DEBUG: API Key check");
      console.log(
        "✗ EXPO_PUBLIC_TMAP_API_KEY is missing in environment variables",
      );
      console.log("✓ Solution: Add EXPO_PUBLIC_TMAP_API_KEY to .env file");
    });

    it("should handle database with single stop (minimal case)", async () => {
      const mockStops: Stop[] = [
        {
          id: "1",
          address: "Paju, Gyeonggi",
          lat: 37.7426,
          lng: 126.7785,
          is_important: false,
          is_completed: false,
          display_order: 1,
          is_start: false,
        },
      ];

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue(mockStops),
      } as unknown as SQLiteDatabase;

      const payload = await prepareTmapPayload(mockDb);

      expect(payload.stops).toHaveLength(1);
      expect(payload.stops[0]).toEqual({
        lat: 37.7426,
        lng: 126.7785,
      });
    });

    it("should handle response with malformed data structure", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-key";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      // API returns unexpected structure
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          // Missing resultCode, resultMessage, etc.
          data: { some: "unexpected" },
        }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await optimizeRoute(payload);

      // Should still return whatever JSON was returned
      expect(result).toEqual({ data: { some: "unexpected" } });
    });

    it("should handle API timeout/slow response", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "test-key";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      // Simulate slow network
      const mockResponse = {
        ok: true,
        json: jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ resultCode: 200, data: [] }), 100),
              ),
          ),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await optimizeRoute(payload);
      const duration = Date.now() - startTime;

      expect(result.resultCode).toBe(200);
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it("should handle stops with missing optional fields", async () => {
      const mockStops: any[] = [
        {
          id: "1",
          address: "Seoul",
          lat: 37.7749,
          lng: 127.4194,
          is_important: 0,
          is_completed: 0,
          display_order: 1,
          // nickname is missing/undefined
        },
      ];

      const mockDb = {
        getAllAsync: jest.fn().mockResolvedValue(mockStops),
      } as unknown as SQLiteDatabase;

      const result = await prepareTmapPayload(mockDb);

      expect(result.stops).toHaveLength(1);
      expect(result.stops[0]).toEqual({
        lat: 37.7749,
        lng: 127.4194,
      });
    });

    it("should validate that fetch is called with correct URL", async () => {
      process.env.EXPO_PUBLIC_TMAP_API_KEY = "my-test-key";

      const payload: TmapPayload = {
        stops: [
          { lat: 37.7749, lng: 127.4194 },
          { lat: 35.1796, lng: 129.0756 },
        ],
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ resultCode: 200 }),
      };

      (fetch as jest.Mock).mockResolvedValue(mockResponse);

      await optimizeRoute(payload);

      expect(fetch).toHaveBeenCalledWith(
        "https://apis.openapi.sk.com/tmap/routes?version=1&appKey=my-test-key",
        expect.any(Object),
      );

      const callURL = (fetch as jest.Mock).mock.calls[0][0];
      console.log("✓ API URL called:", callURL);
    });
  });
});
