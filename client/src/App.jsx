import React, { useState, useEffect } from 'react';
import ChargerSelector from './components/ChargerSelector';
import DateRangePicker from './components/DateRangePicker';
import EnergyChart from './components/EnergyChart';
import CostSummary from './components/CostSummary';
import DataTable from './components/DataTable';
import PricingSettings from './components/PricingSettings';
import ExportButton from './components/ExportButton';
import { getChargers, getCostData, fetchDataManually } from './api';
import './App.css';

function App() {
  const [chargers, setChargers] = useState([]);
  const [selectedCharger, setSelectedCharger] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  });
  const [toDate, setToDate] = useState(new Date());
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [showSettings, setShowSettings] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchMessage, setFetchMessage] = useState(null);

  // Load chargers on mount
  useEffect(() => {
    const loadChargers = async () => {
      try {
        const data = await getChargers();
        setChargers(data);
        if (data.length > 0) {
          setSelectedCharger(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load chargers:', err);
        setError('Failed to load chargers. Please check if the backend server is running.');
      }
    };
    loadChargers();
  }, []);

  // Load data when charger or dates change
  useEffect(() => {
    if (selectedCharger) {
      loadData();
    }
  }, [selectedCharger, fromDate, toDate]);

  const loadData = async () => {
    if (!selectedCharger) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getCostData(
        selectedCharger,
        fromDate.toISOString(),
        toDate.toISOString()
      );
      setCostData(data);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Please ensure the backend is running and data is available.');
      setCostData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePricingUpdate = () => {
    // Reload data when pricing settings change
    loadData();
  };

  const handleManualFetch = async () => {
    setFetchingData(true);
    setFetchMessage(null);
    
    try {
      console.log('Starting manual data fetch...');
      const result = await fetchDataManually();
      console.log('Manual fetch result:', result);
      
      setFetchMessage({
        type: 'success',
        text: 'Data fetched successfully! Refreshing display...'
      });
      
      // Reload the current view after successful fetch
      setTimeout(() => {
        loadData();
        setFetchMessage(null);
      }, 2000);
      
    } catch (err) {
      console.error('Failed to fetch data manually:', err);
      setFetchMessage({
        type: 'error',
        text: `Failed to fetch data: ${err.response?.data?.message || err.message}`
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setFetchMessage(null);
      }, 5000);
    } finally {
      setFetchingData(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Duvbo Grindar Charging Portal</h1>
        <p>Energy Consumption and Cost Visualization</p>
      </header>

      <main className="app-main">
        <div className="settings-toggle">
          <button onClick={() => setShowSettings(!showSettings)} className="btn-settings">
            ⚙️ {showSettings ? 'Hide' : 'Show'} Pricing Settings
          </button>
          <button 
            onClick={handleManualFetch} 
            disabled={fetchingData}
            className="btn-fetch-data"
            title="Fetch latest data from Nord Pool and Easee APIs"
          >
            {fetchingData ? '⏳ Fetching...' : '🔄 Fetch Data Now'}
          </button>
        </div>

        {fetchMessage && (
          <div className={`message message-${fetchMessage.type}`}>
            {fetchMessage.text}
          </div>
        )}

        {showSettings && (
          <PricingSettings onUpdate={handlePricingUpdate} />
        )}

        <div className="controls">
          <ChargerSelector
            chargers={chargers}
            selectedCharger={selectedCharger}
            onSelect={setSelectedCharger}
          />
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
          />
          <div className="chart-type-selector">
            <label>Chart Type:</label>
            <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>
          <button onClick={loadData} disabled={loading || !selectedCharger}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
          <ExportButton
            chargerId={selectedCharger}
            fromDate={fromDate}
            toDate={toDate}
            disabled={loading || !selectedCharger || !costData}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading && <div className="loading">Loading data...</div>}

        {!loading && costData && (
          <>
            <CostSummary summary={costData.summary} />
            <EnergyChart
              data={costData.data}
              type={chartType}
              title={`Energy Consumption and Cost - ${selectedCharger}`}
            />
            <DataTable data={costData.data} showCost={true} />
          </>
        )}

        {!loading && !costData && !error && selectedCharger && (
          <div className="no-data">
            No data available for the selected charger and date range.
            <br />
            Data will be automatically fetched from Easee API according to the configured schedule.
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>BRF Duvbo Grindar &copy; 2026</p>
      </footer>
    </div>
  );
}

export default App;
