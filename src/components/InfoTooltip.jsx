import React, { useState } from 'react'

/**
 * Info icon with hover tooltip for chart explanations.
 */
export default function InfoTooltip({ text }) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-block ml-1">
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 text-[10px] text-gray-400 border border-gray-300 rounded-full cursor-help hover:text-gray-600 hover:border-gray-400"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        i
      </span>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-200" />
        </div>
      )}
    </span>
  )
}
