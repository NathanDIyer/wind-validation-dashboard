import React, { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { mean } from '../utils/calculations'
import { COLORS } from '../utils/constants'
import InfoTooltip from './InfoTooltip'

/**
 * Calculate hourly match at a given generation percentage of load.
 */
function calculateMatchAtPct(cfProfile, avgCF, genPctOfLoad) {
  const scaleFactor = genPctOfLoad / 100
  let totalMatched = 0
  const n = cfProfile.length

  const genScale = scaleFactor / (avgCF * n)

  for (let i = 0; i < n; i++) {
    const hourlyGen = cfProfile[i] * genScale
    const hourlyLoad = 1 / n  // Flat load, normalized to 1 annual
    totalMatched += Math.min(hourlyGen, hourlyLoad)
  }

  return totalMatched * 100
}

/**
 * Calculate multi-resource hourly match.
 * mainWindPct is swept (x-axis), solar/wind2 are fixed from sliders.
 */
function calculateMultiResourceMatch(
  mainWindCF, mainWindAvgCF,
  solarCF, solarAvgCF,
  wind2CF, wind2AvgCF,
  mainWindPct, solarPct, wind2Pct
) {
  const n = mainWindCF.length
  let totalMatched = 0

  for (let i = 0; i < n; i++) {
    // Calculate generation from each source as fraction of hourly load
    const mainWindGen = mainWindCF[i] * (mainWindPct / 100) / (mainWindAvgCF * n)
    const solarGen = solarCF[i] * (solarPct / 100) / (solarAvgCF * n)
    const wind2Gen = wind2CF[i] * (wind2Pct / 100) / (wind2AvgCF * n)

    const totalGen = mainWindGen + solarGen + wind2Gen
    const hourlyLoad = 1 / n
    totalMatched += Math.min(totalGen, hourlyLoad)
  }

  return totalMatched * 100
}

/**
 * Apply power curve to wind speed to get capacity factor.
 */
function applyPowerCurve(windSpeed, shear, params) {
  const { hubHeight, cutIn, ratedSpeed, cutOut, exponent, maxCf } = params

  // Extrapolate to hub height
  const ws = hubHeight === 100 ? windSpeed : windSpeed * Math.pow(hubHeight / 100, shear)

  // Apply power curve
  if (ws < cutIn || ws > cutOut) {
    return 0
  } else if (ws >= ratedSpeed) {
    return maxCf
  } else {
    const rawCF = Math.pow((ws - cutIn) / (ratedSpeed - cutIn), exponent)
    return Math.min(rawCF, maxCf)
  }
}

/**
 * Capacity sweep chart showing hourly matching % vs generation as % of load.
 */
export default function CapacitySweep({ actualCF, modelCF, multiResourceData, params }) {
  // Advanced mode state
  const [advancedMode, setAdvancedMode] = useState(false)
  const [solarPct, setSolarPct] = useState(30)
  const [wind2Pct, setWind2Pct] = useState(20)

  // Sweep from 0% to 150% of load
  const minPct = 0
  const maxPct = 150
  const numPoints = 31  // Every 5%

  // Calculate wind2 CF from wind speeds using power curve params
  const wind2CF = useMemo(() => {
    if (!multiResourceData?.wind2) return []

    const speeds = multiResourceData.wind2.wind_speed_100m
    const shears = multiResourceData.wind2.shear_exponent

    return speeds.map((speed, i) => applyPowerCurve(speed, shears[i], params))
  }, [multiResourceData, params])

  // Get avg CF for wind2
  const wind2AvgCF = useMemo(() => {
    if (wind2CF.length === 0) return 0.35
    return mean(wind2CF)
  }, [wind2CF])

  // Calculate sweep data for both actual and model
  const chartData = useMemo(() => {
    const actualAvgCF = mean(actualCF)
    const modelAvgCF = mean(modelCF)
    const solarCF = multiResourceData?.solar?.cf || []
    const solarAvgCF = multiResourceData?.solar?.avg_cf || 0.20

    const data = []
    for (let i = 0; i < numPoints; i++) {
      const genPct = minPct + (i / (numPoints - 1)) * (maxPct - minPct)

      let actualMatch, modelMatch

      if (advancedMode && (solarPct > 0 || wind2Pct > 0) && solarCF.length > 0 && wind2CF.length > 0) {
        // Multi-resource calculation
        actualMatch = calculateMultiResourceMatch(
          actualCF, actualAvgCF,
          solarCF, solarAvgCF,
          wind2CF, wind2AvgCF,
          genPct, solarPct, wind2Pct
        )
        modelMatch = calculateMultiResourceMatch(
          modelCF, actualAvgCF,  // Use actual's avgCF as reference so Max CF changes show up
          solarCF, solarAvgCF,
          wind2CF, wind2AvgCF,
          genPct, solarPct, wind2Pct
        )
      } else {
        // Single resource calculation (original behavior)
        actualMatch = calculateMatchAtPct(actualCF, actualAvgCF, genPct)
        modelMatch = calculateMatchAtPct(modelCF, actualAvgCF, genPct)
      }

      data.push({
        genPct,
        actual: actualMatch,
        model: modelMatch,
        gap: Math.abs(actualMatch - modelMatch),
      })
    }
    return data
  }, [actualCF, modelCF, multiResourceData, wind2CF, wind2AvgCF, advancedMode, solarPct, wind2Pct])

  // Calculate summary stats
  const stats = useMemo(() => {
    const gaps = chartData.map(d => d.gap)
    const avgGap = mean(gaps)
    const maxGap = Math.max(...gaps)
    return { avgGap, maxGap }
  }, [chartData])

  // Generate x-axis label
  const xAxisLabel = useMemo(() => {
    if (advancedMode && (solarPct > 0 || wind2Pct > 0)) {
      const parts = ['Main Wind %']
      if (solarPct > 0) parts.push(`${solarPct}% Solar`)
      if (wind2Pct > 0) parts.push(`${wind2Pct}% Wind 2`)
      return parts.join(' + ')
    }
    return 'Generation (% of Load)'
  }, [advancedMode, solarPct, wind2Pct])

  // Custom tooltip formatter for multi-resource mode
  const tooltipFormatter = (value, name, props) => {
    const formattedValue = value.toFixed(1) + '%'
    const label = name.charAt(0).toUpperCase() + name.slice(1)
    return [formattedValue, label]
  }

  const tooltipLabelFormatter = (pct) => {
    if (advancedMode && (solarPct > 0 || wind2Pct > 0)) {
      const parts = [`Main Wind: ${pct.toFixed(0)}%`]
      if (solarPct > 0) parts.push(`Solar: ${solarPct}%`)
      if (wind2Pct > 0) parts.push(`Wind 2: ${wind2Pct}%`)
      const total = pct + solarPct + wind2Pct
      parts.push(`Total: ${total.toFixed(0)}%`)
      return parts.join(' | ')
    }
    return `Generation: ${pct.toFixed(0)}% of load`
  }

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center">
            Capacity Sweep
            <InfoTooltip text="Shows what percentage of load can be served directly by wind at different capacity buildouts, assuming flat load and no storage. At 100% (dashed line), annual generation equals annual load. The gap between curves indicates model error in predicting temporal matching." />
          </h3>

          {/* Advanced mode toggle */}
          <label className="flex items-center gap-1 text-xs cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(e) => setAdvancedMode(e.target.checked)}
              className="w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-gray-700 font-medium">Advanced</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          {/* Advanced mode sliders */}
          {advancedMode && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-600">Solar:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={solarPct}
                  onChange={(e) => setSolarPct(parseInt(e.target.value))}
                  className="w-16 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-amber-600 w-8">{solarPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-600">Wind 2:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={wind2Pct}
                  onChange={(e) => setWind2Pct(parseInt(e.target.value))}
                  className="w-16 h-1.5 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-teal-600 w-8">{wind2Pct}%</span>
              </div>
            </>
          )}

          <div className="text-xs text-gray-600">
            Gap: <span className="font-mono text-purple-600">{stats.avgGap.toFixed(1)}pp</span> avg
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 35, left: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="genPct"
            domain={[0, 150]}
            ticks={[0, 25, 50, 75, 100, 125, 150]}
            tickFormatter={(v) => `${v}%`}
            label={{ value: xAxisLabel, position: 'bottom', offset: 15 }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => v.toFixed(0)}
            label={{ value: 'Hourly Match %', angle: -90, position: 'insideLeft', offset: -5 }}
          />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={tooltipLabelFormatter}
          />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />

          {/* Reference line at 100% generation = load */}
          <ReferenceLine x={100} stroke="#9ca3af" strokeDasharray="5 5" />

          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={COLORS.actual}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="model"
            name="Satellite"
            stroke={COLORS.model}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
