/**
 * MapScreen — RF8
 * Google Maps with mutually-exclusive air-pollution / noise-pollution overlays.
 * RF8.1: integrates Google Maps.
 * RF8.2/8.3: air and noise overlays rendered as weighted heatmap points.
 * RF8.4: only one overlay active at a time.
 * RF8.5: colour legend.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import client from '../api/client';

const OVERLAY = { NONE: 'none', AIR: 'air', NOISE: 'noise' };

const AIR_GRADIENT = {
  colors: ['rgba(0,255,0,0)', 'rgba(255,255,0,0.6)', 'rgba(255,0,0,0.9)'],
  startPoints: [0, 0.4, 1],
  colorMapSize: 256,
};

const NOISE_GRADIENT = {
  colors: ['rgba(0,0,255,0)', 'rgba(255,165,0,0.6)', 'rgba(255,0,0,0.9)'],
  startPoints: [0, 0.4, 1],
  colorMapSize: 256,
};

const TRENTO_REGION = {
  latitude: 46.0748,
  longitude: 11.1217,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(TRENTO_REGION);
  const [overlay, setOverlay] = useState(OVERLAY.NONE);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  async function locateMe() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Abilita la geolocalizzazione nelle impostazioni.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const next = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 600);
  }

  useEffect(() => {
    if (overlay === OVERLAY.NONE) {
      setHeatmapPoints([]);
      return;
    }
    setLoading(true);
    client
      .get('/maps/heatmap', { params: { type: overlay } })
      .then((res) => setHeatmapPoints(res.data?.points || []))
      .catch(() => setHeatmapPoints([]))
      .finally(() => setLoading(false));
  }, [overlay]);

  function toggleOverlay(type) {
    setOverlay((prev) => (prev === type ? OVERLAY.NONE : type));
  }

  const gradient = overlay === OVERLAY.AIR ? AIR_GRADIENT : NOISE_GRADIENT;

  return (
    <View className="flex-1">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={TRENTO_REGION}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {overlay !== OVERLAY.NONE && heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={40}
            opacity={0.75}
            gradient={gradient}
          />
        )}
      </MapView>

      {/* RF8.4: Layer toggle controls — floating top-right card */}
      <SafeAreaView
        className="absolute top-16 right-4 rounded-2xl p-3 gap-2"
        style={{ minWidth: 120 }}
      >
        <View className="flex-row items-center justify-between gap-2">
          <Text>Aria</Text>
          <Switch
            value={overlay === OVERLAY.AIR}
            onValueChange={() => toggleOverlay(OVERLAY.AIR)}
          />
        </View>
        <View className="flex-row items-center justify-between gap-2">
          <Text>Rumore</Text>
          <Switch
            value={overlay === OVERLAY.NOISE}
            onValueChange={() => toggleOverlay(OVERLAY.NOISE)}
          />
        </View>
        {loading && <Text>Caricamento…</Text>}
      </SafeAreaView>

      {/* RF8.5: Colour legend — anchored to bottom */}
      {overlay !== OVERLAY.NONE && (
        <View className="absolute bottom-0 left-0 right-0 flex-row items-center px-4 py-3 gap-3">
          <Text>{overlay === OVERLAY.AIR ? 'Qualità aria' : 'Rumore (dB)'}</Text>
          <View className="flex-1 h-3 rounded-full" />
          <Text>Basso</Text>
          <Text>Alto</Text>
        </View>
      )}

      {/* Locate-me button */}
      <TouchableOpacity
        className="absolute bottom-24 right-4 rounded-full p-3"
        onPress={locateMe}
      >
        <Text>📍</Text>
      </TouchableOpacity>
    </View>
  );
}
