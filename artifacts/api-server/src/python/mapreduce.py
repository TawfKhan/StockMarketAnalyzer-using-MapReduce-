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
# UTILITY: safe numeric parsing
# ============================================================

def parse_int_volume(raw) -> int:
    """
    Convert a volume value to int (Long equivalent).
    Handles comma-formatted numbers like "1,234,567".
    """
    if raw is None:
        return 0
    s = str(raw).strip().replace(",", "").replace(" ", "")
    if not s:
        return 0
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return 0


def parse_float(raw) -> float:
    """
    Convert a price value to float.
    Handles comma-formatted numbers like "1,234.56".
    """
    if raw is None:
        return 0.0
    s = str(raw).strip().replace(",", "").replace(" ", "")
    if not s:
        return 0.0
    try:
        return float(s)
    except (ValueError, TypeError):
        return 0.0


# ============================================================
# JOB 1 - MAPPER
# Reads CSV rows and emits keyed intermediate records
# ============================================================

def job1_mapper(rows, filename="unknown.csv"):
    """
    Mapper for Job 1.
    Input: list of dicts (CSV rows)
    Output: list of (symbol, type, value) tuples

    Emits per row:
      Key=Symbol  Value="VOLUME:" + volume  (as int/Long)
      Key=Symbol  Value="RETURN:" + (Close - Open)
      Key=Symbol  Value="RANGE:"  + (High - Low)
    """
    emissions = []

    for row in rows:
        try:
            # Skip empty rows
            if not any(row.values()):
                continue

            # DictReader already strips the header row, but guard against
            # files where the header is repeated mid-file
            date_val = row.get("Date", row.get("date", "")).strip()
            if date_val.lower() in ("date", ""):
                continue

            # Extract symbol; fall back to filename stem if no Symbol column
            symbol = (
                row.get("Symbol", row.get("symbol", row.get("Ticker", row.get("ticker", ""))))
                .strip()
                .upper()
            )
            if not symbol:
                symbol = filename.rsplit(".", 1)[0].upper()

            # Parse numeric fields — handles commas (e.g. "1,234,567")
            volume  = parse_int_volume(row.get("Volume", row.get("volume")))
            open_p  = parse_float(row.get("Open",  row.get("open")))
            close_p = parse_float(
                row.get("Close", row.get("close",
                row.get("Adj Close", row.get("adj close"))))
            )
            high_p  = parse_float(row.get("High", row.get("high")))
            low_p   = parse_float(row.get("Low",  row.get("low")))

            # Validate: skip rows with missing or zero essential fields
            if volume <= 0 or open_p <= 0 or close_p <= 0:
                continue

            daily_return = close_p - open_p
            daily_range  = (high_p - low_p) if (high_p > 0 and low_p > 0) else 0.0

            # Emit three key-value pairs per row (as spec: VOLUME, RETURN, RANGE)
            emissions.append((symbol, "VOLUME", volume))
            emissions.append((symbol, "RETURN", daily_return))
            emissions.append((symbol, "RANGE",  daily_range))

        except (ValueError, TypeError, KeyError, AttributeError):
            continue

    return emissions


# ============================================================
# JOB 1 - COMBINER
# Mini-reducer that runs locally per mapper output (per file/split)
# to reduce data volume before the shuffle phase.
# Functionally identical to the reducer for associative operations.
# ============================================================

def job1_combiner(emissions):
    """
    Combiner for Job 1.
    Runs on a single mapper's output (per file/split).
    Groups by (symbol, type) and performs partial sum + count aggregation.
    Output: list of (symbol, type, partial_sum, partial_count)
    """
    partial = defaultdict(lambda: {"sum": 0.0, "count": 0})

    for symbol, record_type, value in emissions:
        key = (symbol, record_type)
        partial[key]["sum"]   += value
        partial[key]["count"] += 1

    return [
        (symbol, record_type, agg["sum"], agg["count"])
        for (symbol, record_type), agg in partial.items()
    ]


# ============================================================
# JOB 1 - REDUCER
# Aggregates all combined records into final per-symbol statistics
# ============================================================

def job1_reducer(combined_records):
    """
    Reducer for Job 1.
    Input: list of (symbol, type, partial_sum, partial_count)
           (may come from multiple combiners / multiple files)
    Output: list of final statistics dicts

    Output format per symbol:
      Symbol  TotalVolume  AvgVolume  AvgReturn  AvgRange
    """
    aggregated = defaultdict(lambda: {
        "volume_sum":   0,    # int (Long)
        "volume_count": 0,
        "return_sum":   0.0,
        "return_count": 0,
        "range_sum":    0.0,
        "range_count":  0,
    })

    for symbol, record_type, partial_sum, partial_count in combined_records:
        agg = aggregated[symbol]
        if record_type == "VOLUME":
            agg["volume_sum"]   += int(partial_sum)   # keep as Long
            agg["volume_count"] += partial_count
        elif record_type == "RETURN":
            agg["return_sum"]   += partial_sum
            agg["return_count"] += partial_count
        elif record_type == "RANGE":
            agg["range_sum"]   += partial_sum
            agg["range_count"] += partial_count

    results = []
    for symbol, agg in aggregated.items():
        count = agg["volume_count"]
        if count == 0:
            continue

        total_volume = agg["volume_sum"]                         # int (Long)
        avg_volume   = total_volume / count
        avg_return   = agg["return_sum"]  / agg["return_count"]  if agg["return_count"]  > 0 else 0.0
        avg_range    = agg["range_sum"]   / agg["range_count"]   if agg["range_count"]   > 0 else 0.0

        results.append({
            "symbol":         symbol,
            "totalVolume":    total_volume,   # int (Long)
            "avgVolume":      avg_volume,
            "tradingDays":    count,
            "avgDailyReturn": avg_return,
            "avgPriceRange":  avg_range,
        })

    return results


