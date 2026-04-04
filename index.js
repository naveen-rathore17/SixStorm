require("dotenv").config();

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const keepAlive = require("./keepAlive");
keepAlive();


// =========================
// CACHE SYSTEM
// =========================

let cachedMatches = null;
let lastFetchTime = 0;

const CACHE_DURATION = 600000; // 10 minutes


// =========================
// SERVER SETTINGS
// =========================

app.set("etag", false);
app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.set("view cache", false);


// =========================
// SECURITY
// =========================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://allrounder-live.pages.dev"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  })
);


// =========================
// DISABLE CACHE
// =========================

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  next();
});


// =========================
// STATIC FILES
// =========================

app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    maxAge: 0
  })
);


// =========================
// ROUTES
// =========================

app.get("/help", (req, res) => res.render("help"));
app.get("/legal", (req, res) => res.render("info"));
app.get("/privacy-policy", (req, res) => res.render("privacy"));
app.get("/contact-us", (req, res) => res.render("Contact"));

app.get("/star_sport_1_live_HD_ipl", (req, res) => {
  res.render("sport-1", {
    stream: process.env.url
  });
});


// =========================
// HEALTH CHECK
// =========================

app.get("/ping", (req, res) => {
  res.status(200).send("Server is alive");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    message: "Server running"
  });
});


// =========================
// FETCH MATCH FROM API
// =========================

async function fetchMatches() {

  try {

    console.log("Fetching from API");

    const response = await axios.get(
      `https://api.cricapi.com/v1/series_info?apikey=${process.env.CricApi}&id=87c62aac-bc3c-4738-ab93-19da0690488f`
    );

    const data = response.data;

    if (data.status !== "success") {

      console.log("API ERROR:", data.reason);
      return null;

    }

    const matchList = data?.data?.matchList || [];

    const now = new Date();

    let matches = [];

    matchList.forEach(match => {

      const matchTime = new Date(match.dateTimeGMT + "Z");

      const matchNumber = match.name.match(/\d+/)?.[0] || "";

      if (matchTime > now && !match.matchStarted) {

        matches.push({

          team1: match.teamInfo?.[0]?.shortname,
          team2: match.teamInfo?.[1]?.shortname,

          team1Img: match.teamInfo?.[0]?.img,
          team2Img: match.teamInfo?.[1]?.img,

          venue: match.venue,

          matchDesc: `Match-${matchNumber}`,

          date: matchTime.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }),

          startDate: matchTime.getTime()

        });

      }

    });

    matches.sort((a, b) => a.startDate - b.startDate);

    if (matches.length > 0) {
      return [matches[0]];
    }

    return null;

  } catch (error) {

    console.log("API Failed → Using manual match");

    return null;

  }

}


// =========================
// SMART CACHE + FALLBACK
// =========================

async function getMatches() {

  const now = Date.now();

  if (cachedMatches && now - lastFetchTime < CACHE_DURATION) {

    console.log("Serving from CACHE");
    return cachedMatches;

  }

  const newMatches = await fetchMatches();

  if (newMatches) {

    cachedMatches = newMatches;
    lastFetchTime = now;

    return newMatches;

  }

  console.log("Using MANUAL MATCH");

  return [
    {
      matchDesc: "Match-8",
      team1: "MI",
      team2: "DC",
      team1Img: "https://g.cricapi.com/iapi/226-637852956375593901.png?w=48",
      team2Img: "https://g.cricapi.com/iapi/148-637874596301457910.png?w=48",
      venue: "Arun Jaitley Stadium, Delhi,",
      city: "Mumbai",
      date: "4 April 2026 3:30 PM",
      startDate: new Date("2026-04-04T15:30:00").getTime()
    }
  ];

}


// =========================
// HOME ROUTE
// =========================

app.get("/", async (req, res) => {

  const matches = await getMatches();

  res.render("Home", { matches });

});


// =========================
// SERVER START
// =========================

const port = process.env.PORT || 3000;

server.listen(port, () => {

  console.log(`Server running on port ${port}`);

});