export interface GeocodeResult {
  lat: number;
  lng: number;
  normalizedAddress: string;
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
    return {
      lat: parseFloat(coord.newLat),
      lng: parseFloat(coord.newLon),
      normalizedAddress: coord.fullAddress || address, // Use matched address or input
    };
  }

  console.log("No results found in response");
  return null; // No results
};
