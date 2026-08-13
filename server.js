const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { testConnection, pool } = require('./config/db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
