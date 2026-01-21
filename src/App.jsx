import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ParameterPanel from './components/ParameterPanel'
import WeeklyComparison from './components/WeeklyComparison'
import ScatterPlot from './components/ScatterPlot'
import DurationCurves from './components/DurationCurves'
import CapacitySweep from './components/CapacitySweep'
import { calculateModelCF } from './utils/powerCurve'
import { calculateCorrelation, mean } from './utils/calculations'
import { DEFAULT_PARAMS, OPTIMAL_PARAMS } from './utils/constants'

function App() {
  // Data state
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Parameter state
  const [params, setParams] = useState(OPTIMAL_PARAMS)

  // Debounce timer for slider updates
  const [debouncedParams, setDebouncedParams] = useState(params)

  // Load preprocessed data
  useEffect(() => {
    fetch('/data/preprocessed.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load data')
        return res.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Debounce parameter changes (100ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams(params)
    }, 100)
    return () => clearTimeout(timer)
  }, [params])

  // Handle parameter change
  const handleParamChange = useCallback((name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }))
  }, [])

  // Handle reset
  const handleReset = useCallback((type) => {
    if (type === 'optimal') {
      setParams(OPTIMAL_PARAMS)
    } else {
      setParams(DEFAULT_PARAMS)
    }
  }, [])

  // Calculate model CF from parameters
  const modelCF = useMemo(() => {
    if (!data?.hourly) return []
    return calculateModelCF(data.hourly, debouncedParams)
  }, [data, debouncedParams])

  // Extract actual CF
  const actualCF = useMemo(() => {
    if (!data?.hourly) return []
    return data.hourly.map((h) => h.actual_cf)
  }, [data])

  // Calculate statistics
  const stats = useMemo(() => {
    if (actualCF.length === 0 || modelCF.length === 0) {
      return { r: 0, r2: 0, actualAvgCF: 0, modelAvgCF: 0 }
    }
    const r = calculateCorrelation(actualCF, modelCF)
    return {
      r,
      r2: r * r,
      actualAvgCF: mean(actualCF),
      modelAvgCF: mean(modelCF),
    }
  }, [actualCF, modelCF])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading data...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Wind Validation Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                {data.metadata.location} {data.metadata.year} • {data.metadata.nameplate_mw.toFixed(1)} MW Nameplate
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                r = {stats.r.toFixed(3)}
              </div>
              <div className="text-lg text-gray-600">
                R² = {(stats.r2 * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left sidebar - Parameters */}
          <div className="w-64 flex-shrink-0">
            <ParameterPanel
              params={params}
              onParamChange={handleParamChange}
              onReset={handleReset}
            />
          </div>

          {/* Right content - Charts */}
          <div className="flex-1 space-y-6">
            {/* Weekly comparison */}
            <WeeklyComparison actualCF={actualCF} modelCF={modelCF} />

            {/* Scatter and Duration side by side */}
            <div className="grid grid-cols-2 gap-6">
              <ScatterPlot actualCF={actualCF} modelCF={modelCF} stats={stats} />
              <DurationCurves actualCF={actualCF} modelCF={modelCF} stats={stats} />
            </div>

            {/* Capacity sweep */}
            <CapacitySweep actualCF={actualCF} modelCF={modelCF} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
        Data: ERA5 reanalysis ({data.metadata.lat}°N, {data.metadata.lon}°W) •
        Timezone shift: +{data.metadata.timezone_shift}h (Central → UTC)
      </footer>
    </div>
  )
}

export default App
