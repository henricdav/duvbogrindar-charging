import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

function EnergyChart({ data, type = 'line', title = 'Energy Consumption' }) {
  if (!data || data.length === 0) {
    return <div className="chart-container">No data available</div>;
  }

  // Format data for Recharts
  const chartData = data.map(item => ({
    timestamp: format(parseISO(item.timestamp), 'MMM dd HH:mm'),
    fullTimestamp: item.timestamp,
    kWh: parseFloat(item.kwh || item.kWh || 0),
    cost: item.costSEK ? parseFloat(item.costSEK) : null
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
            {format(parseISO(payload[0].payload.fullTimestamp), 'MMM dd, yyyy HH:mm')}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '2px 0', color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} {entry.name === 'kWh' ? 'kWh' : 'SEK'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ width: '100%', height: 400 }}>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" />
            {chartData.some(d => d.cost !== null) && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="kWh" 
              stroke="#8884d8" 
              name="kWh"
              dot={false}
            />
            {chartData.some(d => d.cost !== null) && (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cost" 
                stroke="#82ca9d" 
                name="Cost (SEK)"
                dot={false}
              />
            )}
          </LineChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" />
            {chartData.some(d => d.cost !== null) && <YAxis yAxisId="right" orientation="right" />}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              yAxisId="left"
              dataKey="kWh" 
              fill="#8884d8" 
              name="kWh"
            />
            {chartData.some(d => d.cost !== null) && (
              <Bar 
                yAxisId="right"
                dataKey="cost" 
                fill="#82ca9d" 
                name="Cost (SEK)"
              />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default EnergyChart;
