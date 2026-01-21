/**
 * Wind power curve calculations with configurable exponent.
 */

import { STANDARD_AIR_DENSITY } from './constants'

/**
 * Extrapolate wind speed from 100m to hub height using power law.
 * Formula: ws_hub = ws_100m * (hub_height / 100)^shear_exponent
 */
export function extrapolateWindSpeed(ws100m, hubHeight, shearExponent = 0.14) {
  if (hubHeight === 100) return ws100m
  return ws100m * Math.pow(hubHeight / 100, shearExponent)
}

/**
 * Adjust power output for air density variations.
 * Wind turbine power is proportional to air density: P = 1/2 * rho * A * v^3
 */
export function adjustPowerForDensity(power, airDensity, applyCorrection = true) {
  if (!applyCorrection) return power
  return power * (airDensity / STANDARD_AIR_DENSITY)
}

/**
 * Apply wind power curve to calculate capacity factor with configurable exponent.
 *
 * @param {number} windSpeed - Wind speed at hub height (m/s)
 * @param {Object} params - Power curve parameters
 * @param {number} params.cutIn - Cut-in wind speed (m/s)
 * @param {number} params.ratedSpeed - Rated wind speed (m/s)
 * @param {number} params.cutOut - Cut-out wind speed (m/s)
 * @param {number} params.exponent - Power curve exponent (typically 2-3)
 * @param {number} params.maxCf - Maximum capacity factor cap
 * @returns {number} Capacity factor (0-1)
 */
export function applyPowerCurve(windSpeed, { cutIn, ratedSpeed, cutOut, exponent, maxCf }) {
  if (windSpeed < cutIn || windSpeed > cutOut) return 0
  if (windSpeed >= ratedSpeed) return maxCf

  // Ramp region with configurable exponent
  const fraction = Math.pow((windSpeed - cutIn) / (ratedSpeed - cutIn), exponent)
  return Math.min(fraction * maxCf, maxCf)
}

/**
 * Apply power curve to an array of wind speeds.
 *
 * @param {number[]} windSpeeds - Array of wind speeds (m/s)
 * @param {Object} params - Power curve parameters
 * @returns {number[]} Array of capacity factors
 */
export function applyPowerCurveArray(windSpeeds, params) {
  return windSpeeds.map(ws => applyPowerCurve(ws, params))
}

/**
 * Process hourly data to calculate model capacity factors.
 *
 * @param {Object[]} hourlyData - Array of hourly records from preprocessed.json
 * @param {Object} params - Power curve parameters including hubHeight
 * @returns {number[]} Array of model capacity factors
 */
export function calculateModelCF(hourlyData, params) {
  const { hubHeight, cutIn, ratedSpeed, cutOut, exponent, maxCf } = params

  return hourlyData.map(hour => {
    // Extrapolate wind speed to hub height
    const ws = extrapolateWindSpeed(
      hour.wind_speed_100m,
      hubHeight,
      hour.shear_exponent || 0.14
    )

    // Apply power curve
    const cf = applyPowerCurve(ws, { cutIn, ratedSpeed, cutOut, exponent, maxCf })

    // Optional: adjust for air density
    // const adjustedCf = adjustPowerForDensity(cf, hour.air_density || 1.225)

    return cf
  })
}
