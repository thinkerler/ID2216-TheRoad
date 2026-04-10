import { discoverStore } from '../model/DiscoverStore';

export const DiscoverPresenter = {
  init() {
    discoverStore.init();
  },

  reload() {
    discoverStore.loadAll();
  },

  onToggleWishlist(place) {
    discoverStore.setWishlistLiked(place, !place.isInWishlist);
  },

  onUnlikePlace(place) {
    discoverStore.setWishlistLiked(place, false);
  },

  getLoadStatus() {
    return discoverStore.loadStatus;
  },

  getErrorMessage() {
    return discoverStore.errorMessage;
  },

  getTopPicks() {
    return discoverStore.topPicks.map((place) => ({
      ...place,
      heartIconName: place.isInWishlist ? 'heart' : 'heart-outline',
      heartActive: !!place.isInWishlist,
    }));
  },

  getCommunityInsights() {
    return discoverStore.communityInsights;
  },

  getWishToggleStatus() {
    return discoverStore.wishToggleStatus;
  },

  onPlacePress(place) {
    discoverStore.openPlaceDetail(place);
  },

  onCloseDetail() {
    discoverStore.closeDetail();
  },

  getSelectedPlace() {
    const p = discoverStore.selectedPlace;
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      country: p.country,
      imageUrl: p.imageUrl,
      whyVisit: p.reason ?? null,
    };
  },

  getPlaceDetail() {
    return discoverStore.placeDetail;
  },

  getDetailStatus() {
    return discoverStore.detailStatus;
  },
};
