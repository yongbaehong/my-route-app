export interface Stop {
  id: string;
  address: string;
  nickname?: string;
  lat: number;
  lng: number;
  is_important: boolean;
  is_completed: boolean;
  display_order: number;
}

// For Tmap API payload
export interface TmapStop {
  lat: number;
  lng: number;
  // Add other fields as needed for Tmap
}

export interface TmapPayload {
  stops: TmapStop[];
  // Other options for optimization
}
