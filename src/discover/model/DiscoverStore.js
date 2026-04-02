import { makeAutoObservable, runInAction } from 'mobx';
import { DiscoverService } from './DiscoverService';

/**
 * DiscoverStore — Application State concern (MobX).
 *
 * Owns async status + UI state.
 * All persistence side effects must go through this store.
 */
class DiscoverStoreClass {
  /** @type {Object[]} */
  topPicks = [];

  /** @type {Object[]} */
  communityInsights = [];

  /** @type {'idle' | 'loading' | 'success' | 'error'} */
  loadStatus = 'idle';

  /** @type {string | null} */
  errorMessage = null;

  /** @type {'idle' | 'loading' | 'success' | 'error'} */
  wishToggleStatus = 'idle';

  /** @type {Object|null} — the card that was tapped */
  selectedPlace = null;

  /** @type {Object|null} — fetched API detail for selectedPlace */
  placeDetail = null;

  /** @type {'idle' | 'loading' | 'success' | 'error'} */
  detailStatus = 'idle';

  constructor() {
    makeAutoObservable(this);
  }

  async loadAll() {
    this.loadStatus = 'loading';
    this.errorMessage = null;
    try {
      const { topPicks, communityInsights } =
        await DiscoverService.fetchDiscoverPage();
      runInAction(() => {
        this.topPicks = topPicks;
        this.communityInsights = communityInsights;
        this.loadStatus = 'success';
      });
    } catch (e) {
      runInAction(() => {
        this.loadStatus = 'error';
        this.errorMessage = e.message ?? 'Failed to load discover data';
      });
    }
  }

  /** Toggle wishlist for a place in the top section; updates local isInWishlist. */
  async toggleWishlistForPlace(place) {
    const nextLiked = !place.isInWishlist;
    this.wishToggleStatus = 'loading';
    this.errorMessage = null;
    try {
      await DiscoverService.setWishlistLiked(place, nextLiked);
      runInAction(() => {
        this.topPicks = this.topPicks.map((p) =>
          p.id === place.id ? { ...p, isInWishlist: nextLiked } : p,
        );
        this.wishToggleStatus = 'idle';
      });
    } catch (e) {
      runInAction(() => {
        this.wishToggleStatus = 'idle';
        this.errorMessage = e.message ?? 'Could not update wishlist';
      });
    }
  }

  /** Open detail modal for a place; fetch API detail if available. */
  async openPlaceDetail(place) {
    this.selectedPlace = place;
    this.placeDetail = null;
    this.detailStatus = 'loading';
    const detail = await DiscoverService.fetchPlaceDetail(place.id, place.name);
    runInAction(() => {
      this.placeDetail = detail;
      this.detailStatus = 'success';
    });
  }

  closeDetail() {
    this.selectedPlace = null;
    this.placeDetail = null;
    this.detailStatus = 'idle';
  }

  /** Remove from wishlist if already saved. */
  async unlikePlace(place) {
    if (!place.isInWishlist) return;
    this.wishToggleStatus = 'loading';
    this.errorMessage = null;
    try {
      await DiscoverService.setWishlistLiked(place, false);
      runInAction(() => {
        this.topPicks = this.topPicks.map((p) =>
          p.id === place.id ? { ...p, isInWishlist: false } : p,
        );
        this.wishToggleStatus = 'idle';
      });
    } catch (e) {
      runInAction(() => {
        this.wishToggleStatus = 'idle';
        this.errorMessage = e.message ?? 'Could not update wishlist';
      });
    }
  }
}

export const discoverStore = new DiscoverStoreClass();
