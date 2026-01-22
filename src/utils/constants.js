/**
 * Parameter ranges and default values for the wind validation dashboard.
 */

export const PARAMETERS = {
  exponent: {
    min: 2.0,
    max: 3.0,
    step: 0.1,
    default: 2.5,
    optimal: 2.0,
    label: 'Power Exponent',
    unit: '',
  },
  cutIn: {
    min: 3.0,
    max: 5.0,
    step: 0.1,
    default: 3.0,
    optimal: 3.0,
    label: 'Cut-in Speed',
    unit: 'm/s',
  },
  ratedSpeed: {
    min: 8.0,
    max: 15.0,
    step: 0.1,
    default: 10.5,
    optimal: 9.0,
    label: 'Rated Speed',
    unit: 'm/s',
  },
  cutOut: {
    min: 20,
    max: 30,
    step: 1,
    default: 25,
    optimal: 25,
    label: 'Cut-out Speed',
    unit: 'm/s',
  },
  maxCf: {
    min: 0.70,
    max: 1.00,
    step: 0.01,
    default: 0.90,
    optimal: 0.81,
    label: 'Peak Output',
    unit: '%',
  },
  hubHeight: {
    min: 80,
    max: 150,
    step: 5,
    default: 100,
    optimal: 100,
    label: 'Hub Height',
    unit: 'm',
  },
}

export const DEFAULT_PARAMS = {
  exponent: PARAMETERS.exponent.default,
  cutIn: PARAMETERS.cutIn.default,
  ratedSpeed: PARAMETERS.ratedSpeed.default,
  cutOut: PARAMETERS.cutOut.default,
  maxCf: PARAMETERS.maxCf.default,
  hubHeight: PARAMETERS.hubHeight.default,
}

export const OPTIMAL_PARAMS = {
  exponent: 2.0,
  cutIn: 3.0,
  ratedSpeed: 9.0,
  cutOut: 25,
  maxCf: 0.81,
  hubHeight: 100,
}

// Chart colors
export const COLORS = {
  actual: '#2563eb',      // Blue
  satellite: '#dc2626',   // Red (renamed from model)
  model: '#dc2626',       // Red (deprecated alias for satellite)
  grid: '#e5e7eb',
  text: '#374151',
  background: '#ffffff',
}

// Capacity sweep settings
export const SWEEP_CONFIG = {
  minGwh: 50,
  maxGwh: 500,
  numPoints: 50,
  baseloadGwh: 350,  // Reference baseload for matching calculation
}

// Standard air density at sea level, 15C (kg/m3)
export const STANDARD_AIR_DENSITY = 1.225

// Hours per year
export const HOURS_PER_YEAR = 8760
