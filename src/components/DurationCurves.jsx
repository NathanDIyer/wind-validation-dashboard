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
import { generateDurationCurve } from '../utils/calculations'
import { COLORS } from '../utils/constants'

/**
 * Duration curves showing sorted CF values for actual and model.
 */
export default function DurationCurves({ actualCF, modelCF, stats }) {
  // Generate duration curves
  const chartData = useMemo(() => {
    const actualDuration = generateDurationCurve(actualCF)
    const modelDuration = generateDurationCurve(modelCF)

    // Downsample to 100 points for performance
    const step = Math.floor(actualDuration.length / 100)
    const data = []

    for (let i = 0; i < actualDuration.length; i += step) {
      data.push({
        hour: actualDuration[i].hour,
        actual: actualDuration[i].cf,
        model: modelDuration[i].cf,
      })
    }

    // Ensure we include the last point
    if (data.length > 0 && data[data.length - 1].hour !== actualDuration.length - 1) {
      data.push({
        hour: actualDuration[actualDuration.length - 1].hour,
        actual: actualDuration[actualDuration.length - 1].cf,
        model: modelDuration[modelDuration.length - 1].cf,
      })
    }

    return data
  }, [actualCF, modelCF])

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-bold text-gray-800">Duration Curves</h3>
        <div className="text-xs text-gray-600">
          Avg: <span className="font-mono text-blue-600">{(stats.actualAvgCF * 100).toFixed(1)}%</span>
          <span className="mx-1">·</span>
          <span className="font-mono text-red-600">{(stats.modelAvgCF * 100).toFixed(1)}%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="hour"
            tickFormatter={(v) => v.toLocaleString()}
            label={{ value: 'Hours', position: 'bottom', offset: 15 }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => (v * 100).toFixed(0)}
            label={{ value: 'CF (%)', angle: -90, position: 'insideLeft', offset: -10 }}
          />
          <Tooltip
            formatter={(value) => [(value * 100).toFixed(1) + '%']}
            labelFormatter={(label) => `Hour ${label.toLocaleString()}`}
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
