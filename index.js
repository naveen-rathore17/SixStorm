require("dotenv").config();

const express = require("express");
const app = express();

const http = require("http");
const server = http.createServer(app);

const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require("axios");


// =====================================================
// CACHE SYSTEM
// =====================================================

let cachedMatches = null;
let lastMatchFetchTime = 0;

let cachedPoints = null;
let lastPointsFetchTime = 0;

const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours


// =====================================================
// SERVER SETTINGS
// =====================================================

app.set("etag", false);
app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.set("view cache", false);


// =====================================================
// SECURITY
// =====================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500
});

app.use(limiter);

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],

      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://cdn.jsdelivr.net",
        "https://*.profitablecpmratenetwork.com",
        "https://*.adsterra.com",
        "https://preferencenail.com"
      ],

      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net"
      ],

      imgSrc: ["'self'", "data:", "https:"],

      connectSrc: ["'self'", "https:", "wss:"],

      mediaSrc: ["'self'", "https:", "http:", "blob:"],

      frameSrc: ["'self'", "https:", "blob:"]
    }
  })
);


// =====================================================
// DISABLE BROWSER CACHE
// =====================================================

app.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  next();
});


// =====================================================
// STATIC FILES
// =====================================================

app.use(
  express.static(path.join(__dirname, "public"), {
    etag: false,
    lastModified: false,
    maxAge: 0
  })
);


// =====================================================
// STATIC PAGES
// =====================================================

app.get("/help", (req, res) => res.render("help", { title: "Help | SixStorm" }));
app.get("/issue-message", (req, res) => res.render("warn", { title: "Warning" }));
app.get("/legal", (req, res) => res.render("info", { title: "Legal Notice" }));
app.get("/privacy-policy", (req, res) => res.render("privacy", { title: "Privacy" }));
app.get("/contact-us", (req, res) => res.render("Contact", { title: "Contact" }));
app.get("/about-us", (req, res) => res.render("about", { title: "About" }));
app.get("/cricket-news", (req, res) => res.render("news", { title: "Cricket News" }));
app.get("/developer_tools_warning", (req, res) =>
  res.render("dev-tools", { title: "⚠ Illegal Activity Detected" })
);


// =====================================================
// STREAM PAGES
// =====================================================

app.get("/star_sport_1_live_HD_ipl", (req, res) => {
  res.render("sport");
});
app.get("/starsport-2", (req, res) => {
  res.render("sport-2");
});
app.get("/star-sport-1", (req, res) => {
  res.render("iframe", {
    streamUrl: "https://allrounderlive.in/hindi"
  });
});

app.get("/star-sport-1-Hindi", (req, res) => {
  res.render("webcric", {
    streamUrl: "https://tatticdn.pages.dev/CDN3/?ch=H1"
  });
});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/ping", (req, res) => {
  res.status(200).send("Server alive");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    message: "Server running"
  });
});


// =====================================================
// FETCH MATCHES
// =====================================================

async function fetchMatches() {

  try {

    const response = await axios.get(
      `https://api.cricapi.com/v1/series_info?apikey=${process.env.CricApi}&id=87c62aac-bc3c-4738-ab93-19da0690488f`
    );

    const matchList = response.data?.data?.matchList || [];
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
          city: match.venue || "",

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

    return matches.length > 0 ? [matches[0]] : null;

  } catch (err) {
    console.log("Match API failed");
    return null;
  }

}


// =====================================================
// MATCH CACHE
// =====================================================

async function getMatches() {

  const now = Date.now();

  // 1️⃣ CACHE
  if (cachedMatches && now - lastMatchFetchTime < CACHE_DURATION) {
    console.log("MATCH FROM CACHE");
    return cachedMatches;
  }

  // 2️⃣ API
  const newMatches = await fetchMatches();

  if (newMatches) {
    cachedMatches = newMatches;
    lastMatchFetchTime = now;
    console.log("MATCH FROM API");
    return newMatches;
  }

  // 3️⃣ MANUAL FALLBACK
  console.log("Using MANUAL MATCH");

  return [
    {
      matchDesc: "T20 1 of 5",
      team1: "IND",
      team2: "ENG",
      team1Img:
        "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/mlXOOB9HXxLpoeS2dHSgGA_96x96.png",
      team2Img:
        "https://ssl.gstatic.com/onebox/media/sports/logos/optimized/DTqIL8Ba3KIuxGkpXw5ayA_96x96.png",
      venue: "Riverside Ground",
      city: "England",
      date: "01 July 2026 10:00 PM",
      startDate:
        new Date("2026-07-01T22:00:00+05:30").getTime()
    }
  ];

}

// =====================================================
// POINTS TABLE CACHE
// =====================================================

