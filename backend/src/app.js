const express = require('express');
const cors = require('cors');

const sessionRoutes = require('./routes/session.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionRoutes);
app.use('/api', chatRoutes);

module.exports = app;
