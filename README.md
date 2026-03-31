# Stock Market Analyzer (using MapReduce)
A full-stack, distributed MapReduce simulation tool for analyzing stock market volume and volatility. This project demonstrates how large datasets can be processed using an Express/Node.js backend that orchestrates Python-based MapReduce logic, visualized through a modern, high-tech React dashboard.
![Dashboard Preview](https://github.com/TawfKhan/StockMarketAnalyzer-using-MapReduce-/raw/main/preview.png) *(Placeholder - Upload your screenshot here)*
## 🚀 Features
- **Real-time MapReduce Simulation**: Watch the "Mapper" and "Reducer" phases in action with a terminal-style animation.
- **Volume Statistics**: Comprehensive analysis of trading volumes including Mean, Median, and Standard Deviation.
- **Market Rankings**: Top 10 stocks by trading volume.
- **Volatility Analysis**: Identification of high-volatility trading periods using standard deviation across symbols.
- **High-Tech Dashboard**: Dark financial terminal aesthetic built with Tailwind CSS 4 and Framer Motion.
## 🛠️ Tech Stack
- **Frontend**: React, Vite, Tailwind CSS 4, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, Multer (In-memory storage), Zod (API Validation).
- **Processing Engine**: Python 3 (Subprocess-based MapReduce simulation).
- **Workspace Management**: PNPM Workspaces (Monorepo).
## 📂 Project Structure
```text
Stock-Volume-Analysis/
├── artifacts/
│   ├── api-server/        # Express Backend
│   │   └── src/python/    # Core MapReduce Logic (Python)
│   └── stock-analysis/    # React Frontend Dashboard
├── lib/                   # Shared Workspace Libraries
│   ├── api-client-react/  # Auto-generated React Hooks
│   └── api-zod/           # Shared Zod Schemas
└── sample_stock_data.csv  # Example data for testing
```
## ⚙️ Getting Started
### Prerequisites
- **Node.js**: v18 or late (v20+ recommended)
- **PNPM**: v10+
- **Python**: v3.8+ (with `pandas` and `numpy`)
### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/TawfKhan/StockMarketAnalyzer-using-MapReduce-.git
   cd StockMarketAnalyzer-using-MapReduce-
   ```
2. **Install dependencies**:
   ```bash
   pnpm install
   ```
### Running the Project
You need to start both the backend and frontend services.
1. **Start the Backend API Server**:
   ```bash
   # From the root directory
   $env:PORT=3001; pnpm --filter @workspace/api-server run dev
   ```
2. **Start the Frontend Dashboard**:
   ```bash
   # From the root directory
   $env:PORT=5174; $env:BASE_PATH='/'; pnpm --filter @workspace/stock-analysis run dev
   ```
The application will be available at [http://localhost:5174](http://localhost:5174).
## 📊 CSV Data Format
The analyzer expects a CSV file with the following headers (case-insensitive):
| Column | Description |
| :--- | :--- |
| `Date` | Transaction date (YYYY-MM-DD) |
| `Symbol` | Stock Ticker (e.g., AAPL) |
| `Open` | Opening price |
| `High` | Highest price of the day |
| `Low` | Lowest price of the day |
| `Close` | Closing price |
| `Volume` | Total shares traded |
You can use the included `sample_stock_data.csv` for initial testing.

