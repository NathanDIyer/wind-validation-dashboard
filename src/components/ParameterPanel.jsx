import React from 'react'
import { PARAMETERS, DEFAULT_PARAMS, OPTIMAL_PARAMS } from '../utils/constants'

/**
 * Slider component for a single parameter.
 */
function ParameterSlider({ name, value, onChange, config }) {
  const { min, max, step, label, unit, optimal } = config
  const isOptimal = Math.abs(value - optimal) < step

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-gray-700">
          {label} {unit && <span className="text-gray-400">({unit})</span>}
        </label>
        <span className={`text-xs font-mono ${isOptimal ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(name, parseFloat(e.target.value))}
        className="w-full h-1.5"
      />
      <div className="flex justify-between text-[10px] text-gray-400 -mt-0.5">
        <span>{min}</span>
        <span className="text-green-600">opt: {optimal}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

/**
 * Parameter panel with 6 sliders and preset buttons.
 */
export default function ParameterPanel({ params, onParamChange, onReset }) {
  const handleChange = (name, value) => {
    onParamChange(name, value)
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 h-full">
      <h2 className="text-sm font-bold text-gray-800 mb-3">Parameters</h2>

      <ParameterSlider
        name="exponent"
        value={params.exponent}
        onChange={handleChange}
        config={PARAMETERS.exponent}
      />

      <ParameterSlider
        name="cutIn"
        value={params.cutIn}
        onChange={handleChange}
        config={PARAMETERS.cutIn}
      />

      <ParameterSlider
        name="ratedSpeed"
        value={params.ratedSpeed}
        onChange={handleChange}
        config={PARAMETERS.ratedSpeed}
      />

      <ParameterSlider
        name="cutOut"
        value={params.cutOut}
        onChange={handleChange}
        config={PARAMETERS.cutOut}
      />

      <ParameterSlider
        name="maxCf"
        value={params.maxCf}
        onChange={handleChange}
        config={PARAMETERS.maxCf}
      />

      <ParameterSlider
        name="hubHeight"
        value={params.hubHeight}
        onChange={handleChange}
        config={PARAMETERS.hubHeight}
      />

      <div className="mt-4 space-y-1.5">
        <button
          onClick={() => onReset('optimal')}
          className="w-full py-1.5 px-3 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors font-medium"
        >
          Reset to Optimal
        </button>
        <button
          onClick={() => onReset('default')}
          className="w-full py-1.5 px-3 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors font-medium"
        >
          Reset to Default
        </button>
      </div>
    </div>
  )
}
