import * as Cesium from 'cesium';

/**
 * Camera presets for notable locations.
 * Phase 1 default: fly to Austin, TX on load.
 */
export const CAMERA_PRESETS = {
  austin: {
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 800),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0.0,
    },
  },
  sf: {
    destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 1000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
  nyc: {
    destination: Cesium.Cartesian3.fromDegrees(-73.9857, 40.7484, 1200),
    orientation: {
      heading: Cesium.Math.toRadians(-20),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
};

/**
 * Fly the camera to a preset location with a smooth animation.
 */
export function flyToPreset(viewer, presetName, duration = 3.0) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  viewer.camera.flyTo({
    destination: preset.destination,
    orientation: preset.orientation,
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

/**
 * Set camera to Austin on load with a cinematic fly-in.
 */
export function flyToAustin(viewer) {
  // Start from a high altitude, then fly down
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 25000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  // Cinematic fly-in after a brief pause
  setTimeout(() => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 600),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0.0,
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 500);
}

/**
 * Fly the camera to explicit coordinates with a cinematic descending approach.
 */
export function flyToCoordinates(viewer, lon, lat, alt = 1200, duration = 3.5) {
  if (!viewer?.camera) return;
  const targetLon = Number(lon);
  const targetLat = Number(lat);
  if (!Number.isFinite(targetLon) || !Number.isFinite(targetLat)) return;

  // Set high altitude over target
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, 25000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  setTimeout(() => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(targetLon, targetLat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0.0,
      },
      duration,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 300);
}

/**
 * Fly the camera to a full-globe overview.
 */
export function flyToGlobeView(viewer, duration = 3.0) {
  if (!viewer?.camera) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-98.0, 38.0, 18_000_000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

/**
 * Automatically acquire user location via Geolocation API or IP fallback,
 * and fly to the user's location on startup.
 */
export function flyToUserLocation(viewer, onStatus) {
  const updateStatus = (msg) => {
    if (typeof onStatus === 'function') onStatus(msg);
  };

  const tryIpFallback = async () => {
    updateStatus('Triangulating location via network...');
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const locName = [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'User location';
          updateStatus(`Located: ${locName}`);
          flyToCoordinates(viewer, data.longitude, data.latitude, 1800, 3.5);
          return;
        }
      }
    } catch {}

    try {
      const res2 = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(3000) });
      if (res2.ok) {
        const data2 = await res2.json();
        if (typeof data2.latitude === 'number' && typeof data2.longitude === 'number') {
          updateStatus(`Located: ${data2.cityName || 'User location'}`);
          flyToCoordinates(viewer, data2.longitude, data2.latitude, 1800, 3.5);
          return;
        }
      }
    } catch {}

    updateStatus('Connecting to orbital globe view...');
    flyToGlobeView(viewer);
  };

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    updateStatus('Acquiring user GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateStatus('Lock acquired. Flying to your position...');
        flyToCoordinates(viewer, longitude, latitude, 1200, 4.0);
      },
      (err) => {
        console.info('[PROJECT CHARLIE TUNA] Geolocation API unavailable:', err?.message);
        void tryIpFallback();
      },
      { timeout: 4500, enableHighAccuracy: false, maximumAge: 300000 }
    );
  } else {
    void tryIpFallback();
  }
}
