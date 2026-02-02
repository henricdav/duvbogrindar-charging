import React, { useState } from 'react';
import { exportCostData } from '../api';

function ExportButton({ chargerId, fromDate, toDate, disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    if (!chargerId) {
      setError('Please select a charger');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = await exportCostData(
        chargerId,
        fromDate.toISOString(),
        toDate.toISOString()
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `energy-costs-${chargerId}-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data to Excel');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-button-container">
      <button
        onClick={handleExport}
        disabled={disabled || loading || !chargerId}
        className="btn-export"
      >
        {loading ? 'Exporting...' : '📊 Export to Excel'}
      </button>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export default ExportButton;
