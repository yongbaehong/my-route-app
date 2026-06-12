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
  const TMAP_API_KEY = process.env.EXPO_PUBLIC_TMAP_API_KEY;
  console.log(
    "Tmap API Key (first 10 chars):",
    TMAP_API_KEY ? TMAP_API_KEY.substring(0, 10) + "..." : "NOT FOUND",
  );
  if (!TMAP_API_KEY) {
    throw new Error("Tmap API key not found");
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
