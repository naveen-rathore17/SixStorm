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
const { title } = require("process");
keepAlive();


// =====================================================
// CACHE SYSTEM
// =====================================================

// Match card cache
let cachedMatches = null;
let lastMatchFetchTime = 0;

const MATCH_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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

// Rate limit (basic DDoS protection)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
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
        "https://cdn.jsdelivr.net"
      ],

      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net"
      ],

      imgSrc: [
        "'self'",
        "data:",
        "https:"
      ],

      connectSrc: [
        "'self'",
        "https:"
      ],

      mediaSrc: [
        "'self'",
        "https:",
        "blob:"
      ]
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
// ROUTES (STATIC PAGES)
// =====================================================

app.get("/help", (req, res) =>
  res.render("help", { title: "Help | SixStorm" })
);
app.get("/issue-message", (req, res) =>
  res.render("warn", { title: "Warning | SixStorm" })
);

app.get("/legal", (req, res) =>
  res.render("info", { title: "Legal Notice | SixStorm" })
);

app.get("/privacy-policy", (req, res) =>
  res.render("privacy", { title: "Privacy Policy | SixStorm" })
);

app.get("/contact-us", (req, res) =>
  res.render("Contact", { title: "Contact-us | SixStorm" })
);

app.get("/about-us", (req, res) =>
  res.render("about", { title: "About-us | SixStorm" })
);

app.get("/cricket-news", (req, res) =>
  res.render("news", { title: "Cricket News | SixStorm" })
);
app.get("/developer_tools_warning", (req, res) =>
  res.render("dev-tools", { title: "⚠ Illegal Activity Detected| SixStorm" })
);



// =====================================================
// STREAM PAGE
// =====================================================

app.get("/star_sport_1_live_HD_ipl", (req, res) => {

  res.render("sport-1", {
    stream: process.env.url,
    title: "Star-Sport HD LIVE 🔴"
  });

});


app.get("/star_sport_live_Hd", (req, res) => {
  res.render("star-sport", {
    title: "IPL Live🔴",
    streamUrl: process.env.STREAM_URL,
    keyId: process.env.KEY_ID,
    key: process.env.KEY_VALUE,
    cookieUrl: process.env.COOKIE_URL
  });
});

// =====================================================
// HEALTH CHECK ROUTES
// =====================================================

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


// =====================================================
// FETCH MATCHES FROM API
// =====================================================

async function fetchMatches() {

  try {

    console.log("Fetching matches from API...");

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

      const matchNumber =
        match.name.match(/\d+/)?.[0] || "";

      // Only upcoming matches

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

    // Sort upcoming matches

    matches.sort((a, b) => a.startDate - b.startDate);

    if (matches.length > 0) {

      // Return next match
      return [matches[0]];

    }

    return null;

  } catch (error) {

    console.log("API Failed → Using manual match");

    return null;

  }

}


// =====================================================
// MATCH CACHE SYSTEM
// =====================================================

async function getMatches() {

  const now = Date.now();

  // Serve cached matches

  if (cachedMatches && now - lastMatchFetchTime < MATCH_CACHE_DURATION) {

    console.log("Serving matches from CACHE");

    return cachedMatches;

  }

  const newMatches = await fetchMatches();

  if (newMatches) {

    cachedMatches = newMatches;
    lastMatchFetchTime = now;

    return newMatches;

  }

  // Manual fallback match

  console.log("Using MANUAL MATCH");

  return [
    {
      matchDesc: "Match-9",
      team1: "GT",
      team2: "RR",

      team1Img:
        "https://upload.wikimedia.org/wikipedia/en/thumb/0/09/Gujarat_Titans_Logo.svg/250px-Gujarat_Titans_Logo.svg.png",

      team2Img:
        "https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/This_is_the_logo_for_Rajasthan_Royals.svg/250px-This_is_the_logo_for_Rajasthan_Royals.svg.png",

      venue: "Narendra Modi Stadium",

      city: "Ahmedabad",

      date: "4 April 2026 7:30 PM",

      startDate:
        new Date("2026-04-04T19:30:00+05:30").getTime()
    }
  ];

}




// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", async (req, res) => {

  const matches = await getMatches();

  res.render("Home", {
    matches,
    title: "SixStorm LIVE"
  });

});


// =====================================================
// SERVER START
// =====================================================

const port = process.env.PORT || 3000;

server.listen(port, () => {

  console.log(`Server running on port ${port}`);

});