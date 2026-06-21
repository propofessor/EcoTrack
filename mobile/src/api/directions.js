const BASE_DIST_KM = 3.2;

const MODE_SPEEDS_KMH = {
  piedi: 5,
  bicicletta: 15,
  autobus: 25,
  macchina: 40,
};

const MODE_FACTORS = {
  piedi: 1.0,
  bicicletta: 1.1,
  autobus: 1.4,
  macchina: 1.2,
};


export function getMockDirections(origin, destination) {
  const result = {};
  for (const mode of ["piedi", "bicicletta", "autobus", "macchina"]) {
    const distanceKm = parseFloat(
      (BASE_DIST_KM * MODE_FACTORS[mode]).toFixed(1),
    );
    const durationMin = Math.round((distanceKm / MODE_SPEEDS_KMH[mode]) * 60);
    result[mode] = { distanceKm, durationMin };
  }
  return result;
}
