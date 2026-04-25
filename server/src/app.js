const express = require('express');
const path = require('path');

const adminRouter = require('../router/admin');
const teacherRouter = require('../router/teacher');
const roomsRouter = require('../router/rooms');
const studentRouter = require('../router/student');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'assets')));
app.use('/docs/spec', express.static(path.join(__dirname, '..', '..', 'docs')));

app.get('/', (req, res) => res.redirect('/control.html'));
app.get('/docs', (req, res) => res.redirect('/docs/index.html'));

app.use('/api/admin', adminRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/student', studentRouter);

module.exports = app;
