export interface GeocodeResult {
  lat: number;
  lng: number;
  normalizedAddress: string;
  city: string;
  district: string;
  dong: string;
  buildingName: string;
  zipcode: string;
}

export const searchAddress = async (
  address: string,
): Promise<GeocodeResult | null> => {
  const MOCK_COORDINATES: Record<string, { lat: number, lng: number, normalizedAddress: string }> = {
    seoul: { lat: 37.5665, lng: 126.9780, normalizedAddress: "Seoul, South Korea" },
    busan: { lat: 35.1796, lng: 129.0756, normalizedAddress: "Busan, South Korea" },
    incheon: { lat: 37.4563, lng: 126.7052, normalizedAddress: "Incheon, South Korea" },
    daegu: { lat: 35.8714, lng: 128.6014, normalizedAddress: "Daegu, South Korea" },
    daejeon: { lat: 36.3504, lng: 127.3845, normalizedAddress: "Daejeon, South Korea" },
    gwangju: { lat: 35.1595, lng: 126.8526, normalizedAddress: "Gwangju, South Korea" },
    suwon: { lat: 37.2636, lng: 127.0286, normalizedAddress: "Suwon, Gyeonggi-do" },
    ulsan: { lat: 35.5389, lng: 129.3114, normalizedAddress: "Ulsan, South Korea" },
    jeju: { lat: 33.4996, lng: 126.5312, normalizedAddress: "Jeju Island, South Korea" },
  };

  const TMAP_API_KEY = process.env.EXPO_PUBLIC_TMAP_API_KEY;

  if (!TMAP_API_KEY) {
    console.warn("⚠️ Tmap API Key not found. Running searchAddress in simulation mode.");
    const queryLower = address.toLowerCase();
    
    // Find matching mock city
    for (const [key, value] of Object.entries(MOCK_COORDINATES)) {
      if (queryLower.includes(key)) {
        return {
          ...value,
          city: key === "jeju" ? "제주" : "서울",
          district: "",
          dong: "",
          buildingName: "",
          zipcode: "00000",
        };
      }
    }

    // Default fallback coordinate in Seoul with a slight random offset
    const offsetLat = (Math.random() - 0.5) * 0.04;
    const offsetLng = (Math.random() - 0.5) * 0.04;
    return {
      lat: 37.5665 + offsetLat,
      lng: 126.9780 + offsetLng,
      normalizedAddress: `${address} (Simulated)`,
      city: "서울",
      district: "중구",
      dong: "태평로1가",
      buildingName: "",
      zipcode: "04524",
    };
  }

  const url = `https://apis.openapi.sk.com/tmap/geo/fullAddrGeo?version=1&fullAddr=${encodeURIComponent(address)}&coordType=WGS84GEO&appKey=${TMAP_API_KEY}`;

  const response = await fetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.log("API Error:", response.status, errorData);
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Tmap API response:", data); // For debugging

  // Assuming the response structure based on Tmap API
  // coordinateInfo.coordinate[0] contains the result
  if (
    data.coordinateInfo &&
    data.coordinateInfo.coordinate &&
    data.coordinateInfo.coordinate.length > 0
  ) {
    const coord = data.coordinateInfo.coordinate[0];
    console.log("Extracted coordinate:", coord); // For debugging

    const latStr =
      coord.lat || coord.newLat || coord.newLatEntr || coord.latEntr || "";
    const lngStr =
      coord.lon ||
      coord.newLon ||
      coord.newLong ||
      coord.newLongEntr ||
      coord.lonEntr ||
      "";

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.log("No valid lat/lng in response");
      return null;
    }

    const normalizedAddress =
      `${coord.city_do || ""} ${coord.gu_gun || ""} ${coord.legalDong || ""}`.trim() ||
      coord.fullAddress ||
      address;

    return {
      lat,
      lng,
      normalizedAddress,
      city: coord.city_do || "",
      district: coord.gu_gun || "",
      dong: coord.legalDong || "",
      buildingName: coord.buildingName || "",
      zipcode: coord.zipcode || "",
    };
  }

  console.log("No results found in response");
  return null; // No results
};
