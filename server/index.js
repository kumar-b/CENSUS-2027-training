require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/database');
const { seedQuestions } = require('./db/seeder');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const flagRoutes = require('./routes/flags');
const challengeRoutes = require('./routes/challenges');

const app = express();
app.use(cors());
app.use(express.json());

// Initialise DB + seed questions
getDb();
seedQuestions();

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/challenges', challengeRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

module.exports = app;
