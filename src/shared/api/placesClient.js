const API_KEY = process.env.EXPO_PUBLIC_PLACES_API_KEY;
const BASE = 'https://places.googleapis.com/v1';

const WORLD_REGIONS = [
  'Asia',
  'Europe Mediterranean',
  'South America',
  'Middle East Africa',
  'Oceania',
];

const TEXT_SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.shortFormattedAddress',
  'places.photos',
  'places.editorialSummary',
].join(',');

const DETAIL_FIELDS = [
  'id',
  'displayName',
  'shortFormattedAddress',
  'photos',
  'editorialSummary',
  'rating',
  'userRatingCount',
  'websiteUri',
  'regularOpeningHours',
].join(',');

function headers(fieldMask) {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': fieldMask,
  };
}

async function handleResponse(res) {
  if (!res.ok) throw new Error(`Places API error: ${res.status}`);
  return res.json();
}

export const placesClient = {
  async searchText(keyword, budget, regionIndex = 0) {
    const region = WORLD_REGIONS[regionIndex % WORLD_REGIONS.length];
    const budgetLabel = budget <= 100 ? 'budget' : budget <= 250 ? 'mid-range' : 'luxury';
    const res = await fetch(`${BASE}/places:searchText`, {
      method: 'POST',
      headers: headers(TEXT_SEARCH_FIELDS),
      body: JSON.stringify({
        textQuery: `famous ${keyword} ${budgetLabel} travel destinations ${region}`,
        languageCode: 'en',
        maxResultCount: 5,
      }),
    });
    const data = await handleResponse(res);
    return data.places ?? [];
  },

  async searchByName(name) {
    const res = await fetch(`${BASE}/places:searchText`, {
      method: 'POST',
      headers: headers(TEXT_SEARCH_FIELDS),
      body: JSON.stringify({
        textQuery: name,
        languageCode: 'en',
        maxResultCount: 1,
      }),
    });
    const data = await handleResponse(res);
    return data.places?.[0] ?? null;
  },

  async getPlaceDetail(placeId) {
    const res = await fetch(`${BASE}/places/${placeId}`, {
      method: 'GET',
      headers: headers(DETAIL_FIELDS),
    });
    return handleResponse(res);
  },

  photoUrl(photoName) {
    return `${BASE}/${photoName}/media?maxWidthPx=600&key=${API_KEY}`;
  },
};
