#!/usr/bin/env python3
"""
Preprocess SD_test.csv and ERA5 parquet data into a single JSON file.

Usage:
    python preprocess.py

Output:
    preprocessed.json - 8760 records with actual CF and ERA5 wind data
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path

# File paths
SD_CSV = Path("/Users/nathaniyer/Desktop/GEE/SD_test.csv")
ERA5_PARQUET = Path("/Users/nathaniyer/Desktop/GEE/data/era5_2024_lat_44.3_lon_-96.5.parquet")
OUTPUT_JSON = Path(__file__).parent / "preprocessed.json"

# Constants
HOURS_PER_YEAR = 8760
TIMEZONE_OFFSET = 6  # Central Time is UTC-6


def load_actual_production():
    """Load SD_test.csv and convert to capacity factor."""
    df = pd.read_csv(SD_CSV)

    # Extract production column (handle various column formats)
    if 'Production Wh' in df.columns:
        production_wh = df['Production Wh'].values
    else:
        # Try second column
        production_wh = df.iloc[:, 1].values

    # Clean the data - convert to numeric, handle any non-numeric values
    production_series = pd.to_numeric(pd.Series(production_wh), errors='coerce').fillna(0)
    production_wh = production_series.values

    # Calculate nameplate capacity from max value
    max_production = np.max(production_wh)
    nameplate_mw = max_production / 1e6  # Convert Wh to MWh for max hourly = nameplate MW
    print(f"Nameplate capacity: {nameplate_mw:.2f} MW")

    # Convert Wh to capacity factor: cf = production_wh / (nameplate_mw * 1e6)
    cf = production_wh / (nameplate_mw * 1e6)

    # Ensure 8760 records
    if len(cf) > HOURS_PER_YEAR:
        cf = cf[:HOURS_PER_YEAR]
    elif len(cf) < HOURS_PER_YEAR:
        # Pad with zeros if needed
        cf = np.pad(cf, (0, HOURS_PER_YEAR - len(cf)), mode='constant', constant_values=0)

    avg_cf = np.mean(cf)
    print(f"Actual average CF: {avg_cf:.4f} ({avg_cf*100:.2f}%)")

    return cf, nameplate_mw


def load_era5_data():
    """Load ERA5 parquet and extract wind data."""
    df = pd.read_parquet(ERA5_PARQUET)

    print(f"ERA5 columns: {list(df.columns)}")
    print(f"ERA5 shape: {df.shape}")

    # Extract relevant columns
    wind_speed = df['wind_speed_100m'].values if 'wind_speed_100m' in df.columns else df['u100'].values

    # Try to get shear exponent and air density if available
    shear = df['shear_exponent'].values if 'shear_exponent' in df.columns else np.full(len(wind_speed), 0.14)
    density = df['air_density'].values if 'air_density' in df.columns else np.full(len(wind_speed), 1.225)

    # Ensure 8760 records
    if len(wind_speed) > HOURS_PER_YEAR:
        wind_speed = wind_speed[:HOURS_PER_YEAR]
        shear = shear[:HOURS_PER_YEAR]
        density = density[:HOURS_PER_YEAR]

    print(f"Wind speed range: {np.min(wind_speed):.2f} - {np.max(wind_speed):.2f} m/s")
    print(f"Mean wind speed: {np.mean(wind_speed):.2f} m/s")

    return wind_speed, shear, density


def apply_timezone_shift(data, shift):
    """
    Apply timezone shift: local time → UTC.
    Positive shift rolls data forward (for local time behind UTC).
    """
    return np.roll(data, shift)


def main():
    print("Loading actual production data...")
    actual_cf, nameplate_mw = load_actual_production()

    print("\nLoading ERA5 data...")
    wind_speed, shear, density = load_era5_data()

    # Apply timezone shift to actual data (local Central Time to UTC)
    print(f"\nApplying +{TIMEZONE_OFFSET} hour timezone shift to actual data...")
    actual_cf_shifted = apply_timezone_shift(actual_cf, TIMEZONE_OFFSET)

    # Create output data
    records = []
    for i in range(HOURS_PER_YEAR):
        records.append({
            "hour": i,
            "actual_cf": round(float(actual_cf_shifted[i]), 6),
            "wind_speed_100m": round(float(wind_speed[i]), 4),
            "shear_exponent": round(float(shear[i]), 4),
            "air_density": round(float(density[i]), 4)
        })

    # Create output object with metadata
    output = {
        "metadata": {
            "location": "South Dakota",
            "lat": 44.3,
            "lon": -96.5,
            "year": 2024,
            "nameplate_mw": round(nameplate_mw, 2),
            "actual_avg_cf": round(float(np.mean(actual_cf)), 4),
            "timezone_shift": TIMEZONE_OFFSET,
            "hours": HOURS_PER_YEAR
        },
        "hourly": records
    }

    # Write JSON
    print(f"\nWriting output to {OUTPUT_JSON}...")
    with open(OUTPUT_JSON, 'w') as f:
        json.dump(output, f)

    print(f"Done! Output size: {OUTPUT_JSON.stat().st_size / 1024:.1f} KB")

    # Verification
    print("\n--- Verification ---")
    print(f"Total hours: {len(records)}")
    print(f"Actual CF range: {np.min(actual_cf_shifted):.4f} - {np.max(actual_cf_shifted):.4f}")
    print(f"Wind speed range: {np.min(wind_speed):.2f} - {np.max(wind_speed):.2f} m/s")


if __name__ == "__main__":
    main()
