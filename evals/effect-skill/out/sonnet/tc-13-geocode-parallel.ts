import { createEffect } from '@rxfx/effect';

type Request = { address: string };
type Response = { lat: number; lng: number };

const handleGeocodeAddress = async (req: Request): Promise<Response> => {
  // Call maps API for parallel geocoding
  return { lat: 0, lng: 0 };
};

export const geocodeAddress = createEffect<Request, Response>(handleGeocodeAddress);
