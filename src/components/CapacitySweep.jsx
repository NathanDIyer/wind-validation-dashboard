import React, { useMemo } from 'react'
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

/**
 * Calculate hourly match at a given generation percentage of load.
 */
function calculateMatchAtPct(cfProfile, avgCF, genPctOfLoad) {
  // At genPctOfLoad = 100%, annual generation = annual load
  // capacityMW * avgCF * 8760 = loadGWh * 1000
  // So we scale CF profile by genPctOfLoad/100 to get generation relative to load

  const scaleFactor = genPctOfLoad / 100
  let totalMatched = 0
  const n = cfProfile.length

  // Normalize: at 100%, sum of (cf * scale) should equal sum of hourly load (1/8760 each)
  // hourlyLoad = 1/8760 of annual (normalized to 1)
  // hourlyGen = cf * scaleFactor * (1 / avgCF) to normalize so avg gen at 100% = avg load
  const genScale = scaleFactor / avgCF

  for (let i = 0; i < n; i++) {
    const hourlyGen = cfProfile[i] * genScale
    const hourlyLoad = 1 / n  // Flat load, normalized to 1 annual
    totalMatched += Math.min(hourlyGen, hourlyLoad)
  }

  // Return as percentage of total load matched
  return totalMatched * 100
}

/**
 * Capacity sweep chart showing hourly matching % vs generation as % of load.
 */
export default function CapacitySweep({ actualCF, modelCF }) {
  // Sweep from 0% to 300% of load
  const minPct = 0
  const maxPct = 300
  const numPoints = 61  // Every 5%

  // Calculate sweep data for both actual and model
  const chartData = useMemo(() => {
    const actualAvgCF = mean(actualCF)
    const modelAvgCF = mean(modelCF)

    const data = []
    for (let i = 0; i < numPoints; i++) {
      const genPct = minPct + (i / (numPoints - 1)) * (maxPct - minPct)
      const actualMatch = calculateMatchAtPct(actualCF, actualAvgCF, genPct)
      const modelMatch = calculateMatchAtPct(modelCF, modelAvgCF, genPct)

      data.push({
        genPct,
        actual: actualMatch,
        model: modelMatch,
        gap: Math.abs(actualMatch - modelMatch),
      })
    }
    return data
  }, [actualCF, modelCF])

  // Calculate summary stats
  const stats = useMemo(() => {
    const gaps = chartData.map(d => d.gap)
    const avgGap = mean(gaps)
    const maxGap = Math.max(...gaps)
    return { avgGap, maxGap }
  }, [chartData])

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">Capacity Sweep</h3>
        <div className="text-sm text-gray-600">
          Gap: Avg <span className="font-mono text-purple-600">{stats.avgGap.toFixed(2)}pp</span>
          {' / '}
          Max <span className="font-mono text-purple-600">{stats.maxGap.toFixed(2)}pp</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">
        Hourly Match % vs Generation (as % of annual load)
      </p>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="genPct"
            domain={[0, 300]}
            ticks={[0, 50, 100, 150, 200, 250, 300]}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'Generation (% of Load)', position: 'bottom', offset: 15 }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => v.toFixed(0)}
            label={{ value: 'Hourly Match %', angle: -90, position: 'insideLeft', offset: -10 }}
          />
          <Tooltip
            formatter={(value, name) => [
              value.toFixed(1) + '%',
              name.charAt(0).toUpperCase() + name.slice(1)
            ]}
            labelFormatter={(pct) => `Generation: ${pct.toFixed(0)}% of load`}
          />
          <Legend />

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
            name="Model"
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
