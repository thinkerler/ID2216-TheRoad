const appJson = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

module.exports = {
  expo: {
    ...appJson.expo,
    newArchEnabled: true,
    android: {
      ...appJson.expo.android,
      package: appJson.expo.android?.package || 'com.kth.theroadgoeseveron',
      config: {
        ...appJson.expo.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: [
      ...(appJson.expo.plugins || []),
      [
        './plugins/withGoogleMapsApiKey',
        { apiKey: googleMapsApiKey },
      ],
    ],
    extra: {
      ...appJson.expo?.extra,
      eas: {
        projectId: 'f0ac63ea-687d-4156-93b9-325d1cac87a3',
      },
    },
  },
};
