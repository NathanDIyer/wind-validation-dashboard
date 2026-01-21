import React, { useState, useMemo } from 'react'
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
import { COLORS } from '../utils/constants'

const HOURS_PER_WEEK = 168

// Week start dates for 2024
const WEEKS = Array.from({ length: 52 }, (_, i) => {
  const startHour = i * HOURS_PER_WEEK
  const startDate = new Date(2024, 0, 1 + i * 7)
  return {
    index: i,
    startHour,
    label: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
})

/**
 * Single week chart component.
 */
function WeekChart({ weekIndex, actualCF, modelCF, onWeekChange }) {
  const week = WEEKS[weekIndex]

  const chartData = useMemo(() => {
    const data = []
    const startHour = week.startHour

    for (let i = 0; i < HOURS_PER_WEEK && startHour + i < actualCF.length; i++) {
      const hourIndex = startHour + i
      const dayOfWeek = Math.floor(i / 24)
      const hourOfDay = i % 24

      data.push({
        hour: i,
        dayLabel: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        hourOfDay,
        actual: actualCF[hourIndex],
        model: modelCF[hourIndex],
      })
    }

    return data
  }, [weekIndex, actualCF, modelCF, week])

  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-2">
        <select
          value={weekIndex}
          onChange={(e) => onWeekChange(parseInt(e.target.value))}
          className="text-sm border rounded px-2 py-1 bg-white"
        >
          {WEEKS.map((w) => (
            <option key={w.index} value={w.index}>
              Week {w.index + 1}: {w.label}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis
            dataKey="hour"
            tickFormatter={(v) => {
              const day = Math.floor(v / 24)
              return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day]
            }}
            ticks={[0, 24, 48, 72, 96, 120, 144]}
            label={{ value: 'Day of Week', position: 'bottom', offset: 5 }}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => (v * 100).toFixed(0)}
          />
          <Tooltip
            formatter={(value) => [(value * 100).toFixed(1) + '%']}
            labelFormatter={(hour) => {
              const dayOfWeek = Math.floor(hour / 24)
              const hourOfDay = hour % 24
              return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]} ${hourOfDay}:00`
            }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke={COLORS.actual}
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="model"
            name="Model"
            stroke={COLORS.model}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Two side-by-side weekly comparison charts.
 */
export default function WeeklyComparison({ actualCF, modelCF }) {
  // Default weeks: March 14 (week 11) and September 12 (week 37)
  const [week1, setWeek1] = useState(10) // March 14
  const [week2, setWeek2] = useState(36) // September 12

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h3 className="text-lg font-bold text-gray-800 mb-2">Weekly Comparison</h3>

      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-600"></div>
          <span className="text-sm text-gray-600">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-red-600"></div>
          <span className="text-sm text-gray-600">Model</span>
        </div>
      </div>

      <div className="flex gap-4">
        <WeekChart
          weekIndex={week1}
          actualCF={actualCF}
          modelCF={modelCF}
          onWeekChange={setWeek1}
        />
        <WeekChart
          weekIndex={week2}
          actualCF={actualCF}
          modelCF={modelCF}
          onWeekChange={setWeek2}
        />
      </div>
    </div>
  )
}
