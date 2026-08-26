# 📈 NSE OI Pulse — EOD Open Interest & Derivatives Buildup Scanner

A modern, automated, and static web dashboard that analyzes **National Stock Exchange of India (NSE)** daily End-of-Day (EOD) Open Interest (OI) and price movements for all F&O stocks. It classifies every stock into **Long Buildup**, **Short Buildup**, **Short Covering**, and **Long Unwinding**, pinpointing where aggressive institutional buyers and sellers are positioned for the next trading session.

---

## 🎯 How Derivatives Buildup Works for Next-Day Trading

| Buildup Type | Price Movement | Open Interest (OI) | Market Interpretation | Next-Day Trading Edge |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 **Long Buildup** | **Price ▲ (Up)** | **OI ▲ (Up)** | **Aggressive Buyers Entering**: Fresh capital being deployed by institutions expecting higher prices. | **High Bullish Conviction**: Look for buy-on-dips near support or breakout continuation entries. |
| 🔴 **Short Buildup** | **Price ▼ (Down)** | **OI ▲ (Up)** | **Aggressive Sellers Entering**: Fresh short positions created expecting further declines. | **High Bearish Conviction**: Ceilings established; favor sell-on-rise or short continuation. |
| 🔵 **Short Covering** | **Price ▲ (Up)** | **OI ▼ (Down)** | **Sellers Exiting / Short Squeeze**: Trapped short sellers rushing to square off positions. | **Bullish Bounce / Squeeze**: Watch for open strength; if fresh buying follows, can turn into huge rallies. |
| 🟡 **Long Unwinding** | **Price ▼ (Down)** | **OI ▼ (Down)** | **Buyers Closing / Profit Booking**: Long positions being liquidated. | **Pullback / Correction**: Upward momentum pausing; wait for support test before taking fresh longs. |

---

## 🌟 Key Features

1. **Institutional Market Sentiment Meter**: Evaluates net institutional bias (% Bullish vs Bearish) across all F&O stocks.
2. **Interactive 4-Quadrant Scatter Matrix**: Powered by Chart.js, visually maps every stock by Price % vs OI % with instant drill-down on click.
3. **Sectoral Institutional Flow Heatmap**: Discover which entire sectors (e.g. Banking, Auto, IT, Pharma, Metals) big money is rotating into.
4. **Options Support & Resistance**: Automatically calculates Max Put Strike (major support floor), Max Call Strike (major resistance ceiling), and Put-Call Ratio (PCR).
5. **Next-Day Trading Actionable Strategy**: Generates a tailored trading playbook for each stock with key trigger levels.
6. **Zero-Backend In-Browser Bhavcopy Parser**: Drag and drop any downloaded NSE Bhavcopy `.csv` directly into the web UI for instant in-browser processing!
7. **Automated Daily Deployment**: Includes a GitHub Actions workflow (`.github/workflows/eod_updater.yml`) to automatically fetch EOD Bhavcopy and publish updates to **GitHub Pages** every trading day at 18:15 IST completely free!

---

## 🚀 Quick Start (Running Locally)

### Step 1: Run the EOD Fetcher & Analyzer
```bash
python analyzer.py
```
This fetches the latest NSE Derivatives Bhavcopy, aggregates multi-expiry contracts, calculates all metrics, and outputs `data/latest.json`.

*To analyze a specific downloaded file:*
```bash
python analyzer.py --file path/to/fo27MAR2025bhav.csv
```

### Step 2: Launch the Web Dashboard
You can simply start Python's built-in lightweight local web server:
```bash
python -m http.server 8000
```
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🌐 Deploy to GitHub Pages (100% Free Automated Daily Updates)

1. Create a GitHub repository and push this codebase:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of NSE OI Scanner"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Go to **Settings > Pages** on your GitHub repository.
3. Under **Build and deployment > Source**, select **Deploy from a branch** and choose `main` branch `/ (root)`.
4. Your website is now live! The bundled GitHub Actions workflow will automatically run every weekday at 18:15 IST, process the day's Bhavcopy, and update the live dashboard without needing any server or maintenance.

---

## 📁 Project Structure

```
StockScanner/
├── .github/
│   └── workflows/
│       └── eod_updater.yml   # Daily 18:15 IST automated scraper & deployer
├── data/
│   ├── latest.json           # Pre-computed EOD analysis payload
│   └── downloads/            # Local Bhavcopy CSV cache
├── analyzer.py               # Main derivatives processor & buildup classifier
├── fetcher.py                # NSE Bhavcopy downloader & realistic generator
├── sectors.py                # Comprehensive NSE F&O stock sector dictionary
├── index.html                # Modern static dashboard UI
├── styles.css                # Financial terminal dark theme styling
├── app.js                    # Interactive Chart.js & filtering frontend logic
├── requirements.txt          # Python dependencies
└── README.md                 # Project guide and documentation
```
