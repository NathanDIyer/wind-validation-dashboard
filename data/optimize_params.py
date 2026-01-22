#!/usr/bin/env python3
"""
Optimize power curve parameters for best correlation, CF accuracy, and capacity sweep match.
"""

import json
import numpy as np
from pathlib import Path

# Load preprocessed data
DATA_PATH = Path(__file__).parent / "preprocessed.json"

with open(DATA_PATH) as f:
    data = json.load(f)

# Extract data
actual_cf = np.array([h['actual_cf'] for h in data['hourly']])
wind_speed = np.array([h['wind_speed_100m'] for h in data['hourly']])
shear = np.array([h['shear_exponent'] for h in data['hourly']])

print(f"Loaded {len(actual_cf)} hours of data")
print(f"Actual avg CF: {np.mean(actual_cf)*100:.2f}%")

def apply_power_curve(wind_speed, shear, hub_height, cut_in, rated_speed, cut_out, exponent, max_cf):
    """Apply power curve to get capacity factor."""
    ws = wind_speed * np.power(hub_height / 100, shear) if hub_height != 100 else wind_speed
    cf = np.zeros_like(ws)
    operating = (ws >= cut_in) & (ws <= cut_out)
    at_rated = operating & (ws >= rated_speed)
    cf[at_rated] = max_cf
    ramping = operating & (ws < rated_speed)
    raw_cf = np.power((ws[ramping] - cut_in) / (rated_speed - cut_in), exponent)
    cf[ramping] = np.minimum(raw_cf, max_cf)
    return cf

def calculate_correlation(actual, model):
    return np.corrcoef(actual, model)[0, 1]

def calculate_capacity_sweep_gap(actual_cf, model_cf):
    actual_avg = np.mean(actual_cf)
    n = len(actual_cf)
    gaps = []
    for gen_pct in [0, 25, 50, 75, 100, 125, 150]:
        scale = (gen_pct / 100) / (actual_avg * n)
        actual_match = sum(min(actual_cf[i] * scale, 1/n) for i in range(n)) * 100
        model_match = sum(min(model_cf[i] * scale, 1/n) for i in range(n)) * 100
        gaps.append(abs(actual_match - model_match))
    return np.mean(gaps)

# Coarser grid for speed
print("\nSearching parameter space...")

best_score = -np.inf
best_params = None
best_metrics = None

for cut_in in [3.0, 3.5, 4.0, 4.5, 5.0]:
    for rated_speed in [8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0]:
        for exponent in [2.0, 2.2, 2.4, 2.6, 2.8, 3.0]:
            for max_cf in [0.75, 0.78, 0.81, 0.84, 0.87, 0.90, 0.93]:
                if cut_in >= rated_speed:
                    continue

                model_cf = apply_power_curve(wind_speed, shear, 100, cut_in, rated_speed, 25, exponent, max_cf)
                r = calculate_correlation(actual_cf, model_cf)
                cf_error = abs(np.mean(model_cf) - np.mean(actual_cf))
                sweep_gap = calculate_capacity_sweep_gap(actual_cf, model_cf)

                # Score: maximize r, minimize CF error and sweep gap
                score = r - 2 * cf_error - 0.01 * sweep_gap

                if score > best_score:
                    best_score = score
                    best_params = {'cut_in': cut_in, 'rated_speed': rated_speed, 'exponent': exponent, 'max_cf': max_cf}
                    best_metrics = {'r': r, 'cf_error': cf_error, 'sweep_gap': sweep_gap, 'model_cf': np.mean(model_cf)}

print("\n" + "="*60)
print("OPTIMAL PARAMETERS")
print("="*60)
print(f"  cutIn:      {best_params['cut_in']}")
print(f"  ratedSpeed: {best_params['rated_speed']}")
print(f"  exponent:   {best_params['exponent']}")
print(f"  maxCf:      {best_params['max_cf']}")
print(f"  cutOut:     25")
print(f"  hubHeight:  100")

print("\nMETRICS")
print("-"*60)
print(f"  Correlation (r):     {best_metrics['r']:.4f}")
print(f"  R²:                  {best_metrics['r']**2*100:.1f}%")
print(f"  Actual avg CF:       {np.mean(actual_cf)*100:.2f}%")
print(f"  Model avg CF:        {best_metrics['model_cf']*100:.2f}%")
print(f"  CF error:            {best_metrics['cf_error']*100:.2f}pp")
print(f"  Capacity sweep gap:  {best_metrics['sweep_gap']:.2f}pp")

print("\n" + "="*60)
print("UPDATE constants.js OPTIMAL_PARAMS:")
print("="*60)
print(f"""
export const OPTIMAL_PARAMS = {{
  exponent: {best_params['exponent']},
  cutIn: {best_params['cut_in']},
  ratedSpeed: {best_params['rated_speed']},
  cutOut: 25,
  maxCf: {best_params['max_cf']},
  hubHeight: 100,
}}
""")
