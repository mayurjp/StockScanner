"""
NSE F&O Stocks Sector Mapping Dictionary
Maps major NSE F&O traded securities into standard industry sectors.
"""

SECTOR_MAPPING = {
    # Banking & Financial Services
    "HDFCBANK": "Banking & Financials",
    "ICICIBANK": "Banking & Financials",
    "SBIN": "Banking & Financials",
    "AXISBANK": "Banking & Financials",
    "KOTAKBANK": "Banking & Financials",
    "INDUSINDBK": "Banking & Financials",
    "BANKBARODA": "Banking & Financials",
    "PNB": "Banking & Financials",
    "CANBK": "Banking & Financials",
    "FEDERALBNK": "Banking & Financials",
    "IDFCFIRSTB": "Banking & Financials",
    "AUBANK": "Banking & Financials",
    "BANDHANBNK": "Banking & Financials",
    "BAJFINANCE": "Banking & Financials",
    "BAJAJFINSV": "Banking & Financials",
    "CHOLAFIN": "Banking & Financials",
    "MUTHOOTFIN": "Banking & Financials",
    "SHRIRAMFIN": "Banking & Financials",
    "M&MFIN": "Banking & Financials",
    "SBILIFE": "Banking & Financials",
    "HDFCLIFE": "Banking & Financials",
    "ICICIPRULI": "Banking & Financials",
    "ICICIGI": "Banking & Financials",
    "PFC": "Banking & Financials",
    "RECLTD": "Banking & Financials",
    "LICHSGFIN": "Banking & Financials",
    "MANAPPURAM": "Banking & Financials",
    "L&TFH": "Banking & Financials",

    # IT & Technology
    "TCS": "IT & Software",
    "INFY": "IT & Software",
    "HCLTECH": "IT & Software",
    "WIPRO": "IT & Software",
    "TECHM": "IT & Software",
    "LTIM": "IT & Software",
    "PERSISTENT": "IT & Software",
    "COFORGE": "IT & Software",
    "MPHASIS": "IT & Software",
    "LTTS": "IT & Software",
    "TATAELXSI": "IT & Software",
    "OFSS": "IT & Software",
    "KPITTECH": "IT & Software",
    "BSOFT": "IT & Software",

    # Automobiles & Auto Ancillaries
    "TATAMOTORS": "Automobile & Auto Parts",
    "M&M": "Automobile & Auto Parts",
    "MARUTI": "Automobile & Auto Parts",
    "BAJAJ-AUTO": "Automobile & Auto Parts",
    "EICHERMOT": "Automobile & Auto Parts",
    "HEROMOTOCO": "Automobile & Auto Parts",
    "TVSMOTOR": "Automobile & Auto Parts",
    "ASHOKLEY": "Automobile & Auto Parts",
    "BHARATFORG": "Automobile & Auto Parts",
    "BOSCHLTD": "Automobile & Auto Parts",
    "MRF": "Automobile & Auto Parts",
    "BALKRISIND": "Automobile & Auto Parts",
    "APOLLOTYRE": "Automobile & Auto Parts",
    "MOTHERSON": "Automobile & Auto Parts",
    "EXIDEIND": "Automobile & Auto Parts",
    "AMARARAJA": "Automobile & Auto Parts",
    "TIINDIA": "Automobile & Auto Parts",

    # Oil, Gas & Energy
    "RELIANCE": "Oil, Gas & Energy",
    "ONGC": "Oil, Gas & Energy",
    "NTPC": "Oil, Gas & Energy",
    "POWERGRID": "Oil, Gas & Energy",
    "COALINDIA": "Oil, Gas & Energy",
    "BPCL": "Oil, Gas & Energy",
    "IOC": "Oil, Gas & Energy",
    "HPCL": "Oil, Gas & Energy",
    "GAIL": "Oil, Gas & Energy",
    "TATAPOWER": "Oil, Gas & Energy",
    "ADANIGREEN": "Oil, Gas & Energy",
    "ADANIPOWER": "Oil, Gas & Energy",
    "PETRONET": "Oil, Gas & Energy",
    "IGL": "Oil, Gas & Energy",
    "MGL": "Oil, Gas & Energy",
    "GUJGASLTD": "Oil, Gas & Energy",
    "OIL": "Oil, Gas & Energy",

    # Metals & Mining
    "TATASTEEL": "Metals & Mining",
    "JSWSTEEL": "Metals & Mining",
    "HINDALCO": "Metals & Mining",
    "VEDL": "Metals & Mining",
    "JINDALSTEL": "Metals & Mining",
    "SAIL": "Metals & Mining",
    "NMDC": "Metals & Mining",
    "NATIONALUM": "Metals & Mining",
    "HINDCOPPER": "Metals & Mining",
    "HINDPETRO": "Metals & Mining",

    # Pharmaceuticals & Healthcare
    "SUNPHARMA": "Pharma & Healthcare",
    "DRREDDY": "Pharma & Healthcare",
    "CIPLA": "Pharma & Healthcare",
    "DIVISLAB": "Pharma & Healthcare",
    "APOLLOHOSP": "Pharma & Healthcare",
    "LUPIN": "Pharma & Healthcare",
    "AUROPHARMA": "Pharma & Healthcare",
    "TORNTPHARM": "Pharma & Healthcare",
    "ZYDUSLIFE": "Pharma & Healthcare",
    "ALKEM": "Pharma & Healthcare",
    "BIOCON": "Pharma & Healthcare",
    "GLENMARK": "Pharma & Healthcare",
    "IPCALAB": "Pharma & Healthcare",
    "GRANULES": "Pharma & Healthcare",
    "SYNGENE": "Pharma & Healthcare",
    "MAXHEALTH": "Pharma & Healthcare",

    # FMCG & Consumer Goods
    "ITC": "FMCG & Consumer",
    "HINDUNILVR": "FMCG & Consumer",
    "NESTLEIND": "FMCG & Consumer",
    "BRITANNIA": "FMCG & Consumer",
    "TATACONSUM": "FMCG & Consumer",
    "DABUR": "FMCG & Consumer",
    "GODREJCP": "FMCG & Consumer",
    "MARICO": "FMCG & Consumer",
    "COLPAL": "FMCG & Consumer",
    "UBL": "FMCG & Consumer",
    "MCDOWELL-N": "FMCG & Consumer",
    "VBL": "FMCG & Consumer",
    "RADICO": "FMCG & Consumer",
    "PAGEIND": "FMCG & Consumer",
    "BATAINDIA": "FMCG & Consumer",
    "TITAN": "FMCG & Consumer",
    "TRENT": "FMCG & Consumer",
    "ABFRL": "FMCG & Consumer",

    # Capital Goods, Defense & Infrastructure
    "LT": "Capital Goods & Infra",
    "BEL": "Capital Goods & Infra",
    "HAL": "Capital Goods & Infra",
    "BHEL": "Capital Goods & Infra",
    "SIEMENS": "Capital Goods & Infra",
    "ABB": "Capital Goods & Infra",
    "CUMMINSIND": "Capital Goods & Infra",
    "HAVELLS": "Capital Goods & Infra",
    "VOLTAS": "Capital Goods & Infra",
    "POLYCAB": "Capital Goods & Infra",
    "KEI": "Capital Goods & Infra",
    "ASTRAL": "Capital Goods & Infra",
    "GMRINFRA": "Capital Goods & Infra",
    "ADANIENT": "Capital Goods & Infra",
    "ADANIPORTS": "Capital Goods & Infra",

    # Cement & Building Materials
    "ULTRACEMCO": "Cement & Construction",
    "GRASIM": "Cement & Construction",
    "AMBUJACEM": "Cement & Construction",
    "ACC": "Cement & Construction",
    "SHREECEM": "Cement & Construction",
    "DALBHARAT": "Cement & Construction",
    "RAMCOCEM": "Cement & Construction",
    "JKCEMENT": "Cement & Construction",
    "PIDILITIND": "Cement & Construction",
    "BERGEPAINT": "Cement & Construction",
    "ASIANPAINT": "Cement & Construction",

    # Real Estate
    "DLF": "Real Estate",
    "GODREJPROP": "Real Estate",
    "OBEROIRLTY": "Real Estate",
    "PHOENIXLTD": "Real Estate",
    "PRESTIGE": "Real Estate",
    "BRIGADE": "Real Estate",
    "LODHA": "Real Estate",

    # Telecom, Media & Entertainment
    "BHARTIARTL": "Telecom & Media",
    "IDEA": "Telecom & Media",
    "INDUSTOWER": "Telecom & Media",
    "TATACOMM": "Telecom & Media",
    "ZEEL": "Telecom & Media",
    "SUNTV": "Telecom & Media",
    "PVRINOX": "Telecom & Media",

    # Chemicals & Fertilizers
    "SRF": "Chemicals & Agri",
    "PIIND": "Chemicals & Agri",
    "UPL": "Chemicals & Agri",
    "DEEPAKNTR": "Chemicals & Agri",
    "NAVINFLUOR": "Chemicals & Agri",
    "TATACHEM": "Chemicals & Agri",
    "COROMANDEL": "Chemicals & Agri",
    "CHAMBLFERT": "Chemicals & Agri",
    "GNFC": "Chemicals & Agri",
}

INDEX_SYMBOLS = {"NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "NIFTYNXT50", "NIFTYFPI", "NIFTYIT", "NIFTYPSE"}

def is_index_symbol(symbol: str) -> bool:
    """Return True if symbol is an index."""
    clean_sym = symbol.strip().upper()
    return clean_sym in INDEX_SYMBOLS or clean_sym.startswith("NIFTY")

def get_sector(symbol: str) -> str:
    """Return the sector for a given symbol, defaulting to 'Diversified / Others'."""
    clean_sym = symbol.strip().upper()
    return SECTOR_MAPPING.get(clean_sym, "Diversified / Others")
