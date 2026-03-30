#!/usr/bin/env python3
"""
Stock Market Trading Volume and Volatility Analysis
Hadoop MapReduce Simulation in Python

Job 1: Volume & Basic Statistics (Mapper + Combiner + Reducer)
Job 2: Top 10 Highest Average Volume (Chaining Job)
"""

import csv
import sys
import json
import io
from collections import defaultdict


# ============================================================
# JOB 1 - MAPPER
# Reads CSV rows and emits keyed intermediate records
# ============================================================

def job1_mapper(rows, filename="unknown.csv"):
    """
    Mapper for Job 1.
    Input: list of dicts (CSV rows)
    Output: list of (symbol, type, value) tuples
    """
    emissions = []

    for row in rows:
        try:
            # Detect header rows and skip them
            date_val = row.get("Date", row.get("date", "")).strip()
            if date_val.lower() in ("date", ""):
                continue

            # Try to extract symbol from the row, fall back to filename stem
            symbol = (
                row.get("Symbol", row.get("symbol", row.get("Ticker", row.get("ticker", ""))))
                .strip()
                .upper()
            )
            if not symbol:
                # Use filename without extension as symbol
                symbol = filename.replace(".csv", "").replace(".CSV", "").upper()

            volume = float(row.get("Volume", row.get("volume", 0)) or 0)
            open_p = float(row.get("Open", row.get("open", 0)) or 0)
            close_p = float(row.get("Close", row.get("close", row.get("Adj Close", row.get("adj close", 0)))) or 0)
            high_p = float(row.get("High", row.get("high", 0)) or 0)
            low_p = float(row.get("Low", row.get("low", 0)) or 0)

            # Validate data
            if volume <= 0 or open_p <= 0 or close_p <= 0:
                continue

            daily_return = close_p - open_p
            daily_range = high_p - low_p if high_p > 0 and low_p > 0 else 0

            # Emit three types of values per row
            emissions.append((symbol, "VOLUME", volume))
            emissions.append((symbol, "RETURN", daily_return))
            emissions.append((symbol, "RANGE", daily_range))

        except (ValueError, TypeError, KeyError):
            continue

    return emissions


# ============================================================
# JOB 1 - COMBINER (mini-reducer to reduce data before shuffle)
# ============================================================

def job1_combiner(emissions):
    """
    Combiner for Job 1.
    Groups by (symbol, type) and does partial aggregation.
    Output: list of (symbol, type, partial_sum, partial_count)
    """
    partial = defaultdict(lambda: {"sum": 0.0, "count": 0})

    for symbol, record_type, value in emissions:
        key = (symbol, record_type)
        partial[key]["sum"] += value
        partial[key]["count"] += 1

    result = []
    for (symbol, record_type), agg in partial.items():
        result.append((symbol, record_type, agg["sum"], agg["count"]))

    return result


# ============================================================
# JOB 1 - REDUCER
# Aggregates combined records into final statistics per symbol
# ============================================================

def job1_reducer(combined_records):
    """
    Reducer for Job 1.
    Input: list of (symbol, type, partial_sum, partial_count)
    Output: list of final statistics dicts
    """
    aggregated = defaultdict(lambda: {
        "volume_sum": 0.0, "volume_count": 0,
        "return_sum": 0.0, "return_count": 0,
        "range_sum": 0.0, "range_count": 0,
    })

    for symbol, record_type, partial_sum, partial_count in combined_records:
        agg = aggregated[symbol]
        if record_type == "VOLUME":
            agg["volume_sum"] += partial_sum
            agg["volume_count"] += partial_count
        elif record_type == "RETURN":
            agg["return_sum"] += partial_sum
            agg["return_count"] += partial_count
        elif record_type == "RANGE":
            agg["range_sum"] += partial_sum
            agg["range_count"] += partial_count

    results = []
    for symbol, agg in aggregated.items():
        count = agg["volume_count"]
        if count == 0:
            continue
        total_volume = agg["volume_sum"]
        avg_volume = total_volume / count
        avg_return = agg["return_sum"] / agg["return_count"] if agg["return_count"] > 0 else 0
        avg_range = agg["range_sum"] / agg["range_count"] if agg["range_count"] > 0 else 0

        results.append({
            "symbol": symbol,
            "totalVolume": total_volume,
            "avgVolume": avg_volume,
            "tradingDays": count,
            "avgDailyReturn": avg_return,
            "avgPriceRange": avg_range,
        })

    return results


