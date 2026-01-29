import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch(`${API_URL}/accounts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (accountsRes.ok && transactionsRes.ok) {
        const accountsData = await accountsRes.json();
        const transactionsData = await transactionsRes.json();
        setAccounts(accountsData);
        setTransactions(transactionsData);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
        fetchUserData();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    setAccounts([]);
    setTransactions([]);
    localStorage.removeItem('token');
    setActiveView('dashboard');
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(transferData.amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...transferData,
          amount: parseFloat(transferData.amount)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts);
        setTransactions(data.transactions);
        setSuccess('Transfer completed successfully!');
        setTransferData({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
      } else {
        setError(data.error || 'Transfer failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>🏦 SecureBank</h1>
          <p className="login-subtitle">Welcome back</p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              defaultValue="demo@bank.com"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              defaultValue="password123"
              required
            />
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn-primary">Login</button>
          </form>
          <p className="demo-hint">Demo: demo@bank.com / password123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">🏦 SecureBank</div>
        <div className="nav-links">
          <button
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={activeView === 'accounts' ? 'active' : ''}
            onClick={() => setActiveView('accounts')}
          >
            Accounts
          </button>
          <button
            className={activeView === 'transfer' ? 'active' : ''}
            onClick={() => setActiveView('transfer')}
          >
            Transfer
          </button>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="container">
        {activeView === 'dashboard' && (
          <div className="dashboard">
            <h2>Welcome back, {user?.name || 'User'}!</h2>
            
            <div className="total-balance">
              <div className="balance-label">Total Balance</div>
              <div className="balance-amount">{formatCurrency(getTotalBalance())}</div>
            </div>

            <div className="accounts-grid">
              {accounts.map(account => (
                <div key={account.id} className="account-card">
                  <div className="account-type">{account.type.toUpperCase()}</div>
                  <div className="account-number">{account.accountNumber}</div>
                  <div className="account-balance">{formatCurrency(account.balance)}</div>
                </div>
              ))}
            </div>

            <div className="recent-transactions">
              <h3>Recent Transactions</h3>
              <div className="transactions-list">
                {transactions.slice(0, 5).map(txn => (
                  <div key={txn.id} className="transaction-item">
                    <div>
                      <div className="txn-description">{txn.description}</div>
                      <div className="txn-date">{txn.date}</div>
                    </div>
                    <div className={`txn-amount ${txn.amount > 0 ? 'credit' : 'debit'}`}>
                      {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'accounts' && (
          <div className="accounts-view">
            <h2>My Accounts</h2>
            {accounts.map(account => (
              <div key={account.id} className="account-detail-card">
                <div className="account-header">
                  <div>
                    <h3>{account.type.toUpperCase()} Account</h3>
                    <p>Account {account.accountNumber}</p>
                  </div>
                  <div className="account-balance-large">{formatCurrency(account.balance)}</div>
                </div>
                <div className="account-transactions">
                  <h4>Transactions</h4>
                  {transactions
                    .filter(txn => txn.accountId === account.id)
                    .map(txn => (
                      <div key={txn.id} className="transaction-item">
                        <div>
                          <div className="txn-description">{txn.description}</div>
                          <div className="txn-date">{txn.date}</div>
                        </div>
                        <div className={`txn-amount ${txn.amount > 0 ? 'credit' : 'debit'}`}>
                          {txn.amount > 0 ? '+' : ''}{formatCurrency(txn.amount)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'transfer' && (
          <div className="transfer-view">
            <h2>Transfer Money</h2>
            <form onSubmit={handleTransfer} className="transfer-form">
              <div className="form-group">
                <label>From Account</label>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => setTransferData({...transferData, fromAccountId: e.target.value})}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.type.toUpperCase()} {acc.accountNumber} - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>To Account</label>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => setTransferData({...transferData, toAccountId: e.target.value})}
                  required
                >
                  <option value="">Select account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.type.toUpperCase()} {acc.accountNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  value={transferData.description}
                  onChange={(e) => setTransferData({...transferData, description: e.target.value})}
                  placeholder="What's this transfer for?"
                />
              </div>

              {error && <div className="error">{error}</div>}
              {success && <div className="success">{success}</div>}

              <button type="submit" className="btn-primary">Complete Transfer</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
