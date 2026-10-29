/// GeoJSON uses longitude, latitude. Holes are excluded; ambiguous area edges
/// are rejected by the caller instead of pretending street-level accuracy.
bool insideRing(double x, double y, List<List<double>> ring) {
  var inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    final a = ring[i], b = ring[j];
    if ((a[1] > y) != (b[1] > y) &&
        x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

// URA MP2025 release 2026-02-27; synchronized with the bundled geometry.
const planningAreaCodes = <String>{
  'AM',
  'BD',
  'BK',
  'BL',
  'BM',
  'BP',
  'BS',
  'BT',
  'CB',
  'CC',
  'CH',
  'CK',
  'CL',
  'DT',
  'GL',
  'HG',
  'JE',
  'JW',
  'KL',
  'LK',
  'MD',
  'ME',
  'MP',
  'MS',
  'MU',
  'NE',
  'NT',
  'NV',
  'OR',
  'OT',
  'PG',
  'PL',
  'PN',
  'PR',
  'QT',
  'RC',
  'RV',
  'SB',
  'SE',
  'SG',
  'SI',
  'SK',
  'SL',
  'SM',
  'SR',
  'SV',
  'TH',
  'TM',
  'TN',
  'TP',
  'TS',
  'WC',
  'WD',
  'WI',
  'YS',
};
