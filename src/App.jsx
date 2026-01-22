import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ParameterPanel from './components/ParameterPanel'
import WeeklyComparison from './components/WeeklyComparison'
import DurationCurves from './components/DurationCurves'
import CapacitySweep from './components/CapacitySweep'
import InfoTooltip from './components/InfoTooltip'
import { calculateCorrelation, mean } from './utils/calculations'
import { DEFAULT_PARAMS, OPTIMAL_PARAMS } from './utils/constants'

function App() {
  // Data state
  const [data, setData] = useState(null)
  const [multiResourceData, setMultiResourceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Parameter state - no debounce for instant feedback
  const [params, setParams] = useState(OPTIMAL_PARAMS)

  // Load preprocessed data and multi-resource data in parallel
  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/preprocessed.json`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load main data')
          return res.json()
        }),
      fetch(`${import.meta.env.BASE_URL}data/multi_resource.json`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load multi-resource data')
          return res.json()
        })
    ])
      .then(([mainData, multiData]) => {
        setData(mainData)
        setMultiResourceData(multiData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Handle parameter change - direct, no debounce
  const handleParamChange = useCallback((name, value) => {
    setParams((prev) => ({ ...prev, [name]: value }))
  }, [])

  // Handle reset
  const handleReset = useCallback((type) => {
    setParams(type === 'optimal' ? OPTIMAL_PARAMS : DEFAULT_PARAMS)
  }, [])

  // Pre-extract wind data once (avoids repeated object access)
  const windData = useMemo(() => {
    if (!data?.hourly) return null
    return {
      speeds: data.hourly.map(h => h.wind_speed_100m),
      shears: data.hourly.map(h => h.shear_exponent || 0.14),
    }
  }, [data])

  // Calculate model CF - optimized inline loop
  const modelCF = useMemo(() => {
    if (!windData) return []
    const { speeds, shears } = windData
    const { hubHeight, cutIn, ratedSpeed, cutOut, exponent, maxCf } = params
    const result = new Array(speeds.length)

    for (let i = 0; i < speeds.length; i++) {
      // Extrapolate to hub height
      const ws = hubHeight === 100 ? speeds[i] : speeds[i] * Math.pow(hubHeight / 100, shears[i])
      // Apply power curve inline
      if (ws < cutIn || ws > cutOut) {
        result[i] = 0
      } else if (ws >= ratedSpeed) {
        result[i] = maxCf  // Clipped at max (e.g., 10% curtailment if maxCf=0.90)
      } else {
        // Ramp from 0 to 1, then clip at maxCf
        const rawCF = Math.pow((ws - cutIn) / (ratedSpeed - cutIn), exponent)
        result[i] = Math.min(rawCF, maxCf)
      }
    }
    return result
  }, [windData, params])

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
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Wind Validation Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                {data.metadata.location} {data.metadata.year} · {data.metadata.nameplate_mw.toFixed(1)} MW
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Capacity Factor</div>
                <div className="text-sm">
                  <span className="text-blue-600 font-semibold">{(stats.actualAvgCF * 100).toFixed(1)}%</span>
                  <span className="text-gray-400 mx-1">actual</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-red-600 font-semibold ml-1">{(stats.modelAvgCF * 100).toFixed(1)}%</span>
                  <span className="text-gray-400 mx-1">satellite</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600 flex items-center justify-end">
                  r = {stats.r.toFixed(3)}
                  <InfoTooltip text="Pearson correlation (r) measures how closely the ERA5 satellite-derived wind model matches actual turbine output. Values above 0.85 indicate the model reliably captures hourly generation patterns, making it suitable for grid planning and forecasting." />
                </div>
                <div className="text-sm text-gray-500">
                  R² = {(stats.r2 * 100).toFixed(1)}% variance explained
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded text-sm text-white font-semibold ${
                stats.r >= 0.85 ? 'bg-green-500' :
                stats.r >= 0.75 ? 'bg-lime-500' :
                stats.r >= 0.65 ? 'bg-yellow-500' :
                stats.r >= 0.50 ? 'bg-orange-500' : 'bg-red-500'
              }`}>
                {stats.r >= 0.85 ? 'Excellent' :
                 stats.r >= 0.75 ? 'Good' :
                 stats.r >= 0.65 ? 'Fair' :
                 stats.r >= 0.50 ? 'Weak' : 'Poor'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* Left sidebar - Parameters */}
          <div className="w-56 flex-shrink-0">
            <ParameterPanel
              params={params}
              onParamChange={handleParamChange}
              onReset={handleReset}
            />
          </div>

          {/* Right content - Charts */}
          <div className="flex-1 space-y-4">
            {/* Top: Weekly comparison (above fold) */}
            <WeeklyComparison actualCF={actualCF} modelCF={modelCF} />

            {/* Middle: Capacity sweep (above fold) */}
            <CapacitySweep actualCF={actualCF} modelCF={modelCF} multiResourceData={multiResourceData} params={params} />

            {/* Below fold: Duration curves */}
            <DurationCurves actualCF={actualCF} modelCF={modelCF} stats={stats} />
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
