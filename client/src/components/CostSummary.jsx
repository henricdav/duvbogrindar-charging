import React from 'react';

function CostSummary({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="cost-summary">
      <h3>Summary</h3>
      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Total Energy:</span>
          <span className="summary-value">{summary.totalKwh} kWh</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Cost:</span>
          <span className="summary-value">{summary.totalCostSEK} SEK</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Average Price:</span>
          <span className="summary-value">{summary.averagePriceSEKPerKwh} SEK/kWh</span>
        </div>
      </div>
    </div>
  );
}

export default CostSummary;
