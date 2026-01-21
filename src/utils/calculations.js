/**
 * Statistical and analysis calculations for wind validation.
 */

/**
 * Calculate Pearson correlation coefficient.
 *
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @returns {number} Correlation coefficient (-1 to 1)
 */
export function calculateCorrelation(x, y) {
  const n = x.length
  if (n !== y.length || n === 0) return 0

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let sumXY = 0
  let sumX2 = 0
  let sumY2 = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    sumXY += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }

  const denominator = Math.sqrt(sumX2 * sumY2)
  if (denominator === 0) return 0

  return sumXY / denominator
}

/**
 * Calculate R² (coefficient of determination).
 *
 * @param {number[]} actual - Actual values
 * @param {number[]} predicted - Predicted values
 * @returns {number} R² value (0 to 1)
 */
export function calculateR2(actual, predicted) {
  const r = calculateCorrelation(actual, predicted)
  return r * r
}

/**
 * Perform linear regression.
 *
 * @param {number[]} x - Independent variable
 * @param {number[]} y - Dependent variable
 * @returns {Object} { slope, intercept, r, r2 }
 */
export function linearRegression(x, y) {
  const n = x.length
  if (n !== y.length || n === 0) {
    return { slope: 0, intercept: 0, r: 0, r2: 0 }
  }

  const meanX = x.reduce((a, b) => a + b, 0) / n
  const meanY = y.reduce((a, b) => a + b, 0) / n

  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumXY += (x[i] - meanX) * (y[i] - meanY)
    sumX2 += (x[i] - meanX) * (x[i] - meanX)
  }

  const slope = sumX2 === 0 ? 0 : sumXY / sumX2
  const intercept = meanY - slope * meanX
  const r = calculateCorrelation(x, y)

  return {
    slope,
    intercept,
    r,
    r2: r * r,
  }
}

/**
 * Generate duration curve (sorted CF values, descending).
 *
 * @param {number[]} cfArray - Array of capacity factors
 * @returns {Object[]} Array of { hour, cf } sorted by cf descending
 */
export function generateDurationCurve(cfArray) {
  const sorted = [...cfArray].sort((a, b) => b - a)
  return sorted.map((cf, i) => ({
    hour: i,
    cf: cf,
  }))
}

/**
 * Calculate mean of an array.
 */
export function mean(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * Calculate hourly matching between generation and load.
 *
 * @param {number[]} cfProfile - Hourly capacity factors
 * @param {number} capacityMw - Nameplate capacity (MW)
 * @param {number} baseloadGwh - Annual baseload (GWh)
 * @returns {Object} Matching metrics
 */
export function calculateHourlyMatch(cfProfile, capacityMw, baseloadGwh) {
  const hourlyLoadMwh = (baseloadGwh * 1000) / 8760
  let totalMatched = 0
  let totalGeneration = 0

  for (let i = 0; i < cfProfile.length; i++) {
    const hourlyGen = cfProfile[i] * capacityMw
    totalGeneration += hourlyGen
    totalMatched += Math.min(hourlyGen, hourlyLoadMwh)
  }

  const matchPct = (totalMatched / (baseloadGwh * 1000)) * 100
  const annualGwh = totalGeneration / 1000

  return {
    matchPct,
    annualGwh,
    matchedGwh: totalMatched / 1000,
  }
}

/**
 * Generate capacity sweep data.
 *
 * @param {number[]} cfProfile - Hourly capacity factors
 * @param {number} baseloadGwh - Annual baseload (GWh)
 * @param {number} avgCf - Average capacity factor
 * @param {number} numPoints - Number of sweep points
 * @param {number} minGwh - Minimum annual GWh
 * @param {number} maxGwh - Maximum annual GWh
 * @returns {Object[]} Array of { gwh, matchPct }
 */
export function calculateCapacitySweep(cfProfile, baseloadGwh, avgCf, numPoints, minGwh, maxGwh) {
  const results = []
  const step = (maxGwh - minGwh) / (numPoints - 1)

  for (let i = 0; i < numPoints; i++) {
    const targetGwh = minGwh + i * step

    // Calculate capacity needed for this annual GWh
    // annualGwh = avgCf * capacityMw * 8760 / 1000
    // capacityMw = targetGwh * 1000 / (avgCf * 8760)
    const capacityMw = (targetGwh * 1000) / (avgCf * 8760)

    const { matchPct } = calculateHourlyMatch(cfProfile, capacityMw, baseloadGwh)

    results.push({
      gwh: targetGwh,
      matchPct,
    })
  }

  return results
}

/**
 * Format percentage for display.
 */
export function formatPercent(value, decimals = 1) {
  return `${(value).toFixed(decimals)}%`
}

/**
 * Format number with commas.
 */
export function formatNumber(value, decimals = 0) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
