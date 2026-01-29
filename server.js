const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your-secret-key-change-in-production';

// Mock database
let users = [
  {
    id: 1,
    email: 'demo@bank.com',
    password: '$2a$10$X8KvXzqJXFramework', // 'password123'
    name: 'Demo User',
    accounts: [
      {
        id: 'acc-001',
        type: 'checking',
        balance: 5420.50,
        accountNumber: '****1234'
      },
      {
        id: 'acc-002',
        type: 'savings',
        balance: 12500.00,
        accountNumber: '****5678'
      }
    ],
    transactions: [
      { id: 1, date: '2026-01-28', description: 'Salary Deposit', amount: 3500, type: 'credit', accountId: 'acc-001' },
      { id: 2, date: '2026-01-27', description: 'Grocery Store', amount: -125.50, type: 'debit', accountId: 'acc-001' },
      { id: 3, date: '2026-01-26', description: 'Transfer to Savings', amount: -500, type: 'transfer', accountId: 'acc-001' },
      { id: 4, date: '2026-01-26', description: 'Transfer from Checking', amount: 500, type: 'transfer', accountId: 'acc-002' },
      { id: 5, date: '2026-01-25', description: 'Netflix Subscription', amount: -15.99, type: 'debit', accountId: 'acc-001' }
    ]
  }
];

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.userId = verified.id;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // For demo purposes, accept 'password123'
    const validPassword = password === 'password123';
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/accounts', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.accounts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/transactions', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.transactions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/transfer', authenticateToken, (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;
    const user = users.find(u => u.id === req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const fromAccount = user.accounts.find(a => a.id === fromAccountId);
    const toAccount = user.accounts.find(a => a.id === toAccountId);

    if (!fromAccount || !toAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (fromAccount.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Perform transfer
    fromAccount.balance -= amount;
    toAccount.balance += amount;

    // Add transactions
    const newTransactionId = user.transactions.length + 1;
    user.transactions.unshift({
      id: newTransactionId,
      date: new Date().toISOString().split('T')[0],
      description: description || 'Internal Transfer',
      amount: -amount,
      type: 'transfer',
      accountId: fromAccountId
    });

    user.transactions.unshift({
      id: newTransactionId + 1,
      date: new Date().toISOString().split('T')[0],
      description: description || 'Internal Transfer',
      amount: amount,
      type: 'transfer',
      accountId: toAccountId
    });

    res.json({ 
      message: 'Transfer successful',
      accounts: user.accounts,
      transactions: user.transactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Demo credentials: demo@bank.com / password123');
});
