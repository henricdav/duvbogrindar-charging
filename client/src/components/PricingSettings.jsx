import React, { useState, useEffect } from 'react';
import { getPricingConfig, updatePricingConfig } from '../api';

function PricingSettings({ onUpdate }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getPricingConfig();
      setConfig(data);
      setEditedConfig(data);
    } catch (err) {
      console.error('Failed to load pricing config:', err);
      setError('Failed to load pricing configuration');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updated = await updatePricingConfig(editedConfig);
      setConfig(updated);
      setEditedConfig(updated);
      setSuccess(true);
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate(updated);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update pricing config:', err);
      setError('Failed to update pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedConfig(config);
    setIsEditing(false);
    setError(null);
  };

  if (!config) {
    return <div className="pricing-settings">Loading pricing settings...</div>;
  }

  return (
    <div className="pricing-settings">
      <div className="settings-header">
        <h3>Pricing Configuration</h3>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn-edit">
            Edit Settings
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Settings updated successfully!</div>}

      <div className="settings-content">
        <div className="setting-item">
          <label>
            <input
              type="checkbox"
              checked={editedConfig.useFixedPrice}
              disabled={!isEditing}
              onChange={(e) => setEditedConfig({ ...editedConfig, useFixedPrice: e.target.checked })}
            />
            Use Fixed Price (override spot prices)
          </label>
        </div>

        {editedConfig.useFixedPrice ? (
          <div className="setting-item">
            <label>Fixed Price (SEK/kWh):</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={editedConfig.fixedPriceSEKPerKwh}
              disabled={!isEditing}
              onChange={(e) => setEditedConfig({ ...editedConfig, fixedPriceSEKPerKwh: parseFloat(e.target.value) })}
            />
            <small>This fixed price will be used instead of spot prices + VAT + fixed cost</small>
          </div>
        ) : (
          <>
            <div className="setting-item">
              <label>VAT Percentage (%):</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editedConfig.vatPercentage}
                disabled={!isEditing}
                onChange={(e) => setEditedConfig({ ...editedConfig, vatPercentage: parseFloat(e.target.value) })}
              />
              <small>VAT applied to spot prices (e.g., 25 for 25%)</small>
            </div>

            <div className="setting-item">
              <label>Fixed Cost (SEK/kWh):</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={editedConfig.fixedCostSEKPerKwh}
                disabled={!isEditing}
                onChange={(e) => setEditedConfig({ ...editedConfig, fixedCostSEKPerKwh: parseFloat(e.target.value) })}
              />
              <small>Additional fixed cost per kWh (grid fees, markup, etc.)</small>
            </div>

            <div className="pricing-formula">
              <strong>Pricing Formula:</strong>
              <div className="formula">
                Total Price = Spot Price × (1 + {editedConfig.vatPercentage}%) + {editedConfig.fixedCostSEKPerKwh} SEK/kWh
              </div>
            </div>
          </>
        )}

        {isEditing && (
          <div className="setting-actions">
            <button onClick={handleSave} disabled={loading} className="btn-save">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={handleCancel} disabled={loading} className="btn-cancel">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PricingSettings;
