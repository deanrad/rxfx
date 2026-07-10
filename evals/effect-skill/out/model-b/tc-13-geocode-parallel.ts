import { createEffect } from '@rxfx/effect';

// A geocoding lookup takes an address object and yields a single coordinate pair.
type Request = { street: string; city: string; postalCode: string };
type Response = { lat: number; lng: number };

/** Look up coordinates for a mailing address. Independent lookups run in parallel. */
async function handleGeocodeAddress(address: Request): Promise<Response> {
  // TODO: call the maps API for `address`
  return { lat: 0, lng: 0 };
}

export const geocodeAddress = createEffect<Request, Response>(handleGeocodeAddress);
