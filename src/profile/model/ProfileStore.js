import { makeAutoObservable, runInAction } from 'mobx';
import { ProfileService } from './ProfileService';

class ProfileStoreClass {
  profile = null;

  wishlist = [];

  preferences = null;

  loadStatus = 'idle';

  exportStatus = 'idle';

  errorMessage = null;

  avatarUploadStatus = 'idle';

  constructor() {
    makeAutoObservable(this);
  }

  init() {
    if (this.loadStatus === 'idle') {
      this.loadAll();
    }
  }

  async loadAll() {
    this.loadStatus = 'loading';
    this.errorMessage = null;

    try {
      const [profile, wishlist, preferences] = await Promise.all([
        ProfileService.fetchProfile(),
        ProfileService.fetchWishlist(),
        ProfileService.fetchPreferences(),
      ]);

      runInAction(() => {
        this.profile = profile;
        this.wishlist = wishlist;
        this.preferences = preferences;
        this.loadStatus = 'success';
      });
    } catch (e) {
      runInAction(() => {
        this.loadStatus = 'error';
        this.errorMessage = e.message ?? 'Failed to load profile';
      });
    }
  }

  async updatePreferences(newPrefs) {
    try {
      await ProfileService.savePreferences(newPrefs);
      runInAction(() => {
        this.preferences = { ...this.preferences, ...newPrefs };
      });
    } catch (e) {
      runInAction(() => {
        this.errorMessage = e.message ?? 'Failed to save preferences';
      });
    }
  }

  async updateBudgetPerDay(budgetPerDay) {
    if (!this.preferences) return;
    const nextBudget = Number(budgetPerDay);
    if (!Number.isFinite(nextBudget) || nextBudget <= 0) return;

    await this.updatePreferences({ budgetPerDay: Math.round(nextBudget) });
  }

  async uploadAvatar(localUri) {
    this.avatarUploadStatus = 'loading';
    this.errorMessage = null;
    try {
      const nextProfile = await ProfileService.uploadAvatar(localUri);
      runInAction(() => {
        this.profile = nextProfile;
        this.avatarUploadStatus = 'success';
      });
    } catch (e) {
      runInAction(() => {
        this.avatarUploadStatus = 'error';
        this.errorMessage = e.message ?? 'Failed to upload avatar';
      });
    }
  }

  async exportData() {
    this.exportStatus = 'loading';

    try {
      await ProfileService.exportUserData();
      runInAction(() => {
        this.exportStatus = 'success';
      });
    } catch (e) {
      runInAction(() => {
        this.exportStatus = 'error';
        this.errorMessage = e.message ?? 'Export failed';
      });
    }
  }
}

export const profileStore = new ProfileStoreClass();
