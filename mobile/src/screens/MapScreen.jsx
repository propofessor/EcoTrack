/**
 * MapScreen — RF8
 * Leaflet (OpenStreetMap) map with mutually-exclusive air-pollution / noise-pollution overlays.
 * RF8.1: integrates Leaflet via WebView.
 * RF8.2/8.3: air and noise overlays rendered as Leaflet.heat heatmap.
 * RF8.4: only one overlay active at a time.
 * RF8.5: colour legend.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, useColorScheme } from 'react-native';
import PlatformWebView from '../components/PlatformWebView';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import client from '../api/client';
import { MapPin } from 'lucide-react-native';

const OVERLAY = { NONE: 'none', AIR: 'air', NOISE: 'noise' };

const TRENTO = { lat: 46.0748, lng: 11.1217, zoom: 13 };

// Leaflet.heat gradient format: { stop: 'color' }.
// Opaque colour stops starting low on the scale so even light pollution reads
// clearly on the map (the previous gradient faded to transparent at low values).
const AIR_GRADIENT = { 0.2: 'rgba(0,200,83,0.6)', 0.45: 'rgba(255,214,0,0.75)', 0.7: 'rgba(255,109,0,0.88)', 1.0: 'rgba(213,0,0,0.95)' };
const NOISE_GRADIENT = { 0.2: 'rgba(41,98,255,0.6)', 0.45: 'rgba(0,191,165,0.75)', 0.7: 'rgba(255,145,0,0.88)', 1.0: 'rgba(213,0,0,0.95)' };

// Solid legend swatches (low → high), mirroring the heatmap gradients.
const AIR_LEGEND = ['#00c853', '#ffd600', '#ff6d00', '#d50000'];
const NOISE_LEGEND = ['#2962ff', '#00bfa5', '#ff9100', '#d50000'];

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    .leaflet-control-attribution { font-size: 8px; }
    .leaflet-bottom.leaflet-left { margin-bottom: 12px; margin-left: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${TRENTO.lat}, ${TRENTO.lng}], ${TRENTO.zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    var heatLayer = null;
    var routeLayer = null;

    function updateHeatmap(points, gradient) {
      if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
      if (points && points.length > 0) {
        heatLayer = L.heatLayer(points, {
          radius: 38,
          blur: 18,
          minOpacity: 0.45,
          gradient: gradient,
          max: 1.0
        }).addTo(map);
      }
    }

    // RF9.5: draw a route polyline on the map
    function drawPolyline(latlngs, color) {
      if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
      if (latlngs && latlngs.length > 1) {
        routeLayer = L.polyline(latlngs, { color: color || '#2563EB', weight: 5, opacity: 0.85 }).addTo(map);
        map.fitBounds(routeLayer.getBounds(), { padding: [40, 40] });
      }
    }

    function handleMessage(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'heatmap') {
          updateHeatmap(msg.points, msg.gradient);
        } else if (msg.type === 'panTo') {
          map.setView([msg.lat, msg.lng], msg.zoom || map.getZoom());
        } else if (msg.type === 'polyline') {
          drawPolyline(msg.latlngs, msg.color);
        }
      } catch (e) {}
    }

    // Both listeners needed: document for Android, window for iOS
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  </script>
</body>
</html>`;

export default function MapScreen({ route: navRoute }) {
  const { t } = useTranslation();
  const webViewRef = useRef(null);
  const scheme = useColorScheme();
  const iconColor = scheme === 'dark' ? '#f4f4f5' : '#09090b';
  const [overlay, setOverlay] = useState(OVERLAY.NONE);
  const [loading, setLoading] = useState(false);
  const routePolyline = navRoute?.params?.polyline ?? null;

  function sendPolyline(latlngs) {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'polyline', latlngs, color: '#2563EB' })
    );
  }

  async function locateMe() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('map.locationDenied'), t('map.locationDeniedMsg'));
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'panTo', lat: loc.coords.latitude, lng: loc.coords.longitude, zoom: 15 })
    );
  }

  useEffect(() => {
    if (overlay === OVERLAY.NONE) {
      webViewRef.current?.postMessage(JSON.stringify({ type: 'heatmap', points: [], gradient: {} }));
      return;
    }
    setLoading(true);
    client
      .get('/maps/heatmap', { params: { type: overlay } })
      .then((res) => {
        const raw = res.data?.points || [];
        // Transform {latitude, longitude, weight} → [lat, lng, intensity] for Leaflet.heat
        const pts = raw.map((p) => [p.latitude, p.longitude, p.weight ?? 1]);
        const gradient = overlay === OVERLAY.AIR ? AIR_GRADIENT : NOISE_GRADIENT;
        webViewRef.current?.postMessage(JSON.stringify({ type: 'heatmap', points: pts, gradient }));
      })
      .catch(() =>
        webViewRef.current?.postMessage(JSON.stringify({ type: 'heatmap', points: [], gradient: {} }))
      )
      .finally(() => setLoading(false));
  }, [overlay]);

  function toggleOverlay(type) {
    setOverlay((prev) => (prev === type ? OVERLAY.NONE : type));
  }

  return (
    <View className="flex-1">
      <PlatformWebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        onLoadEnd={() => {
          if (routePolyline) {
            sendPolyline(routePolyline);
          }
        }}
      />

      {/* RF8.4: Layer toggle controls — floating top-right card */}
      <View
        className="card absolute top-16 right-4 rounded-xl"
        style={{ minWidth: 110, padding: 8, gap: 4 }}
      >
        <View className="flex-row items-center justify-between gap-2">
          <Text style={{ fontSize: 13, fontWeight: '500', color: scheme === 'dark' ? '#a1a1aa' : '#71717a' }}>{t('map.air')}</Text>
          <Switch
            value={overlay === OVERLAY.AIR}
            onValueChange={() => toggleOverlay(OVERLAY.AIR)}
            trackColor={{ false: '#3f3f46', true: '#8ab834' }}
            thumbColor="#ffffff"
          />
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <Text style={{ fontSize: 13, fontWeight: '500', color: scheme === 'dark' ? '#a1a1aa' : '#71717a' }}>{t('map.noise')}</Text>
          <Switch
            value={overlay === OVERLAY.NOISE}
            onValueChange={() => toggleOverlay(OVERLAY.NOISE)}
            trackColor={{ false: '#3f3f46', true: '#8ab834' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* RF8.5: Colour legend — anchored to bottom */}
      {overlay !== OVERLAY.NONE && (
        <View className="card absolute bottom-0 left-0 right-0 px-4 py-3 gap-2">
          <Text className="text-label">{overlay === OVERLAY.AIR ? t('map.airQuality') : t('map.noiseLevel')}</Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-muted">{t('map.low')}</Text>
            <View className="flex-1 h-3 rounded-full overflow-hidden flex-row">
              {(overlay === OVERLAY.AIR ? AIR_LEGEND : NOISE_LEGEND).map((color, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: color }} />
              ))}
            </View>
            <Text className="text-muted">{t('map.high')}</Text>
          </View>
        </View>
      )}

      {/* Locate-me button */}
      <TouchableOpacity
        className="card absolute bottom-24 right-4 rounded-full p-3"
        onPress={locateMe}
      >
        <MapPin size={22} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
}
