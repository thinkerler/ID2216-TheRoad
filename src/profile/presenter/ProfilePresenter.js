import { profileStore } from '../model/ProfileStore';

export const ProfilePresenter = {
  init() {
    profileStore.init();
  },

  reload() {
    profileStore.loadAll();
  },

  getLoadStatus() {
    return profileStore.loadStatus;
  },

  getErrorMessage() {
    return profileStore.errorMessage;
  },

  getProfile() {
    const p = profileStore.profile;
    if (!p) return null;
    return {
      ...p,
      badgeLabelText: `${p.badgeLabel} Level ${p.badgeLevel}`,
    };
  },

  getWishlist() {
    return profileStore.wishlist;
  },

  getPreferences() {
    return profileStore.preferences;
  },

  getExportStatus() {
    return profileStore.exportStatus;
  },

  onExportData() {
    profileStore.exportData();
  },

  onUpdatePreferences(newPrefs) {
    profileStore.updatePreferences(newPrefs);
  },

  onUpdateBudgetPerDay(budgetPerDay) {
    profileStore.updateBudgetPerDay(budgetPerDay);
  },

  onUploadAvatar(localUri) {
    profileStore.uploadAvatar(localUri);
  },

  getAvatarUploadStatus() {
    return profileStore.avatarUploadStatus;
  },
};
