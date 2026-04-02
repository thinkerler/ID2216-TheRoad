/**
 * DiscoverService — Persistence concern.
 *
 * Orchestrates data for the Discover tab:
 *   - Reads user prefs + wishlist from ProfileService
 *   - Fetches keyword + budget matched destinations via placesClient
 *   - Falls back to mock data when API key is absent or call fails
 */

import { ProfileService } from '../../profile/model/ProfileService';
import { placesClient } from '../../shared/api/placesClient';

// ─── Fallback mock data ───────────────────────────────────────────────────────

const MOCK_COMMUNITY_INSIGHTS = [
  {
    id: 'c-ubud',
    name: 'Ubud Rice Terraces',
    country: 'Bali, Indonesia',
    imageUrl:
      'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=600&h=400&fit=crop',
    badge: 'Hidden Gem',
    peerNote: 'Popular with travelers who share your tags',
  },
  {
    id: 'c-torres',
    name: 'Torres del Paine',
    country: 'Patagonia, Chile',
    imageUrl:
      'https://images.unsplash.com/photo-1518182170307-1e16b6c00ae2?w=600&h=400&fit=crop',
    badge: 'Trending',
    peerNote: 'Often wishlisted after similar trips',
  },
  {
    id: 'c-santorini',
    name: 'Oia',
    country: 'Santorini, Greece',
    imageUrl:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&h=400&fit=crop',
    badge: 'Photo spot',
    peerNote: 'High overlap with your wishlist style',
  },
];

const MOCK_TOP_PICKS = [
  {
    id: 'disc-kyoto',
    name: 'Kyoto',
    country: 'Japan',
    imageUrl:
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop',
    reason: 'Matches your Culture & Nature interests',
    keywords: ['Culture', 'Nature', 'Food'],
  },
  {
    id: 'disc-lisbon',
    name: 'Lisbon',
    country: 'Portugal',
    imageUrl:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=600&h=400&fit=crop',
    reason: 'Popular with travelers who like Food & Photography',
    keywords: ['Food', 'Photography', 'Culture'],
  },
  {
    id: 'disc-queenstown',
    name: 'Queenstown',
    country: 'New Zealand',
    imageUrl:
      'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop',
    reason: 'Adventure overlap with your profile',
    keywords: ['Adventure', 'Nature', 'Photography'],
  },
  {
    id: 'disc-reykjavik',
    name: 'Reykjavík',
    country: 'Iceland',
    imageUrl:
      'https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=600&h=400&fit=crop',
    reason: 'Nature & Photography match',
    keywords: ['Nature', 'Photography', 'Adventure'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a raw Places API result to the internal place shape. */
function mapApiPlace(place, keyword) {
  return {
    id: place.id,
    name: place.displayName?.text ?? 'Unknown',
    country: place.shortFormattedAddress ?? '',
    imageUrl: place.photos?.[0] ? placesClient.photoUrl(place.photos[0].name) : null,
    reason: place.editorialSummary?.text ?? `Top ${keyword} destination`,
    keywords: [keyword],
  };
}

/** Map a raw Places API detail response to the internal detail shape. */
function mapDetail(raw) {
  return {
    name: raw.displayName?.text ?? '',
    address: raw.shortFormattedAddress ?? '',
    description: raw.editorialSummary?.text ?? null,
    rating: raw.rating ?? null,
    ratingCount: raw.userRatingCount ?? null,
    website: raw.websiteUri ?? null,
    openingHours: raw.regularOpeningHours?.weekdayDescriptions ?? null,
  };
}

/** Personalised overlay line shown on the hero card. */
function buildOverlayLine(prefs, place) {
  const budget = prefs?.budgetPerDay ?? 200;
  const acts = prefs?.favoriteActivities ?? [];
  const love = acts.slice(0, 2).join(' & ') || 'culture & adventure';
  return `$${budget}/day · ${love} · ${place.reason}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const DiscoverService = {
  /**
   * Fetch personalised top picks using the user's favoriteActivities as keywords
   * and budgetPerDay to shape the query. Each keyword searches a different world
   * region to guarantee geographic diversity.
   *
   * @returns {Promise<{ topPicks: Object[], communityInsights: Object[] }>}
   */
  async fetchDiscoverPage() {
    const [prefs, wishlist] = await Promise.all([
      ProfileService.fetchPreferences(),
      ProfileService.fetchWishlist(),
    ]);

    const wishlistIds = new Set(wishlist.map((w) => w.id));
    const userKw = prefs?.favoriteActivities?.slice(0, 3) ?? [];
    const budget = prefs?.budgetPerDay ?? 200;

    let rawPicks = MOCK_TOP_PICKS;
    let rawInsights = MOCK_COMMUNITY_INSIGHTS;

    if (userKw.length > 0) {
      try {
        // Top picks: keywords × regions 0-2 (Asia, Europe, South America)
        // Community insights: same keywords × regions 3-4 (Middle East, Oceania)
        // → guaranteed global diversity and no overlap between sections
        const [pickResults, insightResults] = await Promise.all([
          Promise.all(userKw.map((kw, i) => placesClient.searchText(kw, budget, i))),
          Promise.all(userKw.map((kw, i) => placesClient.searchText(kw, budget, i + 3))),
        ]);

        const seen = new Set();

        const picks = pickResults
          .flatMap((places, i) => places.map((p) => mapApiPlace(p, userKw[i])))
          .filter((p) => {
            if (seen.has(p.id) || !p.imageUrl) return false;
            seen.add(p.id);
            return true;
          })
          .slice(0, 4);

        const insights = insightResults
          .flatMap((places, i) => places.map((p) => mapApiPlace(p, userKw[i])))
          .filter((p) => {
            if (seen.has(p.id) || !p.imageUrl) return false;
            seen.add(p.id);
            return true;
          })
          .slice(0, 4)
          .map((p) => ({ ...p, badge: p.keywords[0], peerNote: `Popular with ${p.keywords[0]} travelers` }));

        if (picks.length > 0) rawPicks = picks;
        if (insights.length > 0) rawInsights = insights;
      } catch (e) {
        console.warn('Places API failed, using mock data:', e.message);
      }
    }

    const topPicks = rawPicks.map((p) => ({
      ...p,
      overlayLine: buildOverlayLine(prefs, p),
      isInWishlist: wishlistIds.has(p.id),
    }));

    return { topPicks, communityInsights: rawInsights };
  },

  /**
   * Fetch full place detail for the detail modal.
   * First tries direct ID lookup (works for API places).
   * Falls back to name search (handles mock community insight items).
   *
   * @param {string} placeId
   * @param {string} placeName  fallback search term if ID lookup fails
   * @returns {Promise<Object|null>}
   */
  async fetchPlaceDetail(placeId, placeName) {
    try {
      const raw = await placesClient.getPlaceDetail(placeId);
      return mapDetail(raw);
    } catch {
      // Mock IDs (e.g. 'c-ubud') are not real Places IDs — search by name instead
      if (!placeName) return null;
      try {
        const found = await placesClient.searchByName(placeName);
        if (!found) return null;
        const raw = await placesClient.getPlaceDetail(found.id);
        return mapDetail(raw);
      } catch {
        return null;
      }
    }
  },

  /** @returns {Promise<void>} */
  async setWishlistLiked(place, liked) {
    if (liked) {
      await ProfileService.addWishlistItem({
        id: place.id,
        name: place.name,
        imageUrl: place.imageUrl,
        keywords: place.keywords ?? [],
      });
    } else {
      await ProfileService.removeWishlistItem(place.id);
    }
  },
};