# ============================================================
# JOB 2 - MAPPER (Input: Job 1 output)
# Emits (-avgVolume, symbol) so natural ascending sort = descending volume
# ============================================================

def job2_mapper(job1_results):
    """
    Mapper for Job 2 - Top 10 by average volume.
    Emits key = -avgVolume (negative for descending sort),
          value = (symbol, avgVolume, totalVolume)
    """
    return [
        (-record["avgVolume"], record["symbol"], record["avgVolume"], record["totalVolume"])
        for record in job1_results
    ]


# ============================================================
# JOB 2 - REDUCER
# Selects Top 10 using a sorted structure (equivalent to TreeMap)
# ============================================================

def job2_reducer(job2_mapped):
    """
    Reducer for Job 2.
    Sorts all records by the negative-avg-volume key (ascending)
    which gives descending order by actual avg volume.
    Keeps only the top 10 (equivalent to a TreeMap with size limit).
    """
    sorted_records = sorted(job2_mapped, key=lambda x: x[0])
    top10 = sorted_records[:10]

    return [
        {
            "rank":        rank,
            "symbol":      symbol,
            "avgVolume":   avg_volume,
            "totalVolume": total_volume,
        }
        for rank, (neg_avg_vol, symbol, avg_volume, total_volume)
        in enumerate(top10, start=1)
    ]


# ============================================================
# MAIN RUNNER: orchestrates the two chained MapReduce jobs
# ============================================================

def run_analysis(csv_contents):
    """
    Runs Job 1 then Job 2 (chained MapReduce).

    Hadoop simulation fidelity:
      - Each file is treated as one input split / mapper task.
      - The Combiner runs locally per mapper (per file), reducing data
        before the global shuffle to the Reducer.
      - Job 2 takes Job 1's output as its input (job chaining).

    Args:
        csv_contents: list of (filename, csv_text) tuples

    Returns:
        dict with volumeStats, top10, volatility, filesProcessed, rowsProcessed
    """
    all_combined   = []   # collected combiner outputs from all mappers
    files_processed = 0
    rows_processed  = 0
    skipped_rows    = 0

    # ---- JOB 1: MAP + COMBINE phase (per file / per mapper split) ----
    for filename, csv_text in csv_contents:
        try:
            # Use utf-8-sig to strip BOM (\ufeff) produced by Excel/Windows
            reader = csv.DictReader(io.TextIOWrapper(
                io.BytesIO(csv_text.encode("utf-8")), encoding="utf-8-sig"
            ))
            rows = list(reader)
            rows_processed += len(rows)

            # MAP: emit intermediate key-value pairs
            emissions = job1_mapper(rows, filename)

            # COMBINE: local aggregation per mapper (per file)
            # This mirrors Hadoop's combiner running on the same node as the mapper
            per_file_combined = job1_combiner(emissions)
            all_combined.extend(per_file_combined)

            valid = len(emissions) // 3   # 3 emissions per valid row
            skipped_rows += len(rows) - valid
            files_processed += 1

        except Exception as e:
            sys.stderr.write(f"Error processing {filename}: {e}\n")
            continue

    # ---- JOB 1: REDUCE phase (global aggregation) ----
    job1_output = job1_reducer(all_combined)

    # ---- JOB 2: MAP phase (chained from Job 1 output) ----
    job2_mapped = job2_mapper(job1_output)

    # ---- JOB 2: REDUCE phase (select top 10) ----
    top10 = job2_reducer(job2_mapped)

    # ---- Build Folder 3: Volatility output (sorted by avgPriceRange desc) ----
    volatility = sorted(
        [
            {
                "symbol":         r["symbol"],
                "avgPriceRange":  r["avgPriceRange"],
                "avgDailyReturn": r["avgDailyReturn"],
                "tradingDays":    r["tradingDays"],
            }
            for r in job1_output
        ],
        key=lambda x: x["avgPriceRange"],
        reverse=True,
    )

    # ---- Build Folder 1: Volume stats (sorted by totalVolume desc) ----
    volume_stats = sorted(job1_output, key=lambda x: x["totalVolume"], reverse=True)

    return {
        "volumeStats":    volume_stats,
        "top10":          top10,
        "volatility":     volatility,
        "filesProcessed": files_processed,
        "rowsProcessed":  rows_processed,
    }


if __name__ == "__main__":
    """
    CLI mode: reads JSON from stdin (array of {filename, content}),
    writes JSON result to stdout.
    """
    input_data  = json.load(sys.stdin)
    csv_contents = [(item["filename"], item["content"]) for item in input_data]
    result      = run_analysis(csv_contents)
    print(json.dumps(result))
