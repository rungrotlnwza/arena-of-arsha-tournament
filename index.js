console.clear();
require('dotenv').config({ quiet: true });
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'false');

// Body & cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session for admin
app.use(session({
  secret: process.env.SESSION_SECRET || 'arsha2026-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static: /assets and fallback to assets
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'assets')));

// LiveReload(optional, when LIVERELOAD = true)
require('./tools/live_server')(app);

// Main router (frontend + API)
app.use(require('./app/routes/router'));

app.listen(port, () => {
  console.log(`🎮 Arena of Arsha Tournament Server`);
  console.log(`🌐 Running at http://localhost:${port}`);
});