async function getPoints() {

  const now = Date.now();

  if (cachedPoints && now - lastPointsFetchTime < CACHE_DURATION) {
    console.log("POINTS FROM CACHE");
    return cachedPoints;
  }

  try {

    const pointsRes = await axios.get(
      `https://api.cricapi.com/v1/series_points?apikey=${process.env.CricApi}&id=87c62aac-bc3c-4738-ab93-19da0690488f`
    );

    let teams = pointsRes.data?.data || [];

    teams.forEach(team => {
      team.points = (team.wins || 0) * 2;
      team.nrr = team.nrr || 0;
    });

    teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.nrr - a.nrr;
    });

    cachedPoints = teams;
    lastPointsFetchTime = now;

    return teams;

  } catch (err) {
    console.log("Points API failed");
    return cachedPoints || [
      {
        message: "The points table is temporarily unavailable while we update the latest standings. Our team is working on it and it will be available very soon. Thank you for your patience."
      }
    ];
  }

}


// =====================================================
// MOVIES DATA
// =====================================================

const movies = [
  {
    title: "Dhurandhar: The Revenge (2026)",
    description: "Action",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-03/1582770_poster_1773907827.jpg",
    embedUrl: "https://gemma416okl.com/play/tt39139925"
  },
  {
    title: "Dhurandhar (2026)",
    description: "Action",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2025-12/1291608_poster_1764955006.jpg",
    embedUrl: "https://gemma416okl.com/play/tt33014583"
  },
  {
    title: "Bhooth Bangla (2026)",
    description: "Comedy",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-04/1239134_poster_1776619375.jpg",
    embedUrl: "https://gemma416okl.com/play/tt29540862"
  },
  {
    title: "Ginny Wedss Sunny 2 (2026) ",
    description: "Romance",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-04/1481041_poster_1777060565.jpg",
    embedUrl: "https://gemma416okl.com/play/tt36277018"
  },
    {
    title: "Kantara: Chapter 1 (2025)",
    description: "Action",
    thumbnail: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6jvpQXDolP5YLHaJS2cM_NF87A5PzWag6Nn1xXpdfjEk4HfyNe1xCDh8VHK0HBWSlmaxy&s=10",
    embedUrl: "https://gemma416okl.com/play/tt26439764"
  },
     {
    title: "Off Campus (2026)",
    description: "Romance",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-05/273240_poster_1778707079.jpg",
    embedUrl: "https://gemma416okl.com/play/tt33546863"
  },
      {
    title: "Man on Fire (2026)",
    description: "Romance",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-04/223386_poster_1777559088.jpg",
    embedUrl: "https://gemma416okl.com/play/tt27331527"
  },


      {
    title: "The Kerala Story 2",
    description: "Crime",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-02/1625582_poster_1772274817.jpg",
    embedUrl: "https://gemma416okl.com/play/tt39310158"
  },


      {
    title: "Mahavatar Narsimha (2025)",
    description: "Animation",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2025-07/1383072_poster_1753642748.jpg",
    embedUrl: "https://gemma416okl.com/play/tt34365591"
  },
      {
    title: "Gullak (2019)",
    description: "Family",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2023-01/90966_poster_1674985143.jpg",
    embedUrl: "https://gemma416okl.com/play/tt10530900"
  },
       {
    title: "Our Fault (2025)",
    description: "Romance",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2025-10/1156594_poster_1761796457.jpg",
    embedUrl: "https://gemma416okl.com/play/tt33311244"
  },
       {
    title: "Aavesham (2024)",
    description: "Action",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2024-05/1084812_poster_1716140019.jpg",
    embedUrl: "https://gemma416okl.com/play/tt26660021"
  },



        {
    title: "Jaat (2025)",
    description: "Action",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2025-04/1306845_poster_1744361031.jpg",
    embedUrl: "https://gemma416okl.com/play/tt32223398"
  },
        {
    title: "Border 2 (2026) ",
    description: "Action",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-01/1213898_poster_1769264255.jpg",
    embedUrl: "https://gemma416okl.com/play/tt30387012"
  },
        {
    title: "Sarvam Maya (2025)",
    description: "Comedy",
    thumbnail: "https://hdmoviesstock.com/uploads/posts/2026-01/1473354_poster_1767528004.jpg",
    embedUrl: "https://gemma416okl.com/play/tt32362695"
  }

];








// =====================================================
// ROUTES
// =====================================================

// ✅ FIXED: Single "/" route — matches + movies dono pass ho rahe hain
app.get("/", async (req, res) => {
  const matches = await getMatches();
  res.render("Home", { matches, movies,  title: "SixStorm LIVE" });
});


app.get("/points", async (req, res) => {
  const teams = await getPoints();
  res.render("points", { teams });
});


// =====================================================
// SERVER START
// =====================================================

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});