# Wind Validation Dashboard

Interactive React dashboard for validating ERA5 wind model against actual South Dakota 2024 production data.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open in browser
open http://localhost:3001
```

## Data Preprocessing

If you need to regenerate the data file:

```bash
cd data
python3 preprocess.py
cp preprocessed.json ../public/data/
```

## Features

- **Parameter Sliders**: Adjust power curve parameters (exponent, cut-in, rated speed, cut-out, max CF, hub height)
- **Weekly Comparison**: Side-by-side 168-hour charts for any two weeks
- **Scatter Plot**: Correlation scatter with r and R² statistics
- **Duration Curves**: Sorted CF curves showing distribution alignment
- **Capacity Sweep**: Hourly matching % vs annual GWh

## Optimal Parameters

From validation study:
- Power exponent: 2.5
- Cut-in speed: 1.5 m/s
- Rated speed: 8.9 m/s
- Cut-out speed: 25 m/s
- Max CF: 0.84

These parameters achieve r = 0.855 (R² = 73.0%) correlation with <0.2pp capacity sweep error.

## Data Sources

- `SD_test.csv`: South Dakota wind farm hourly production (Wh)
- `era5_2024_lat_44.3_lon_-96.5.parquet`: ERA5 wind data (100m wind speed, shear, density)
