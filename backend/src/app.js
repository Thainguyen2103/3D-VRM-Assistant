const express = require('express');
const cors = require('cors');

const sessionRoutes = require('./routes/session.routes');
const chatRoutes = require('./routes/chat.routes');
const characterRoutes = require('./routes/character.routes');
const animationRoutes = require('./routes/animation.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionRoutes);
app.use('/api', chatRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/animations', animationRoutes);

module.exports = app;
