import React, { useState } from 'react';
import Button from '../common/Button/Index';
import '../../css/Wallet.css';

const Wallet = () => {
  const [loading, setLoading] = useState(false);
  const [miningLoading, setMiningLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [settings, setSettings] = useState({
    allowMining: false,
  });

  const handleStartMining = async (e) => {
    e.preventDefault();
    setMiningLoading(true);
    
    // 模拟挖矿延迟
    setTimeout(() => {
      setWalletBalance(prev => prev + 1);
      setMiningLoading(false);
      alert('Mining completed! You earned 1 token.');
    }, 2000);
  };

  const handleSettingChange = (e) => {
    const { name, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  return (
    <div className="wallet-container">
      <div className="wallet-sections">
        {/* Wallet Section */}
        <div className="section-card">
          <h2 className="section-title">My Wallet</h2>
          <div className="wallet-card">
            <div className="balance-info">
              <div className="balance-label">Current Balance</div>
              <div className="balance-amount">
                ${walletBalance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="section-card">
          <h2 className="section-title">Mining Settings</h2>
          <form className="settings-form" onSubmit={handleStartMining}>
            <div className="settings-group">
              <div className="settings-item">
                <label className="settings-label">
                  <span className="label-text">Allow Mining</span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      name="allowMining"
                      checked={settings.allowMining}
                      onChange={handleSettingChange}
                    />
                    <span className="toggle-slider"></span>
                  </div>
                </label>
                <p className="settings-description">
                  Enable this option to participate in mining activities
                </p>
              </div>
            </div>

            {settings.allowMining && (
              <Button 
                type="submit"
                loading={miningLoading}
                disabled={miningLoading}
              >
                {miningLoading ? 'Mining in progress...' : 'Start Mining'}
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Wallet;