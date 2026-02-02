import React from 'react';
import { format, parseISO } from 'date-fns';

function DataTable({ data, showCost = false }) {
  if (!data || data.length === 0) {
    return <div className="data-table">No data available</div>;
  }

  return (
    <div className="data-table">
      <h3>Detailed Data</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Energy (kWh)</th>
              {showCost && <th>Price (SEK/kWh)</th>}
              {showCost && <th>Cost (SEK)</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{format(parseISO(item.timestamp), 'yyyy-MM-dd HH:mm')}</td>
                <td>{parseFloat(item.kwh || item.kWh || 0).toFixed(2)}</td>
                {showCost && <td>{item.priceSEKPerKwh ? parseFloat(item.priceSEKPerKwh).toFixed(4) : 'N/A'}</td>}
                {showCost && <td>{item.costSEK ? parseFloat(item.costSEK).toFixed(2) : 'N/A'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
