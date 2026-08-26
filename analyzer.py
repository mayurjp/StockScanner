"""
NSE Derivatives Open Interest (OI) & Buildup Analyzer
Parses EOD Bhavcopy CSV, classifies stocks into Buildup categories,
calculates key derivatives metrics (Support/Resistance, PCR, Buyer Strength),
and outputs data/latest.json for the static web dashboard.
"""

import os
import sys
import csv
import json
import datetime
from sectors import get_sector, SECTOR_MAPPING, is_index_symbol
from fetcher import fetch_latest_bhavcopy

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_JSON = os.path.join(DATA_DIR, "latest.json")

def parse_float(val, default=0.0):
    try:
        if val is None or val == "" or val == "-":
            return default
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return default

def parse_int(val, default=0):
    try:
        if val is None or val == "" or val == "-":
            return default
        return int(float(str(val).replace(",", "").strip()))
    except (ValueError, TypeError):
        return default

def analyze_bhavcopy(csv_filepath: str, trade_date: str = None):
    """
    Reads Bhavcopy CSV (supporting standard NSE or Unified Bhavcopy formats)
    and produces structured derivatives metrics exclusively for STOCKS (excluding Indices).
    """
    print(f"[*] Analyzing Bhavcopy: {csv_filepath}")
    
    if not os.path.exists(csv_filepath):
        raise FileNotFoundError(f"Bhavcopy file not found: {csv_filepath}")

    # Data structures to accumulate
    # stocks[symbol] = { 'futures': [...], 'calls': {strike: oi}, 'puts': {strike: oi}, ... }
    stocks_data = {}
    
    with open(csv_filepath, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        headers = [h.strip().upper() for h in reader.fieldnames or []]
        
        # Determine format
        is_unified = "TCKRSYMB" in headers or "TCKR_SYMB" in headers or "FININSTRMTP" in headers
        
        for row in reader:
            # Clean keys
            r = {k.strip().upper(): (v.strip() if v else "") for k, v in row.items() if k}
            
            if is_unified:
                # Unified NSE Bhavcopy format (STF: Stock Futures, STO: Stock Options)
                inst_type = r.get("FININSTRMTP", "").upper()
                symbol = r.get("TCKRSYMB", r.get("TCKR_SYMB", "")).upper()
                expiry = r.get("XPRYDT", r.get("FININSTRMACTLXPRYDT", ""))
                strike = parse_float(r.get("STRKPRIC", 0.0))
                opt_type = r.get("OPTNTP", "XX").upper()
                open_px = parse_float(r.get("OPNPRIC", 0.0))
                high_px = parse_float(r.get("HGHPRIC", 0.0))
                low_px = parse_float(r.get("LWPRIC", 0.0))
                close_px = parse_float(r.get("CLSPRIC", r.get("LASTPRIC", 0.0)))
                prev_close = parse_float(r.get("PRVSCLSGPRIC", 0.0))
                settle_px = parse_float(r.get("STTLMPRIC", close_px))
                contracts = parse_int(r.get("TTLTRADGVOL", r.get("CONTRACTS", 0)))
                val_lakh = parse_float(r.get("TTLTRFVAL", 0.0)) / 100000.0 if "TTLTRFVAL" in r else 0.0
                open_interest = parse_int(r.get("OPNINTRST", 0))
                chg_in_oi = parse_int(r.get("CHNGINOPNINTRST", 0))
                date_val = r.get("TRADDT", r.get("BIZDT", trade_date or ""))
                
                # Exclude Index derivatives (IDF, IDO) - focus purely on single-stock derivatives
                is_future = inst_type in ["STF", "FUTSTK"] or (inst_type.startswith("FUT") and not inst_type.endswith("IDX"))
                is_option = inst_type in ["STO", "OPTSTK"] or (inst_type.startswith("OPT") and not inst_type.endswith("IDX"))
            else:
                # Standard legacy NSE Bhavcopy format
                inst_type = r.get("INSTRUMENT", "").upper()
                symbol = r.get("SYMBOL", "").upper()
                expiry = r.get("EXPIRY_DT", "")
                strike = parse_float(r.get("STRIKE_PR", 0.0))
                opt_type = r.get("OPTION_TYP", "XX").upper()
                open_px = parse_float(r.get("OPEN", 0.0))
                high_px = parse_float(r.get("HIGH", 0.0))
                low_px = parse_float(r.get("LOW", 0.0))
                close_px = parse_float(r.get("CLOSE", 0.0))
                settle_px = parse_float(r.get("SETTLE_PR", close_px))
                prev_close = parse_float(r.get("PREVCLOSE", settle_px))
                contracts = parse_int(r.get("CONTRACTS", 0))
                val_lakh = parse_float(r.get("VAL_INLAKH", 0.0))
                open_interest = parse_int(r.get("OPEN_INT", 0))
                chg_in_oi = parse_int(r.get("CHG_IN_OI", 0))
                date_val = r.get("TIMESTAMP", trade_date or "")
                
                # Exclude Index derivatives (FUTIDX, OPTIDX)
                is_future = inst_type in ["FUTSTK", "STF"]
                is_option = inst_type in ["OPTSTK", "STO"]

            # Filter out index symbols (NIFTY, BANKNIFTY, FINNIFTY, etc.)
            if not symbol or (not is_future and not is_option) or is_index_symbol(symbol):
                continue

            if trade_date is None and date_val:
                trade_date = date_val

            if symbol not in stocks_data:
                stocks_data[symbol] = {
                    "symbol": symbol,
                    "sector": get_sector(symbol),
                    "futures": [],
                    "calls": {},  # strike -> oi
                    "puts": {},   # strike -> oi
                    "total_call_oi": 0,
                    "total_put_oi": 0,
                }

            if is_future:
                stocks_data[symbol]["futures"].append({
                    "expiry": expiry,
                    "open": open_px,
                    "high": high_px,
                    "low": low_px,
                    "close": close_px,
                    "settle": settle_px,
                    "prev_close": prev_close,
                    "contracts": contracts,
                    "val_lakh": val_lakh,
                    "oi": open_interest,
                    "chg_oi": chg_in_oi,
                })
            elif is_option:
                if opt_type == "CE":
                    stocks_data[symbol]["calls"][strike] = stocks_data[symbol]["calls"].get(strike, 0) + open_interest
                    stocks_data[symbol]["total_call_oi"] += open_interest
                elif opt_type == "PE":
                    stocks_data[symbol]["puts"][strike] = stocks_data[symbol]["puts"].get(strike, 0) + open_interest
                    stocks_data[symbol]["total_put_oi"] += open_interest

    print(f"[*] Processed {len(stocks_data)} symbols. Calculating derivatives buildup metrics...")

    classified_results = []
    
    # Sector aggregation counters
    sector_summary = {}

    for symbol, data in stocks_data.items():
        if not data["futures"]:
            continue

        # Sort futures contracts by expiry date
        # Filter contracts that have positive volume or OI
        futures_contracts = sorted(data["futures"], key=lambda x: str(x["expiry"]))
        near_contract = futures_contracts[0]

        # Calculate Total Futures OI & Total Change
        total_fut_oi = sum(f["oi"] for f in futures_contracts)
        total_fut_oi_chg = sum(f["chg_oi"] for f in futures_contracts)
        total_contracts = sum(f["contracts"] for f in futures_contracts)
        total_val_lakh = sum(f["val_lakh"] for f in futures_contracts)

        # Base price and price change calculation
        # If prev_close is 0, estimate from settle or open
        current_px = near_contract["close"] if near_contract["close"] > 0 else near_contract["settle"]
        prev_px = near_contract["prev_close"]
        if prev_px <= 0 or abs(current_px - prev_px) < 0.0001:
            # If prev_close isn't distinct in single row, estimate from (settle - diff) or close vs open
            prev_px = near_contract["open"] if near_contract["open"] > 0 else current_px

        price_diff = current_px - prev_px
        price_chg_pct = (price_diff / prev_px * 100) if prev_px > 0 else 0.0

        # Previous day total OI for % calculation
        prev_total_oi = total_fut_oi - total_fut_oi_chg
        oi_chg_pct = (total_fut_oi_chg / prev_total_oi * 100) if prev_total_oi > 0 else 0.0

        # Buildup Classification Matrix:
        # Long Buildup: Price UP, OI UP
        # Short Buildup: Price DOWN, OI UP
        # Short Covering: Price UP, OI DOWN
        # Long Unwinding: Price DOWN, OI DOWN
        
        # Small deadband of 0.05% for flat movements
        if price_chg_pct >= 0.0 and oi_chg_pct >= 0.0:
            category = "Long Buildup"
            category_code = "LB"
            category_color = "emerald"
            action_tag = "Fresh Buying"
            sentiment = "Bullish"
            buyer_bias = "Buyers Aggressive"
        elif price_chg_pct < 0.0 and oi_chg_pct >= 0.0:
            category = "Short Buildup"
            category_code = "SB"
            category_color = "rose"
            action_tag = "Fresh Selling"
            sentiment = "Bearish"
            buyer_bias = "Sellers Aggressive"
        elif price_chg_pct >= 0.0 and oi_chg_pct < 0.0:
            category = "Short Covering"
            category_code = "SC"
            category_color = "sky"
            action_tag = "Shorts Exiting"
            sentiment = "Bullish Bounce"
            buyer_bias = "Short Squeeze / Relief"
        else: # price_chg_pct < 0 and oi_chg_pct < 0
            category = "Long Unwinding"
            category_code = "LU"
            category_color = "amber"
            action_tag = "Longs Exiting"
            sentiment = "Bearish Pullback"
            buyer_bias = "Profit Booking / Pullback"

        # Options Key Support & Resistance
        calls_dict = data["calls"]
        puts_dict = data["puts"]

        max_call_strike = max(calls_dict, key=calls_dict.get) if calls_dict else 0.0
        max_call_oi = calls_dict.get(max_call_strike, 0)
        
        max_put_strike = max(puts_dict, key=puts_dict.get) if puts_dict else 0.0
        max_put_oi = puts_dict.get(max_put_strike, 0)

        total_call_oi = data["total_call_oi"]
        total_put_oi = data["total_put_oi"]
        pcr = round(total_put_oi / total_call_oi, 2) if total_call_oi > 0 else 1.0

        # Top 5 strikes for detail modal chart
        all_strikes = sorted(set(list(calls_dict.keys()) + list(puts_dict.keys())))
        # Pick strikes closest to current price
        if all_strikes:
            strike_distances = sorted([(abs(s - current_px), s) for s in all_strikes])
            nearby_strikes = sorted([s for _, s in strike_distances[:9]])
            options_chain = [
                {
                    "strike": s,
                    "call_oi": calls_dict.get(s, 0),
                    "put_oi": puts_dict.get(s, 0)
                }
                for s in nearby_strikes
            ]
        else:
            options_chain = []

        # Buyer Conviction / Strength Score (0 to 100)
        # Combines magnitude of OI expansion + Price velocity + Volume
        conviction_score = 50
        if category_code == "LB":
            conviction_score = min(100, int(50 + (oi_chg_pct * 1.5) + (price_chg_pct * 5)))
        elif category_code == "SB":
            conviction_score = min(100, int(50 + (oi_chg_pct * 1.5) + (abs(price_chg_pct) * 5)))
        elif category_code == "SC":
            conviction_score = min(100, int(50 + (abs(oi_chg_pct) * 1.2) + (price_chg_pct * 4)))
        elif category_code == "LU":
            conviction_score = min(100, int(50 + (abs(oi_chg_pct) * 1.2) + (abs(price_chg_pct) * 4)))

        # Next-Day Actionable Edge Analysis Note
        if category_code == "LB":
            next_day_plan = f"Aggressive institutional buying (+{oi_chg_pct:.1f}% OI). Look for buy-on-dips near support strike {max_put_strike or round(current_px*0.98,1)}. Target next resistance at {max_call_strike or round(current_px*1.03,1)}."
        elif category_code == "SB":
            next_day_plan = f"Strong short buildup (+{oi_chg_pct:.1f}% OI). Ceilings established at {max_call_strike or round(current_px*1.02,1)}. Favour sell-on-rise or short continuation."
        elif category_code == "SC":
            next_day_plan = f"Shorts rushing to exit ({oi_chg_pct:.1f}% OI drop). Watch if fresh buyers enter at open for follow-through momentum."
        else:
            next_day_plan = f"Longs taking profits ({oi_chg_pct:.1f}% OI drop). Wait for support at {max_put_strike or round(current_px*0.98,1)} before considering fresh positions."

        item = {
            "symbol": symbol,
            "sector": data["sector"],
            "current_price": round(current_px, 2),
            "open_price": round(near_contract["open"], 2),
            "high_price": round(near_contract["high"], 2),
            "low_price": round(near_contract["low"], 2),
            "price_diff": round(price_diff, 2),
            "price_chg_pct": round(price_chg_pct, 2),
            "total_oi": total_fut_oi,
            "oi_chg": total_fut_oi_chg,
            "oi_chg_pct": round(oi_chg_pct, 2),
            "volume_contracts": total_contracts,
            "turnover_lakh": round(total_val_lakh, 2),
            "category": category,
            "category_code": category_code,
            "category_color": category_color,
            "action_tag": action_tag,
            "sentiment": sentiment,
            "buyer_bias": buyer_bias,
            "conviction_score": conviction_score,
            "max_call_strike": max_call_strike,
            "max_call_oi": max_call_oi,
            "max_put_strike": max_put_strike,
            "max_put_oi": max_put_oi,
            "pcr": pcr,
            "next_day_plan": next_day_plan,
            "futures_breakdown": [
                {
                    "expiry": f["expiry"],
                    "close": round(f["close"], 2),
                    "oi": f["oi"],
                    "chg_oi": f["chg_oi"],
                    "contracts": f["contracts"]
                }
                for f in futures_contracts
            ],
            "options_chain": options_chain
        }
        
        classified_results.append(item)

        # Update sector summary
        sec = data["sector"]
        if sec not in sector_summary:
            sector_summary[sec] = {
                "sector": sec,
                "total_stocks": 0,
                "long_buildup": 0,
                "short_buildup": 0,
                "short_covering": 0,
                "long_unwinding": 0,
                "net_oi_flow": 0,
                "avg_price_chg": 0.0,
                "symbols": []
            }
        sec_dict = sector_summary[sec]
        sec_dict["total_stocks"] += 1
        sec_dict["net_oi_flow"] += total_fut_oi_chg
        sec_dict["symbols"].append(symbol)
        if category_code == "LB":
            sec_dict["long_buildup"] += 1
        elif category_code == "SB":
            sec_dict["short_buildup"] += 1
        elif category_code == "SC":
            sec_dict["short_covering"] += 1
        elif category_code == "LU":
            sec_dict["long_unwinding"] += 1

    # Sort results by absolute OI Change % descending (most active buildup first)
    classified_results.sort(key=lambda x: abs(x["oi_chg_pct"]), reverse=True)

    # Market Summary Statistics
    total_stocks = len(classified_results)
    lb_count = sum(1 for x in classified_results if x["category_code"] == "LB")
    sb_count = sum(1 for x in classified_results if x["category_code"] == "SB")
    sc_count = sum(1 for x in classified_results if x["category_code"] == "SC")
    lu_count = sum(1 for x in classified_results if x["category_code"] == "LU")

    # Net Institutional Market Bias Calculation
    # Bullish Weight = (Long Buildup * 1.5) + (Short Covering * 0.8)
    # Bearish Weight = (Short Buildup * 1.5) + (Long Unwinding * 0.8)
    bullish_weight = (lb_count * 1.5) + (sc_count * 0.8)
    bearish_weight = (sb_count * 1.5) + (lu_count * 0.8)
    total_weight = bullish_weight + bearish_weight
    
    bullish_pct = round((bullish_weight / total_weight * 100), 1) if total_weight > 0 else 50.0
    if bullish_pct >= 60:
        market_bias = "Bullish Dominance (Heavy Long Buildup)"
        bias_color = "emerald"
    elif bullish_pct <= 40:
        market_bias = "Bearish Dominance (Heavy Short Buildup)"
        bias_color = "rose"
    else:
        market_bias = "Neutral / Stock-Specific Rotation"
        bias_color = "amber"

    # Top Gainers / Losers in OI
    top_long_buildup = [x for x in classified_results if x["category_code"] == "LB"][:5]
    top_short_buildup = [x for x in classified_results if x["category_code"] == "SB"][:5]
    top_short_covering = [x for x in classified_results if x["category_code"] == "SC"][:5]
    top_long_unwinding = [x for x in classified_results if x["category_code"] == "LU"][:5]

    # Sector summary list
    sector_list = list(sector_summary.values())
    for s in sector_list:
        tot = s["total_stocks"]
        s["bullish_ratio"] = round((s["long_buildup"] + s["short_covering"]) / tot * 100, 1) if tot > 0 else 50
    sector_list.sort(key=lambda x: x["bullish_ratio"], reverse=True)

    output_payload = {
        "metadata": {
            "trade_date": trade_date or datetime.date.today().strftime("%Y-%m-%d"),
            "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
            "total_stocks_scanned": total_stocks,
            "source": "NSE Derivatives Bhavcopy"
        },
        "summary": {
            "market_bias": market_bias,
            "bullish_pct": bullish_pct,
            "bias_color": bias_color,
            "counts": {
                "long_buildup": lb_count,
                "short_buildup": sb_count,
                "short_covering": sc_count,
                "long_unwinding": lu_count,
                "total": total_stocks
            },
            "top_picks": {
                "top_longs": [x["symbol"] for x in top_long_buildup],
                "top_shorts": [x["symbol"] for x in top_short_buildup],
                "top_short_covering": [x["symbol"] for x in top_short_covering],
            }
        },
        "sectors": sector_list,
        "stocks": classified_results
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print(f"[+] Successfully wrote analysis to: {OUTPUT_JSON}")
    return output_payload

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Analyze NSE F&O Open Interest Buildup")
    parser.add_argument("--file", type=str, help="Path to local Bhavcopy CSV file")
    parser.add_argument("--fetch", action="store_true", help="Fetch latest Bhavcopy from NSE")
    args = parser.parse_args()

    if args.file and os.path.exists(args.file):
        csv_file = args.file
        trade_date = None
    else:
        # Fetch or generate latest
        csv_file, trade_date = fetch_latest_bhavcopy()

    analyze_bhavcopy(csv_file, trade_date)

if __name__ == "__main__":
    main()
