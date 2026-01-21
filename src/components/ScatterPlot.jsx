import React, { useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { linearRegression } from '../utils/calculations'
import { COLORS } from '../utils/constants'
import InfoTooltip from './InfoTooltip'

/**
 * Scatter plot showing actual vs model CF with regression line.
 */
export default function ScatterPlot({ actualCF, modelCF, stats }) {
  // Downsample data for performance (show every 10th point = 876 points)
  const scatterData = useMemo(() => {
    const data = []
    for (let i = 0; i < actualCF.length; i += 10) {
      data.push({
        actual: actualCF[i],
        model: modelCF[i],
      })
    }
    return data
  }, [actualCF, modelCF])

  // Calculate regression line
  const regression = useMemo(() => {
    return linearRegression(actualCF, modelCF)
  }, [actualCF, modelCF])

  // Generate regression line points
  const regressionLine = useMemo(() => {
    const { slope, intercept } = regression
    return [
      { x: 0, y: intercept },
      { x: 1, y: slope + intercept },
    ]
  }, [regression])

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-bold text-gray-800 flex items-center">
          Actual vs Model
          <InfoTooltip text="Each point represents one hour. Points along the dashed diagonal indicate perfect prediction. Vertical spread shows prediction error. Clustering near the line indicates high correlation." />
        </h3>
        <div className="text-xs text-gray-600">
          r = <span className="font-mono font-bold text-blue-600">{stats.r.toFixed(3)}</span>
          <span className="mx-1">·</span>
          R² = <span className="font-mono font-bold text-blue-600">{(stats.r2 * 100).toFixed(1)}%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            type="number"
            dataKey="actual"
            name="Actual CF"
            domain={[0, 1]}
            tickFormatter={(v) => (v * 100).toFixed(0)}
            label={{ value: 'Actual CF (%)', position: 'bottom', offset: 15 }}
          />
          <YAxis
            type="number"
            dataKey="model"
            name="Model CF"
            domain={[0, 1]}
            tickFormatter={(v) => (v * 100).toFixed(0)}
            label={{ value: 'Model CF (%)', angle: -90, position: 'insideLeft', offset: -10 }}
          />
          <Tooltip
            formatter={(value) => [(value * 100).toFixed(1) + '%']}
            labelFormatter={() => ''}
          />

          {/* Perfect correlation line */}
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
            stroke="#9ca3af"
            strokeDasharray="5 5"
          />

          {/* Scatter points */}
          <Scatter
            data={scatterData}
            fill={COLORS.actual}
            fillOpacity={0.3}
            shape="circle"
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
