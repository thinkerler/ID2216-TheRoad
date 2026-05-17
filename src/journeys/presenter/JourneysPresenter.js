import React from 'react';
import { observer } from 'mobx-react-lite';
import { journeysStore } from '../model/JourneysStore';
import { JourneysPersistence } from '../persistence/JourneysPersistence';
import { JourneysScreen } from '../view/JourneysScreen';

const JourneysPresenter = {
  init() {
    JourneysPersistence.init();
  },

  reload() {
    JourneysPersistence.retry();
  },

  onCreateJourney(input) {
    JourneysPersistence.saveNewJourney(input);
  },

  onLoadPlaceSuggestions(destination, country) {
    JourneysPersistence.loadPlaceSuggestions(destination, country);
  },

  onClearPlaceSuggestions() {
    JourneysPersistence.clearPlaceSuggestions();
  },

  resetCreateState() {
    journeysStore.resetCreateState();
  },

  getLoadStatus() {
    return journeysStore.loadStatus;
  },

  getErrorMessage() {
    return journeysStore.errorMessage;
  },

  getCreateStatus() {
    return journeysStore.createStatus;
  },

  getCreateErrorMessage() {
    return journeysStore.createErrorMessage;
  },

  getPlaceSuggestions() {
    return journeysStore.placeSuggestions.slice();
  },

  getPlaceSuggestionsStatus() {
    return journeysStore.placeSuggestionsStatus;
  },

  getPlaceSuggestionsErrorMessage() {
    return journeysStore.placeSuggestionsErrorMessage;
  },

  getJourneys() {
    return journeysStore.journeys.map((item) => ({
      ...item,
      spentLabel: `$${item.spent.toLocaleString()}`,
    }));
  },
};

const journeysPresenterProps = {
  onInit: () => JourneysPresenter.init(),
  onReload: () => JourneysPresenter.reload(),
  onCreateJourney: (input) => JourneysPresenter.onCreateJourney(input),
  onLoadPlaceSuggestions: (destination, country) =>
    JourneysPresenter.onLoadPlaceSuggestions(destination, country),
  onClearPlaceSuggestions: () => JourneysPresenter.onClearPlaceSuggestions(),
  onResetCreateState: () => JourneysPresenter.resetCreateState(),
};

function JourneysPresenterView() {
  const props = {
    loadStatus: JourneysPresenter.getLoadStatus(),
    errorMessage: JourneysPresenter.getErrorMessage(),
    createStatus: JourneysPresenter.getCreateStatus(),
    createErrorMessage: JourneysPresenter.getCreateErrorMessage(),
    placeSuggestions: JourneysPresenter.getPlaceSuggestions(),
    placeSuggestionsStatus: JourneysPresenter.getPlaceSuggestionsStatus(),
    placeSuggestionsErrorMessage: JourneysPresenter.getPlaceSuggestionsErrorMessage(),
    journeys: JourneysPresenter.getJourneys(),
    ...journeysPresenterProps,
  };

  return <JourneysScreen {...props} />;
}

export default observer(JourneysPresenterView);
