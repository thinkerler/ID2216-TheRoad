import { ProfileService } from '../../profile/model/ProfileService';
import { placesClient } from '../../shared/api/placesClient';

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

function buildOverlayLine(prefs, place) {
  const budget = prefs?.budgetPerDay ?? 200;
  const acts = prefs?.favoriteActivities ?? [];
  const love = acts.slice(0, 2).join(' & ') || 'culture & adventure';
  return `$${budget}/day · ${love} · ${place.reason}`;
}

export const DiscoverService = {
  async fetchDiscoverPage() {
    const [prefs, wishlist] = await Promise.all([
      ProfileService.fetchPreferences(),
      ProfileService.fetchWishlist(),
    ]);

    const wishlistIds = new Set(wishlist.map((w) => w.id));
    const userKw = prefs?.favoriteActivities?.slice(0, 3) ?? [];
    const budget = prefs?.budgetPerDay ?? 200;

    let rawPicks = [];
    let rawInsights = [];

    if (userKw.length > 0) {
      try {
        const [pickResults, insightResults] = await Promise.all([
          Promise.all(userKw.map((kw, i) => placesClient.searchText(kw, budget, i))),
          Promise.all(userKw.map((kw, i) => placesClient.searchText(kw, budget, i + 3))),
        ]);

        const seen = new Set();

        rawPicks = pickResults
          .flatMap((places, i) => places.map((p) => mapApiPlace(p, userKw[i])))
          .filter((p) => {
            if (seen.has(p.id) || !p.imageUrl) return false;
            seen.add(p.id);
            return true;
          })
          .slice(0, 4);

        rawInsights = insightResults
          .flatMap((places, i) => places.map((p) => mapApiPlace(p, userKw[i])))
          .filter((p) => {
            if (seen.has(p.id) || !p.imageUrl) return false;
            seen.add(p.id);
            return true;
          })
          .slice(0, 4)
          .map((p) => ({
            ...p,
            badge: p.keywords[0],
            peerNote: `Popular with ${p.keywords[0]} travelers`,
          }));
      } catch (e) {
        throw e;
      }
    }

    const topPicks = rawPicks.map((p) => ({
      ...p,
      overlayLine: buildOverlayLine(prefs, p),
      isInWishlist: wishlistIds.has(p.id),
    }));

    return { topPicks, communityInsights: rawInsights };
  },

  async fetchPlaceDetail(placeId, placeName) {
    try {
      const raw = await placesClient.getPlaceDetail(placeId);
      return mapDetail(raw);
    } catch {
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
