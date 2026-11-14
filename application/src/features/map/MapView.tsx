import React, { useMemo, useState } from 'react';
import { StyleSheet, Text as RNText, View as RNView } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  lat: number;
  lon: number;
  name: string;
  layer: 'imerg' | 'ndvi';
  date: string;
};

const LAYERS = {
  imerg: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
    maxZoom: 6,
    label: 'IMERG',
  },
  ndvi: {
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_L3_NDVI_Monthly/default/{date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png',
    maxZoom: 7,
    label: 'NDVI',
  },
};

export function MapView({ lat, lon, name, layer, date }: Props) {
  const [failed, setFailed] = useState(false);
  const config = LAYERS[layer];
  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;background:#e9e7df}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lon}], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    L.tileLayer(${JSON.stringify(config.url.replace('{date}', date))}, {
      maxZoom: ${config.maxZoom},
      opacity: 0.72,
      attribution: 'NASA GIBS'
    }).addTo(map);
    L.marker([${lat}, ${lon}]).addTo(map).bindPopup(${JSON.stringify(name)});
  </script>
</body>
</html>`,
    [lat, lon, name, date, config.url, config.maxZoom],
  );

  if (failed) {
    return (
      <RNView style={styles.fallback} testID="map.fallback">
        <RNView style={styles.dot} />
        <RNView>
          <RNText style={styles.title}>Mapa no disponible</RNText>
          <RNText style={styles.subtitle}>
            Parcela en {lat.toFixed(3)}, {lon.toFixed(3)}. Revisá la red o la capa.
          </RNText>
        </RNView>
      </RNView>
    );
  }

  return (
    <WebView
      testID="map.webview"
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      source={{ html }}
      style={styles.webview}
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
      startInLoadingState
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, minHeight: 280, borderRadius: 12, overflow: 'hidden' },
  fallback: {
    minHeight: 180,
    backgroundColor: '#EEECE5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1B5E20' },
  title: { fontSize: 16, fontWeight: '600', color: '#1C1B1F' },
  subtitle: { fontSize: 13, color: '#5F6368', marginTop: 4 },
});
