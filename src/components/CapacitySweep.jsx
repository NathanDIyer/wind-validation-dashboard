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
} from 'recharts'
import { calculateCapacitySweep, mean } from '../utils/calculations'
import { COLORS, SWEEP_CONFIG } from '../utils/constants'

/**
 * Capacity sweep chart showing hourly matching % vs annual GWh.
 */
export default function CapacitySweep({ actualCF, modelCF }) {
  const { minGwh, maxGwh, numPoints, baseloadGwh } = SWEEP_CONFIG

  // Calculate sweep data for both actual and model
  const chartData = useMemo(() => {
    const actualAvgCF = mean(actualCF)
    const modelAvgCF = mean(modelCF)

    const actualSweep = calculateCapacitySweep(
      actualCF, baseloadGwh, actualAvgCF, numPoints, minGwh, maxGwh
    )
    const modelSweep = calculateCapacitySweep(
      modelCF, baseloadGwh, modelAvgCF, numPoints, minGwh, maxGwh
    )

    // Combine into chart data
    return actualSweep.map((point, i) => ({
      gwh: point.gwh,
      actual: point.matchPct,
      model: modelSweep[i].matchPct,
      gap: Math.abs(point.matchPct - modelSweep[i].matchPct),
    }))
  }, [actualCF, modelCF, baseloadGwh, numPoints, minGwh, maxGwh])

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
        Hourly Matching % vs Annual Generation (baseload: {baseloadGwh} GWh)
      </p>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="gwh"
            label={{ value: 'Annual GWh', position: 'bottom', offset: 15 }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => v.toFixed(0)}
            label={{ value: 'Match %', angle: -90, position: 'insideLeft', offset: -10 }}
          />
          <Tooltip
            formatter={(value, name) => [
              value.toFixed(2) + '%',
              name.charAt(0).toUpperCase() + name.slice(1)
            ]}
            labelFormatter={(label) => `${label.toFixed(0)} GWh/year`}
          />
          <Legend />

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
