import "dotenv/config";
import { optimizeRoute } from "./src/services/tmap.js";

async function testOptimizeRoute() {
  console.log("🧪 Testing optimizeRoute function...");

  // Test payload with sample data
  const testPayload = {
    stops: [
      { lat: 37.7749, lng: 127.4194 }, // Seoul area
      { lat: 35.1796, lng: 129.0756 }, // Busan area
    ],
  };

  try {
    console.log("📦 Test payload:", JSON.stringify(testPayload, null, 2));
    const result = await optimizeRoute(testPayload);
    console.log("✅ Success:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("❌ Full error:", error);
  }
}

testOptimizeRoute();
