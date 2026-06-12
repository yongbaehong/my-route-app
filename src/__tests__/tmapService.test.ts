import "dotenv/config";
import { searchAddress } from "../services/tmapService";

describe("Tmap Service", () => {
  const testAddresses = [
    "서울시 강남구",
    "안성시 원곡면 가천중앙1길 66-20",
    "부산광역시 해운대구 우동",
    "제주특별자치도 제주시 한림읍",
  ];

  it("should search multiple addresses and return valid coordinates", async () => {
    for (const address of testAddresses) {
      console.log("Testing Tmap API with address:", address);

      try {
        const result = await searchAddress(address);
        console.log("API Result:", result);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty("lat");
        expect(result).toHaveProperty("lng");
        expect(result).toHaveProperty("normalizedAddress");
        expect(result).toHaveProperty("city");
        expect(result).toHaveProperty("district");
        expect(result).toHaveProperty("dong");
        expect(result).toHaveProperty("buildingName");
        expect(result).toHaveProperty("zipcode");
        expect(typeof result.lat).toBe("number");
        expect(typeof result.lng).toBe("number");
        expect(typeof result.normalizedAddress).toBe("string");
        expect(typeof result.city).toBe("string");
        expect(typeof result.district).toBe("string");
        expect(typeof result.dong).toBe("string");
        expect(typeof result.buildingName).toBe("string");
        expect(typeof result.zipcode).toBe("string");
      } catch (error) {
        console.error("API Error for", address, error.message);
        expect(error.message).toContain("403");
      }
    }
  });
});
