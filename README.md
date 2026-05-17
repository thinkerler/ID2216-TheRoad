# The Road Goes Ever On

The Road Goes Ever On is a mobile travel diary and inspiration app built with Expo, React Native, Expo Router, and MobX with action.

The app has four main tabs:

- `Hub`: shows the user's journeys on a map, with time filtering and travel statistics.
- `Journeys`: lets users create, edit, view, and replay trip memories with photos, daily expenses, visited places, and BGM.
- `Discover`: recommends destinations from the user's travel style, past journeys, wishlist, and community journey data.
- `Profile`: shows profile data, wishlist, travel style, spending overview, XP level, tasks, avatar upload, and sign out.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
EXPO_PUBLIC_PLACES_API_KEY=your_google_places_key
EXPO_PUBLIC_JAMENDO_CLIENT_ID=your_jamendo_client_id
```

Start the app:

```bash
npm run dev
```

You can also run:

```bash
npx expo start
```

For Android APK builds:

```bash
eas build --platform android --profile preview
```

## Notes

- Firebase config is already in `src/shared/api/firebaseClient.js`.
- Google Maps native map needs `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Google Places search, place detail, photos, and geocoding need `EXPO_PUBLIC_PLACES_API_KEY`.
- Jamendo BGM matching needs `EXPO_PUBLIC_JAMENDO_CLIENT_ID`.
- Expo Go cannot show the full native map from `react-native-maps`, so Hub uses a simple fallback there. Use a development build or APK to test the native map.

## Main Structure

```text
src/
  app/          Expo Router pages and tab layout
  auth/         login/register flow
  hub/          map dashboard, time filter, stats
  journeys/    journey list, detail, create/edit, photos, BGM
  discover/    recommendations, community insights, place detail
  profile/     profile, wishlist, preferences, XP/tasks
  shared/      Firebase/Places clients, theme, shared UI
```

Each feature follows the same simple MVP style:

- `model`: MobX stores and plain data helpers
- `view`: React Native UI components
- `presenter`: passes state and events between store and view
- `persistence`: Firebase/API/file/audio side effects

## Third Party Components and Services

User-visible third party components used in the code:

- `react-native-maps`: native Hub map on Android/development builds.
- Leaflet with CARTO/OpenStreetMap map tiles: web Hub map in `GlobeMap.web.jsx`.
- `@react-native-community/datetimepicker`: calendar picker in the journey create/edit modal.
- `react-native-gesture-handler`: Hub screen gesture root.
- `react-native-safe-area-context`: safe area layout.

External APIs/services used:

- Google Maps Android SDK: native map display.
- Google Places API: destination recommendations, place details, photos, place suggestions, and geocoding.
- Jamendo API: BGM recommendation and preview tracks.

## Course

Project for KTH ID2216.
