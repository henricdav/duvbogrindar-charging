import React, { useState, useEffect } from 'react';
import ChargerSelector from './components/ChargerSelector';
import DateRangePicker from './components/DateRangePicker';
import EnergyChart from './components/EnergyChart';
import CostSummary from './components/CostSummary';
import DataTable from './components/DataTable';
import { getChargers, getCostData } from './api';
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Duvbo Grindar Charging Portal</h1>
        <p>Energy Consumption and Cost Visualization</p>
      </header>

      <main className="app-main">
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
