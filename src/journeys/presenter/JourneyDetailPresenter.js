import { journeysStore } from '../model/JourneysStore';

export const JourneyDetailPresenter = {
  init() {
    journeysStore.init();
  },

  reload() {
    journeysStore.retry();
  },

  getLoadStatus() {
    return journeysStore.loadStatus;
  },

  getErrorMessage() {
    return journeysStore.errorMessage;
  },

  getJourneyById(journeyId) {
    if (!journeyId) return null;
    const raw = journeysStore.journeys.find((item) => item.id === journeyId);
    if (!raw) return null;

    return {
      ...raw,
      spentLabel: `$${raw.spent.toLocaleString()}`,
    };
  },
};
