import { createEffect } from '@rxfx/effect';

type Request = { street: string; city: string; postalCode: string };
type Response = { lat: number; lng: number };

/** Geocode a mailing address via the maps API; a single result, run in parallel, nothing to cancel. */
const handleGeocodeAddress = (address: Request): Promise<Response> => {
  // TODO: call the geocoding API for `address` and return its coordinates
  return Promise.resolve({ lat: 0, lng: 0 });
};

export const geocodeAddress = createEffect<Request, Response>(handleGeocodeAddress);