# ============================================================
# JOB 2 - MAPPER (Input: Job 1 output)
# Emits (negative_avg_volume, symbol) for descending sort
# ============================================================

def job2_mapper(job1_results):
    """
    Mapper for Job 2 - Top 10 by average volume.
    Emits (-avgVolume, symbol) so natural sort is descending.
    """
    emissions = []
    for record in job1_results:
        # Use negative avg volume as key for descending sort
        neg_avg_volume = -record["avgVolume"]
        emissions.append((neg_avg_volume, record["symbol"], record["avgVolume"], record["totalVolume"]))
    return emissions


# ============================================================
# JOB 2 - REDUCER (Finds Top 10 using a sorted list)
# ============================================================

def job2_reducer(job2_mapped):
    """
    Reducer for Job 2.
    Uses sorted list to keep only top 10 records.
    """
    # Sort by negative avg_volume (ascending = descending by actual volume)
    sorted_records = sorted(job2_mapped, key=lambda x: x[0])
    top10 = sorted_records[:10]

    results = []
    for rank, (neg_avg_vol, symbol, avg_volume, total_volume) in enumerate(top10, start=1):
        results.append({
            "rank": rank,
            "symbol": symbol,
            "avgVolume": avg_volume,
            "totalVolume": total_volume,
        })

    return results


# ============================================================
# MAIN RUNNER: orchestrates the chained MapReduce jobs
# ============================================================

def run_analysis(csv_contents):
    """
    Main function: runs Job 1 then Job 2 (chained MapReduce).

    Args:
        csv_contents: list of (filename, csv_text) tuples

    Returns:
        dict with volumeStats, top10, volatility, filesProcessed, rowsProcessed
    """
    all_emissions = []
    files_processed = 0
    rows_processed = 0

    # ---- JOB 1: MAP phase ----
    for filename, csv_text in csv_contents:
        try:
            reader = csv.DictReader(io.StringIO(csv_text))
            rows = list(reader)
            rows_processed += len(rows)
            emissions = job1_mapper(rows, filename)
            all_emissions.extend(emissions)
            files_processed += 1
        except Exception as e:
            sys.stderr.write(f"Error processing {filename}: {e}\n")
            continue

    # ---- JOB 1: COMBINE phase (local aggregation before reduce) ----
    combined = job1_combiner(all_emissions)

    # ---- JOB 1: REDUCE phase ----
    job1_output = job1_reducer(combined)

    # ---- JOB 2: MAP phase (chained from Job 1 output) ----
    job2_mapped = job2_mapper(job1_output)

    # ---- JOB 2: REDUCE phase (top 10) ----
    top10 = job2_reducer(job2_mapped)

    # ---- Build volatility output (sorted by avgPriceRange descending) ----
    volatility = sorted(
        [
            {
                "symbol": r["symbol"],
                "avgPriceRange": r["avgPriceRange"],
                "avgDailyReturn": r["avgDailyReturn"],
                "tradingDays": r["tradingDays"],
            }
            for r in job1_output
        ],
        key=lambda x: x["avgPriceRange"],
        reverse=True,
    )

    # ---- Sort volume stats by totalVolume descending ----
    volume_stats = sorted(job1_output, key=lambda x: x["totalVolume"], reverse=True)

    return {
        "volumeStats": volume_stats,
        "top10": top10,
        "volatility": volatility,
        "filesProcessed": files_processed,
        "rowsProcessed": rows_processed,
    }


if __name__ == "__main__":
    """
    CLI mode: reads JSON from stdin (array of {filename, content}),
    writes JSON result to stdout.
    """
    input_data = json.load(sys.stdin)
    csv_contents = [(item["filename"], item["content"]) for item in input_data]
    result = run_analysis(csv_contents)
    print(json.dumps(result))
