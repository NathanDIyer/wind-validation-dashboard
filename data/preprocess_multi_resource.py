#!/usr/bin/env python3
"""
Preprocess solar and wind2 parquet data for multi-resource capacity sweep.

Usage:
    python preprocess_multi_resource.py

Output:
    ../public/data/multi_resource.json - solar CF and wind2 data for 8760 hours
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path

# File paths
DATA_DIR = Path("/Users/nathaniyer/Desktop/GEE/data")
SOLAR_PARQUET = DATA_DIR / "era5_solar_2024_lat_39.83_lon_-98.58.parquet"
WIND2_PARQUET = DATA_DIR / "era5_2024_lat_42.16_lon_-106.17.parquet"
OUTPUT_JSON = Path(__file__).parent.parent / "public" / "data" / "multi_resource.json"

# Constants
HOURS_PER_YEAR = 8760
TIMEZONE_OFFSET = 6  # Central Time is UTC-6
STANDARD_IRRADIANCE = 1000  # W/m2 for CF calculation


def load_solar_data():
    """Load solar parquet and convert GHI to capacity factor."""
    df = pd.read_parquet(SOLAR_PARQUET)
    print(f"Solar columns: {list(df.columns)}")
    print(f"Solar shape: {df.shape}")

    # Extract GHI in W/m2
    ghi = df['ghi_wm2'].values

    # Convert to capacity factor: CF = GHI / 1000, capped at 1
    cf = np.clip(ghi / STANDARD_IRRADIANCE, 0, 1)

    # Truncate to 8760 hours (2024 is a leap year with 8784 hours)
    if len(cf) > HOURS_PER_YEAR:
        cf = cf[:HOURS_PER_YEAR]

    avg_cf = np.mean(cf)
    print(f"Solar average CF: {avg_cf:.4f} ({avg_cf*100:.2f}%)")
    print(f"Solar max CF: {np.max(cf):.4f}")

    return cf, avg_cf


def load_wind2_data():
    """Load wind2 parquet and extract wind speed and shear."""
    df = pd.read_parquet(WIND2_PARQUET)
    print(f"\nWind2 columns: {list(df.columns)}")
    print(f"Wind2 shape: {df.shape}")

    wind_speed = df['wind_speed_100m'].values
    shear = df['shear_exponent'].values if 'shear_exponent' in df.columns else np.full(len(wind_speed), 0.14)

    # Truncate to 8760 hours
    if len(wind_speed) > HOURS_PER_YEAR:
        wind_speed = wind_speed[:HOURS_PER_YEAR]
        shear = shear[:HOURS_PER_YEAR]

    print(f"Wind2 speed range: {np.min(wind_speed):.2f} - {np.max(wind_speed):.2f} m/s")
    print(f"Wind2 mean speed: {np.mean(wind_speed):.2f} m/s")

    return wind_speed, shear


def apply_timezone_shift(data, shift):
    """
    Apply timezone shift for alignment with main wind data.
    Central Time = UTC-6, so roll forward by 6 hours.
    """
    return np.roll(data, shift)


def main():
    print("Loading solar data (Kansas)...")
    solar_cf, solar_avg_cf = load_solar_data()

    print("\nLoading wind2 data (Wyoming)...")
    wind2_speed, wind2_shear = load_wind2_data()

    # Apply timezone shift to align with UTC-based ERA5 data
    print(f"\nApplying +{TIMEZONE_OFFSET} hour timezone shift for alignment...")
    solar_cf_shifted = apply_timezone_shift(solar_cf, TIMEZONE_OFFSET)
    wind2_speed_shifted = apply_timezone_shift(wind2_speed, TIMEZONE_OFFSET)
    wind2_shear_shifted = apply_timezone_shift(wind2_shear, TIMEZONE_OFFSET)

    # Create output data
    output = {
        "solar": {
            "location": "Kansas",
            "lat": 39.83,
            "lon": -98.58,
            "avg_cf": round(float(np.mean(solar_cf_shifted)), 4),
            "cf": [round(float(v), 6) for v in solar_cf_shifted]
        },
        "wind2": {
            "location": "Wyoming",
            "lat": 42.16,
            "lon": -106.17,
            "wind_speed_100m": [round(float(v), 4) for v in wind2_speed_shifted],
            "shear_exponent": [round(float(v), 4) for v in wind2_shear_shifted]
        }
    }

    # Ensure output directory exists
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    # Write JSON
    print(f"\nWriting output to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(output, f)

    print(f"Done! Output size: {OUTPUT_JSON.stat().st_size / 1024:.1f} KB")

    # Verification
    print("\n--- Verification ---")
    print(f"Solar CF hours: {len(output['solar']['cf'])}")
    print(f"Solar avg CF: {output['solar']['avg_cf']:.4f}")
    print(f"Wind2 speed hours: {len(output['wind2']['wind_speed_100m'])}")
    print(f"Wind2 shear hours: {len(output['wind2']['shear_exponent'])}")


if __name__ == "__main__":
    main()
