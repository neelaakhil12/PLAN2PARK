import React, { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../theme/colors';

// Demand helper for color coding based on free slot percentage
export function getSpotDemand(spot) {
  const total = spot.totalSlots || (spot.slots ? spot.slots.length : 5);
  const free = spot.availableSlots !== undefined ? spot.availableSlots : (spot.slots ? spot.slots.filter(s => s.isAvailable !== false).length : total);
  const freePercent = total > 0 ? (free / total) * 100 : 0;

  if (free <= 0 || freePercent < 20) {
    return {
      status: 'Full',
      color: '#ef4444',
      bg: '#450a0a',
      ring: 'rgba(239, 68, 68, 0.5)',
      badge: '🔴 Full / High Demand',
      shortBadge: '🔴 Full',
      desc: '< 20% spots free or fully booked',
      tag: 'Full',
    };
  } else if (freePercent < 60) {
    return {
      status: 'Moderate',
      color: '#f59e0b',
      bg: '#451a03',
      ring: 'rgba(245, 158, 11, 0.5)',
      badge: '🟡 Moderate Demand',
      shortBadge: '🟡 Moderate',
      desc: '20% - 60% spots free',
      tag: 'Moderate',
    };
  } else {
    return {
      status: 'Easy',
      color: '#10b981',
      bg: '#064e3b',
      ring: 'rgba(16, 185, 129, 0.5)',
      badge: '🟢 Easy Availability',
      shortBadge: '🟢 Easy',
      desc: '> 60% spots free',
      tag: 'Easy',
    };
  }
}

export default function DynamicParkingMap({
  userLat = 17.313,
  userLng = 78.545,
  userLocationName = 'My Location',
  spots = [],
  selectedSpot = null,
  onSelectSpot,
  onCloseCard,
}) {
  // Find index of current spot for prev/next cycling
  const currentIndex = selectedSpot ? spots.findIndex((s) => s._id === selectedSpot._id) : -1;

  const handleNextSpot = () => {
    if (spots.length === 0) return;
    const nextIdx = (currentIndex + 1) % spots.length;
    if (onSelectSpot) onSelectSpot(spots[nextIdx]);
  };

  const handlePrevSpot = () => {
    if (spots.length === 0) return;
    const prevIdx = (currentIndex - 1 + spots.length) % spots.length;
    if (onSelectSpot) onSelectSpot(spots[prevIdx]);
  };

  // Generate HTML containing Leaflet map with Google-styled markers and Demand Heat Circles
  const mapHtml = useMemo(() => {
    const spotsJson = JSON.stringify(
      spots.map((s) => {
        const demand = getSpotDemand(s);
        const sLat = s.coordinates?.lat || s.lat || (s.location?.coordinates && s.location.coordinates[1]) || (userLat + (s.calculatedDist ? s.calculatedDist * 0.009 : 0.01));
        const sLng = s.coordinates?.lng || s.lng || (s.location?.coordinates && s.location.coordinates[0]) || (userLng + (s.calculatedDist ? s.calculatedDist * 0.009 : 0.01));

        return {
          id: s._id,
          title: s.title || 'Parking Space',
          address: s.address || '',
          price: s.pricePerHour || 40,
          dist: s.calculatedDist || 0.5,
          slots: s.availableSlots ?? (s.totalSlots || 1),
          totalSlots: s.totalSlots || 5,
          ev: !!s.evCharging,
          lat: sLat,
          lng: sLng,
          demandStatus: demand.status,
          demandColor: demand.color,
          demandRing: demand.ring,
          demandBadge: demand.shortBadge,
        };
      })
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* Top Heat Map Legend Bar */
    .heat-legend-bar {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(51, 65, 85, 0.8);
      border-radius: 12px;
      padding: 6px 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .legend-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }
    .legend-title {
      font-size: 11px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: 0.3px;
    }
    .legend-pills {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .legend-pill {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 800;
      color: #e2e8f0;
    }
    .legend-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .legend-tagline {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 500;
    }

    /* Recenter Button */
    .recenter-btn {
      position: absolute;
      top: 56px;
      right: 10px;
      z-index: 1000;
      background: #1e293b;
      color: #ffffff;
      border: 1px solid #334155;
      padding: 6px 10px;
      border-radius: 16px;
      font-size: 10px;
      font-weight: 800;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
    }

    /* Custom Google Style Red Pin for User */
    .user-pin {
      width: 36px;
      height: 36px;
      position: relative;
    }
    .user-pin-icon {
      width: 30px;
      height: 30px;
      background: #ef4444;
      border: 2.5px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-pulse {
      position: absolute;
      width: 40px;
      height: 40px;
      top: -5px;
      left: -5px;
      background: rgba(239, 68, 68, 0.35);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Custom Google Parking Spot Pin with Heat Status */
    .spot-pin-wrapper {
      position: relative;
    }
    .spot-heat-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      top: -36px;
      left: -22px;
      border-radius: 50%;
      opacity: 0.5;
      animation: heatGlow 2.5s infinite ease-in-out;
    }
    @keyframes heatGlow {
      0%, 100% { transform: scale(0.9); opacity: 0.3; }
      50% { transform: scale(1.4); opacity: 0.7; }
    }
    .spot-pin {
      border: 2px solid #ffffff;
      border-radius: 10px;
      padding: 3px 6px;
      color: #ffffff;
      font-weight: 900;
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
      cursor: pointer;
      transform: translate(-50%, -100%);
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .spot-pin::after {
      content: '';
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 5px 5px 0;
      border-style: solid;
      border-color: inherit transparent transparent;
    }

    /* Leaflet Popup Styling */
    .leaflet-popup-content-wrapper {
      background: #1e293b;
      color: #ffffff;
      border-radius: 14px;
      border: 1px solid #334155;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
      padding: 0;
      overflow: hidden;
    }
    .leaflet-popup-content {
      margin: 10px 12px;
      line-height: 1.3;
    }
    .leaflet-popup-tip {
      background: #1e293b;
    }
    .popup-title {
      font-size: 12px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 2px;
    }
    .popup-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .popup-demand-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .popup-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .popup-price {
      color: #10b981;
      font-size: 12px;
      font-weight: 800;
    }
    .popup-btn {
      display: block;
      width: 100%;
      background: #10b981;
      color: #ffffff;
      text-align: center;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      text-decoration: none;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <!-- Top Demand Heat Map Legend -->
  <div class="heat-legend-bar">
    <div class="legend-title-row">
      <span class="legend-title">🔥 Parking Demand Heat Map</span>
      <div class="legend-pills">
        <span class="legend-pill"><span class="legend-dot" style="background:#10b981;"></span> Easy</span>
        <span class="legend-pill"><span class="legend-dot" style="background:#f59e0b;"></span> Moderate</span>
        <span class="legend-pill"><span class="legend-dot" style="background:#ef4444;"></span> Full</span>
      </div>
    </div>
    <div class="legend-tagline">Helps users decide before traveling.</div>
  </div>

  <button class="recenter-btn" onclick="fitAll()">🔍 View All Spots</button>

  <div id="map"></div>

  <script>
    const userLat = ${userLat};
    const userLng = ${userLng};
    const spots = ${spotsJson};

    const map = L.map('map', {
      center: [userLat, userLng],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const userIcon = L.divIcon({
      className: 'user-pin-wrapper',
      html: '<div class="user-pin"><div class="user-pulse"></div><div class="user-pin-icon"><span style="transform:rotate(45deg);font-size:12px;">🎯</span></div></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b style="color:#ef4444;">📍 Your Pinned Location</b><br/><span style="font-size:11px;color:#94a3b8;">${userLocationName.replace(/'/g, "\\'")}</span>');

    const allMarkers = [[userLat, userLng]];

    spots.forEach(spot => {
      allMarkers.push([spot.lat, spot.lng]);

      L.circle([spot.lat, spot.lng], {
        color: spot.demandColor,
        fillColor: spot.demandColor,
        fillOpacity: 0.15,
        radius: 350,
        weight: 1.5,
      }).addTo(map);

      const pinHtml = \`
        <div class="spot-pin-wrapper">
          <div class="spot-heat-pulse" style="background:\${spot.demandRing};"></div>
          <div class="spot-pin" style="background:\${spot.demandColor}; border-color:#ffffff;">
            <span>🅿️</span> ₹\${spot.price}/hr
          </div>
        </div>
      \`;

      const spotIcon = L.divIcon({
        className: 'custom-spot-marker',
        html: pinHtml,
        iconSize: [80, 26],
        iconAnchor: [40, 26],
      });

      const marker = L.marker([spot.lat, spot.lng], { icon: spotIcon }).addTo(map);

      const popupContent = \`
        <div>
          <div class="popup-title">🅿️ \${spot.title}</div>
          <div class="popup-sub">\${spot.address || 'Verified Parking Space'}</div>
          <div class="popup-demand-badge" style="background:\${spot.demandRing}; color:\${spot.demandColor};">
            \${spot.demandBadge} (\${spot.slots} of \${spot.totalSlots} slots free)
          </div>
          <div class="popup-row">
            <span class="popup-price">₹\${spot.price}/hr</span>
            <span style="font-size:10px;color:#94a3b8;">📍 \${spot.dist} km away</span>
          </div>
          <button class="popup-btn" onclick="selectSpot('\${spot.id}')">Book This Spot →</button>
        </div>
      \`;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        selectSpot(spot.id);
      });
    });

    function fitAll() {
      if (allMarkers.length > 0) {
        const bounds = L.latLngBounds(allMarkers);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
    fitAll();

    function selectSpot(spotId) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_SPOT', id: spotId }));
      }
    }
  </script>
</body>
</html>
    `;
  }, [userLat, userLng, userLocationName, spots]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_SPOT' && onSelectSpot) {
        const found = spots.find((s) => s._id === data.id);
        if (found) onSelectSpot(found);
      }
    } catch (e) {
      console.log('Map message error:', e);
    }
  };

  const currentDemand = selectedSpot ? getSpotDemand(selectedSpot) : null;

  return (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTxt}>Loading Demand Heat Map...</Text>
          </View>
        )}
      />

      {/* Selected Spot Bottom Floating Card with Navigation & Close Controls */}
      {selectedSpot && (
        <View style={styles.selectedSpotCard}>
          {/* Card Top Control Bar */}
          <View style={styles.cardControlRow}>
            {/* Spot Switcher: Prev / Count / Next */}
            <View style={styles.spotSwitcher}>
              <TouchableOpacity
                onPress={handlePrevSpot}
                style={styles.switchNavBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.switchNavTxt}>◀ Prev</Text>
              </TouchableOpacity>

              <Text style={styles.switchCountTxt}>
                Spot {currentIndex + 1} of {spots.length}
              </Text>

              <TouchableOpacity
                onPress={handleNextSpot}
                style={styles.switchNavBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.switchNavTxt}>Next ▶</Text>
              </TouchableOpacity>
            </View>

            {/* Close Card & View Full Map Button */}
            <TouchableOpacity
              onPress={() => {
                if (onCloseCard) onCloseCard();
                else if (onSelectSpot) onSelectSpot(null);
              }}
              style={styles.closeCardBtn}
              activeOpacity={0.75}
            >
              <Text style={styles.closeCardTxt}>✕ Close Map Card</Text>
            </TouchableOpacity>
          </View>

          {/* Spot Content Details */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.badgeRow}>
                {currentDemand && (
                  <View style={[styles.demandBadge, { backgroundColor: currentDemand.bg, borderColor: currentDemand.color }]}>
                    <Text style={[styles.demandTxt, { color: currentDemand.color }]}>
                      {currentDemand.badge}
                    </Text>
                  </View>
                )}
                <View style={styles.distBadge}>
                  <Text style={styles.distTxt}>📍 {selectedSpot.calculatedDist || 0.5} km</Text>
                </View>
              </View>
              <Text style={styles.spotTitle} numberOfLines={1}>{selectedSpot.title}</Text>
              <Text style={styles.spotAddress} numberOfLines={1}>{selectedSpot.address}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceTxt}>₹{selectedSpot.pricePerHour || 40}</Text>
              <Text style={styles.perHrTxt}>/hour</Text>
            </View>
          </View>

          {/* Book Action CTA */}
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => onSelectSpot(selectedSpot, true)}
            activeOpacity={0.85}
          >
            <Text style={styles.bookBtnTxt}>Reserve Parking Spot 🚀</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTxt: {
    color: COLORS.textMuted,
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedSpotCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cardControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    paddingBottom: 6,
  },
  spotSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchNavBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchNavTxt: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  switchCountTxt: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  closeCardBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closeCardTxt: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '800',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  demandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  demandTxt: {
    fontSize: 9,
    fontWeight: '900',
  },
  distBadge: {
    backgroundColor: '#1e3a8a30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  distTxt: {
    color: '#60a5fa',
    fontSize: 9,
    fontWeight: '800',
  },
  spotTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  spotAddress: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  priceCol: {
    alignItems: 'flex-end',
  },
  priceTxt: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  perHrTxt: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  bookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnTxt: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
});
