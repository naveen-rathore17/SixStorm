const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Disable ETag
app.set("etag", false);

// View engine
app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.set("view cache", false);

// Live reload (development)
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, "public"));
liveReloadServer.watch(path.join(__dirname, "views"));

app.use(connectLiveReload());

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Security
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// Custom CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://allrounder-live.pages.dev"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "http://localhost:35729"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  })
);

app.use(limiter);

// Disable caching
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// Static files
app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    maxAge: 0
  })
);

// Routes

app.get("/", (req, res) => {
  res.render("Home")
});

app.get("/help", (req, res) => {
  res.render("help");
});

app.get("/legal", (req, res) => {
  res.render("info");
});

app.get("/privacy-policy", (req, res) => {
  res.render("privacy");
});

app.get("/contact-us", (req, res) => {
  res.render("Contact");
});

app.get("/star_sport_1_live_HD_ipl", (req, res) => {
  res.render("sport-1", {
    stream: process.env.url
  });
});

// Ping route
app.get("/ping", (req, res) => {
  res.send("Server is alive 🚀");
});

// Server start
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});