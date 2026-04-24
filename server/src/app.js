/**
 * Express 应用 — 挂载中间件和路由
 */
const express = require('express');
const path = require('path');
const { ensureAdmin } = require('../utils/auth');

const authRouter = require('../router/auth');
const studentsRouter = require('../router/students');
const clientsRouter = require('../router/clients');
const broadcastRouter = require('../router/broadcast');
const bindRouter = require('../router/bind');

ensureAdmin();

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'assets')));

app.get('/', (req, res) => res.redirect('/control.html'));

app.use('/api/admin', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/broadcast', broadcastRouter);
app.use('/api/student', bindRouter);

module.exports = app;
