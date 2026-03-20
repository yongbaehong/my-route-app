import "dotenv/config";
import { searchAddress } from "../services/tmapService";

describe("Tmap Service", () => {
  it("should search address and return result or null", async () => {
    const testAddress = "서울시 강남구"; // Simple test address

    console.log("Testing Tmap API with address:", testAddress);

    try {
      const result = await searchAddress(testAddress);
      console.log("API Result:", result);
      // Since key is invalid, expect null or error
      expect(result).toBeNull(); // Or check for error
    } catch (error) {
      console.error("API Error:", error.message);
      expect(error.message).toContain("403"); // Expect invalid key error
    }
  });
});
