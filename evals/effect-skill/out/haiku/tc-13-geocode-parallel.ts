import { createEffect } from '@rxfx/effect';

type Request = { address: string };
type Response = { lat: number; lng: number };

const handleGeocode = async (req: Request): Promise<Response> => {
  // Call maps API for geocoding
  return { lat: 0, lng: 0 };
};

export const geocode = createEffect<Request, Response>(handleGeocode);
