/**
 * JourneysPersistence — persistence/data source for Journeys list page.
 * Uses Firebase as the single source of truth.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { auth, db, storage } from '../../shared/api/firebaseClient';
import { BgmRecommendationService } from './BgmRecommendationPersistence';
import { journeysStore } from '../model/JourneysStore';
import { ProfilePersistence } from '../../profile/persistence/ProfilePersistence';
import { placesClient } from '../../shared/api/placesClient';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1200&h=700&fit=crop';
const STORAGE_BUCKET = 'the-road-goes-ever-on.firebasestorage.app';
const PLACE_SUGGESTION_LIMIT = 10;
const MIN_DATE_YEAR = 1900;
const MAX_DATE_YEAR = 2100;
const MAX_TOTAL_SPENT = 9999999;
const MAX_DAILY_EXPENSE = 999999;
const MAX_PLACE_COUNT = 500;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function parseDateOnly(value) {
  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  if (year < MIN_DATE_YEAR || year > MAX_DATE_YEAR) {
    return null;
  }

  return date;
}

function toShortDate(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function formatTravelDates(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return '';

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth();

  if (sameYear && sameMonth) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${toShortDate(start)}-${toShortDate(end)}, ${start.getFullYear()}`;
  }

  return `${toShortDate(start)}, ${start.getFullYear()} - ${toShortDate(end)}, ${end.getFullYear()}`;
}

function durationDays(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return 1;
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / 86400000) + 1);
}

function toPositiveInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function clampBgmEnergyLevel(value, fallback = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function toNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function parseListText(input) {
  if (!input) return [];
  return String(input)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readBoundedMoney(value, label, maxValue, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  if (n > maxValue) {
    throw new Error(`${label} is too high.`);
  }
  return Math.round(n);
}

function readPlaceCount(value, fallback = 0) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Place count must be a non-negative number.');
  }
  if (n > MAX_PLACE_COUNT) {
    throw new Error('Place count is too high.');
  }
  return Math.round(n);
}

function parseDailyExpenses(input) {
  const parts = parseListText(input);
  const values = [];

  for (let i = 0; i < parts.length; i += 1) {
    const n = Number(parts[i]);
    if (!Number.isFinite(n) || n < 0) {
      throw new Error('Daily expenses must be valid non-negative numbers.');
    }
    if (n > MAX_DAILY_EXPENSE) {
      throw new Error('One daily expense is too high.');
    }
    values.push(Math.round(n));
  }

  return values;
}

function sumExpenses(values) {
  return values.reduce((sum, item) => sum + item, 0);
}

function readEnergyLevel(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 3;
  }

  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) {
    throw new Error('Energy level must be between 1 and 5.');
  }
  return Math.round(n);
}

function validateDateRange(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) {
    throw new Error('Please choose valid calendar dates between 1900-01-01 and 2100-12-31.');
  }

  if (end.getTime() < start.getTime()) {
    throw new Error('End date must be the same day or after start date.');
  }

  return { start, end };
}

function buildBgmMatchInput(source) {
  if (!source) return null;
  return {
    destination: source.destination,
    country: source.country,
    startDate: source.startDate,
    visitedLocations: source.visitedLocations,
    bgmMoodTags: source.bgmMoodTags,
    bgmActivityTags: source.bgmActivityTags,
    bgmPreferredGenres: source.bgmPreferredGenres,
    bgmCustomKeywords: source.bgmCustomKeywords,
    bgmEnergyLevel: source.bgmEnergyLevel,
  };
}

function cleanPhotoUrlList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function cleanSuggestedPlaceName(place) {
  return String(place?.displayName?.text || '').trim();
}

function uniqueNames(names) {
  const seen = new Set();
  const result = [];

  names.forEach((name) => {
    const clean = String(name || '').trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    result.push(clean);
  });

  return result;
}

async function matchBgmSafe(journeySnapshot) {
  try {
    return await BgmRecommendationService.recommendJourneyBgm(journeySnapshot);
  } catch (e) {
    console.warn('BGM match failed:', e?.message || e);
    return null;
  }
}

function normalizeJourney(raw, idOverride) {
  const id = idOverride || raw.id || `journey-${Date.now()}`;
  const destination = raw.destination || 'Untitled Journey';
  const country = raw.country || 'Unknown';
  const startDate = raw.startDate || '';
  const endDate = raw.endDate || '';
  const spent = toNonNegativeNumber(raw.spent, 0);
  const places = toPositiveInt(raw.places, 0);
  const imageUrl = raw.imageUrl || FALLBACK_IMAGE;
  const detailHeroImage = raw.detailHeroImage || imageUrl;
  const visitedLocations = Array.isArray(raw.visitedLocations)
    ? raw.visitedLocations.filter(Boolean)
    : [];
  const dailyExpenses = Array.isArray(raw.dailyExpenses)
    ? raw.dailyExpenses
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n >= 0)
    : [];
  const photoMemories = Array.isArray(raw.photoMemories)
    ? raw.photoMemories.filter(Boolean)
    : [];
  const photos = toPositiveInt(raw.photos, photoMemories.length || 0);
  const rawBgmTrack = raw?.bgmTrack || null;
  const bgmTrack = rawBgmTrack?.previewUrl
    ? rawBgmTrack
    : rawBgmTrack?.preview_url
      ? { ...rawBgmTrack, previewUrl: rawBgmTrack.preview_url }
      : null;
  const bgmMoodTags = Array.isArray(raw.bgmMoodTags)
    ? raw.bgmMoodTags.filter(Boolean)
    : [];
  const bgmActivityTags = Array.isArray(raw.bgmActivityTags)
    ? raw.bgmActivityTags.filter(Boolean)
    : [];
  const bgmPreferredGenres = Array.isArray(raw.bgmPreferredGenres)
    ? raw.bgmPreferredGenres.filter(Boolean)
    : [];
  const bgmCustomKeywords = Array.isArray(raw.bgmCustomKeywords)
    ? raw.bgmCustomKeywords.filter(Boolean)
    : [];
  const bgmEnergyLevel = clampBgmEnergyLevel(raw.bgmEnergyLevel, 3);

  return {
    id,
    destination,
    country,
    startDate,
    endDate,
    travelDates: raw.travelDates || formatTravelDates(startDate, endDate),
    durationLabel: raw.durationLabel || `${durationDays(startDate, endDate)} Days`,
    spent,
    photos,
    places,
    imageUrl,
    detailHeroImage,
    visitedLocations: visitedLocations.length ? visitedLocations : [destination],
    dailyExpenses: dailyExpenses.length ? dailyExpenses : [Math.max(0, Math.round(spent))],
    photoMemories: photoMemories.length ? photoMemories : [imageUrl],
    bgmMoodTags,
    bgmActivityTags,
    bgmPreferredGenres,
    bgmCustomKeywords,
    bgmEnergyLevel,
    bgmTrack,
  };
}

function buildCreatePayload(input) {
  const destination = String(input.destination || '').trim();
  const country = String(input.country || '').trim();
  const startDate = String(input.startDate || '').trim();
  const endDate = String(input.endDate || '').trim();
  const localPhotoUris = Array.isArray(input.localPhotoUris)
    ? input.localPhotoUris.filter(Boolean)
    : [];

  if (!destination || !country || !startDate || !endDate) {
    throw new Error('Please fill destination, country, start date and end date.');
  }

  if (!localPhotoUris.length) {
    throw new Error('Please select at least one photo from album.');
  }

  validateDateRange(startDate, endDate);

  const visitedLocations = parseListText(input.visitedLocations);
  const places = visitedLocations.length
    ? readPlaceCount(visitedLocations.length)
    : readPlaceCount(input.places, 0);
  const dailyExpenses = parseDailyExpenses(input.dailyExpenses);
  const spent = dailyExpenses.length
    ? sumExpenses(dailyExpenses)
    : readBoundedMoney(input.spent, 'Total spend', MAX_TOTAL_SPENT, 0);
  if (spent > MAX_TOTAL_SPENT) {
    throw new Error('Total spend is too high.');
  }
  const bgmMoodTags = parseListText(input.bgmMoodTags);
  const bgmActivityTags = parseListText(input.bgmActivityTags);
  const bgmPreferredGenres = parseListText(input.bgmPreferredGenres);
  const bgmCustomKeywords = parseListText(input.bgmCustomKeywords);
  const bgmEnergyLevel = readEnergyLevel(input.bgmEnergyLevel);

  return {
    destination,
    country,
    startDate,
    endDate,
    travelDates: formatTravelDates(startDate, endDate),
    durationLabel: `${durationDays(startDate, endDate)} Days`,
    spent,
    places: places || (visitedLocations.length ? visitedLocations.length : 1),
    localPhotoUris,
    visitedLocations: visitedLocations.length ? visitedLocations : [destination],
    dailyExpenses: dailyExpenses.length ? dailyExpenses : [Math.max(0, Math.round(spent))],
    bgmMoodTags,
    bgmActivityTags,
    bgmPreferredGenres,
    bgmCustomKeywords,
    bgmEnergyLevel,
  };
}

function buildUpdatePayload(input) {
  const journeyId = String(input.id || input.journeyId || '').trim();
  if (!journeyId) {
    throw new Error('Journey id is missing.');
  }

  const destination = String(input.destination || '').trim();
  const country = String(input.country || '').trim();
  const startDate = String(input.startDate || '').trim();
  const endDate = String(input.endDate || '').trim();
  const existingPhotoUrls = cleanPhotoUrlList(input.existingPhotoUrls);
  const localPhotoUris = cleanPhotoUrlList(input.localPhotoUris);

  if (!destination || !country || !startDate || !endDate) {
    throw new Error('Please fill destination, country, start date and end date.');
  }

  if (existingPhotoUrls.length + localPhotoUris.length < 1) {
    throw new Error('Please keep or select at least one photo.');
  }

  validateDateRange(startDate, endDate);

  const visitedLocations = parseListText(input.visitedLocations);
  const places = visitedLocations.length
    ? readPlaceCount(visitedLocations.length)
    : readPlaceCount(input.places, 0);
  const dailyExpenses = parseDailyExpenses(input.dailyExpenses);
  const spent = dailyExpenses.length
    ? sumExpenses(dailyExpenses)
    : readBoundedMoney(input.spent, 'Total spend', MAX_TOTAL_SPENT, 0);
  if (spent > MAX_TOTAL_SPENT) {
    throw new Error('Total spend is too high.');
  }
  const bgmMoodTags = parseListText(input.bgmMoodTags);
  const bgmActivityTags = parseListText(input.bgmActivityTags);
  const bgmPreferredGenres = parseListText(input.bgmPreferredGenres);
  const bgmCustomKeywords = parseListText(input.bgmCustomKeywords);
  const bgmEnergyLevel = readEnergyLevel(input.bgmEnergyLevel);

  return {
    id: journeyId,
    destination,
    country,
    startDate,
    endDate,
    travelDates: formatTravelDates(startDate, endDate),
    durationLabel: `${durationDays(startDate, endDate)} Days`,
    spent,
    places: places || (visitedLocations.length ? visitedLocations.length : 1),
    existingPhotoUrls,
    localPhotoUris,
    visitedLocations: visitedLocations.length ? visitedLocations : [destination],
    dailyExpenses: dailyExpenses.length ? dailyExpenses : [Math.max(0, Math.round(spent))],
    bgmMoodTags,
    bgmActivityTags,
    bgmPreferredGenres,
    bgmCustomKeywords,
    bgmEnergyLevel,
  };
}

async function ensureUid() {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

function journeysRef(uid) {
  return collection(db, `users/${uid}/journeys`);
}

async function uploadJourneyPhotos(localPhotoUris, uid) {
  const token = await auth.currentUser.getIdToken();
  const stamp = Date.now();
  const uploadedUrls = [];

  for (let i = 0; i < localPhotoUris.length; i += 1) {
    const localUri = localPhotoUris[i];
    const objectPath = `users/${uid}/journeys/${stamp}-${i}.jpg`;
    const uploadUrl =
      `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o` +
      `?uploadType=media&name=${encodeURIComponent(objectPath)}`;

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Photo upload failed: ${result.status}`);
    }

    const photoRef = ref(storage, objectPath);
    const downloadUrl = await getDownloadURL(photoRef);
    uploadedUrls.push(downloadUrl);
  }

  return uploadedUrls;
}

export const JourneysPersistence = {
  init() {
    if (journeysStore.loadStatus === 'idle') {
      this.loadJourneys();
    }
  },

  retry() {
    this.loadJourneys();
  },

  async loadJourneys() {
    journeysStore.setLoadStarted();
    try {
      const data = await this.fetchJourneys();
      journeysStore.setJourneysLoaded(data);
    } catch (e) {
      journeysStore.setLoadError(e.message || 'Failed to load journeys');
    }
  },

  async saveNewJourney(input) {
    journeysStore.setCreateStarted();
    try {
      const created = await this.createJourney(input);
      await ProfilePersistence.awardJourneyCreatedXp();
      if (Array.isArray(created?.photoMemories) && created.photoMemories.length >= 3) {
        await ProfilePersistence.awardJourneyPhotoMilestoneXp();
      }
      journeysStore.addJourney(created);
    } catch (e) {
      journeysStore.setCreateError(e.message || 'Failed to create journey');
    }
  },

  async saveJourneyUpdate(input) {
    journeysStore.setUpdateStarted();
    try {
      const updated = await this.updateJourney(input);
      await ProfilePersistence.awardJourneyEditedXp();
      if (Array.isArray(updated?.photoMemories) && updated.photoMemories.length >= 3) {
        await ProfilePersistence.awardJourneyPhotoMilestoneXp();
      }
      journeysStore.replaceJourney(updated);
    } catch (e) {
      journeysStore.setUpdateError(e.message || 'Failed to update journey');
    }
  },

  async loadBgmTrack(journeyId) {
    const targetId = String(journeyId || '').trim();
    if (!targetId || journeysStore.bgmMatchInFlight[targetId]) return;

    const target = journeysStore.journeys.find((item) => String(item.id) === targetId);
    if (!target || target?.bgmTrack?.previewUrl) return;

    journeysStore.setBgmMatchInFlight(targetId, true);

    try {
      const updated = await this.ensureBgmTrack(target);
      if (updated) {
        if (updated?.bgmTrack?.previewUrl && !target?.bgmTrack?.previewUrl) {
          await ProfilePersistence.awardJourneyBgmMatchedXp();
        }
        journeysStore.replaceJourney(updated);
      }
    } catch (e) {
      console.warn('BGM ensure failed:', e?.message || e);
    } finally {
      journeysStore.setBgmMatchInFlight(targetId, false);
    }
  },

  async loadPlaceSuggestions(destination, country) {
    const city = String(destination || '').trim();
    const nation = String(country || '').trim();

    if (!city) {
      journeysStore.clearPlaceSuggestions();
      return;
    }

    journeysStore.setPlaceSuggestionsStarted();

    try {
      const places = await this.fetchPlaceSuggestions(city, nation);
      journeysStore.setPlaceSuggestionsLoaded(places);
    } catch (e) {
      journeysStore.setPlaceSuggestionsError(e.message || 'Failed to load place suggestions');
    }
  },

  clearPlaceSuggestions() {
    journeysStore.clearPlaceSuggestions();
  },

  async fetchJourneys() {
    const resolvedUid = await ensureUid();
    const snap = await getDocs(
      query(journeysRef(resolvedUid), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => normalizeJourney(d.data(), d.id));
  },

  async fetchPlaceSuggestions(destination, country) {
    const city = String(destination || '').trim();
    const nation = String(country || '').trim();
    const locationText = nation ? `${city}, ${nation}` : city;
    const queryText = `top tourist attractions and landmarks in ${locationText}`;
    const places = await placesClient.searchPlaceNames(queryText, PLACE_SUGGESTION_LIMIT);
    const names = places.map((place) => cleanSuggestedPlaceName(place));
    return uniqueNames(names).slice(0, PLACE_SUGGESTION_LIMIT);
  },

  async createJourney(input) {
    const resolvedUid = await ensureUid();
    const payload = buildCreatePayload(input);
    const uploadedPhotoUrls = await uploadJourneyPhotos(
      payload.localPhotoUris,
      resolvedUid,
    );

    const photoMemories = uploadedPhotoUrls;
    const coverPhoto = uploadedPhotoUrls[0] || FALLBACK_IMAGE;
    const bgmTrack = await matchBgmSafe({
      destination: payload.destination,
      country: payload.country,
      startDate: payload.startDate,
      visitedLocations: payload.visitedLocations,
      bgmMoodTags: payload.bgmMoodTags,
      bgmActivityTags: payload.bgmActivityTags,
      bgmPreferredGenres: payload.bgmPreferredGenres,
      bgmCustomKeywords: payload.bgmCustomKeywords,
      bgmEnergyLevel: payload.bgmEnergyLevel,
    });

    const writePayload = {
      destination: payload.destination,
      country: payload.country,
      startDate: payload.startDate,
      endDate: payload.endDate,
      travelDates: payload.travelDates,
      durationLabel: payload.durationLabel,
      spent: payload.spent,
      photos: photoMemories.length,
      places: payload.places,
      imageUrl: coverPhoto,
      detailHeroImage: coverPhoto,
      visitedLocations: payload.visitedLocations,
      dailyExpenses: payload.dailyExpenses,
      photoMemories,
      bgmMoodTags: payload.bgmMoodTags,
      bgmActivityTags: payload.bgmActivityTags,
      bgmPreferredGenres: payload.bgmPreferredGenres,
      bgmCustomKeywords: payload.bgmCustomKeywords,
      bgmEnergyLevel: payload.bgmEnergyLevel,
      bgmTrack: bgmTrack || null,
    };

    const docRef = await addDoc(journeysRef(resolvedUid), {
      ...writePayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return normalizeJourney(writePayload, docRef.id);
  },

  async updateJourney(input) {
    const resolvedUid = await ensureUid();
    const payload = buildUpdatePayload(input);
    const uploadedPhotoUrls = payload.localPhotoUris.length
      ? await uploadJourneyPhotos(payload.localPhotoUris, resolvedUid)
      : [];

    const photoMemories = [...payload.existingPhotoUrls, ...uploadedPhotoUrls];
    const coverPhoto = photoMemories[0] || FALLBACK_IMAGE;
    const bgmTrack = await matchBgmSafe({
      destination: payload.destination,
      country: payload.country,
      startDate: payload.startDate,
      visitedLocations: payload.visitedLocations,
      bgmMoodTags: payload.bgmMoodTags,
      bgmActivityTags: payload.bgmActivityTags,
      bgmPreferredGenres: payload.bgmPreferredGenres,
      bgmCustomKeywords: payload.bgmCustomKeywords,
      bgmEnergyLevel: payload.bgmEnergyLevel,
    });

    const writePayload = {
      destination: payload.destination,
      country: payload.country,
      startDate: payload.startDate,
      endDate: payload.endDate,
      travelDates: payload.travelDates,
      durationLabel: payload.durationLabel,
      spent: payload.spent,
      photos: photoMemories.length,
      places: payload.places,
      imageUrl: coverPhoto,
      detailHeroImage: coverPhoto,
      visitedLocations: payload.visitedLocations,
      dailyExpenses: payload.dailyExpenses,
      photoMemories,
      bgmMoodTags: payload.bgmMoodTags,
      bgmActivityTags: payload.bgmActivityTags,
      bgmPreferredGenres: payload.bgmPreferredGenres,
      bgmCustomKeywords: payload.bgmCustomKeywords,
      bgmEnergyLevel: payload.bgmEnergyLevel,
      bgmTrack: bgmTrack || null,
    };

    const refDoc = doc(db, `users/${resolvedUid}/journeys/${payload.id}`);
    await setDoc(
      refDoc,
      {
        ...writePayload,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return normalizeJourney(writePayload, payload.id);
  },

  async ensureBgmTrack(journey) {
    const journeyId = String(journey?.id || journey?.journeyId || '').trim();
    if (!journeyId) return null;
    if (journey?.bgmTrack?.previewUrl) return journey;

    const matchInput = buildBgmMatchInput(journey);
    if (!matchInput) return journey;

    const bgmTrack = await matchBgmSafe(matchInput);
    if (!bgmTrack) return journey;

    const resolvedUid = await ensureUid();
    const refDoc = doc(db, `users/${resolvedUid}/journeys/${journeyId}`);
    await setDoc(
      refDoc,
      {
        bgmTrack,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return normalizeJourney({ ...journey, bgmTrack }, journeyId);
  },
};
