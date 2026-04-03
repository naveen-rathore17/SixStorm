let cachedMatches = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute
require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const axios = require('axios')
const keepAlive = require("./keepAlive");
keepAlive();

// Disable ETag
app.set("etag", false);

// View engine
app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.set("view cache", false);



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
        "http://localhost:35730"
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
  res.status(200).send("Server is alive");
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    message: "Server running"
  });
});


// match api data
// app.get("/", async (req, res) => {

//   const options = {
//     method: 'GET',
//     url: 'https://cricbuzz-cricket.p.rapidapi.com/matches/v1/upcoming',
//     headers: {
//       'x-rapidapi-key': process.env.CricApi,
//       'x-rapidapi-host': 'cricbuzz-cricket.p.rapidapi.com'
//     }
//   };

//   try {

//     const response = await axios.request(options);

//     const data = response.data.typeMatches;

//     let matches = [];

//     data.forEach(type => {

//       type.seriesMatches?.forEach(series => {

//         if (series.seriesAdWrapper?.seriesName === "Indian Premier League 2026") {

//           series.seriesAdWrapper.matches.forEach(match => {

//             matches.push({
//               team1: match.matchInfo.team1.teamSName,
//               team2: match.matchInfo.team2.teamSName,

//               team1Img: `https://static.cricbuzz.com/a/img/v1/75x75/i1/c${match.matchInfo.team1.imageId}/team.jpg`,
//               team2Img: `https://static.cricbuzz.com/a/img/v1/75x75/i1/c${match.matchInfo.team2.imageId}/team.jpg`,

//               venue: match.matchInfo.venueInfo.ground,
//               city: match.matchInfo.venueInfo.city,

//               seriesName: match.matchInfo.seriesName,
//               matchDesc: match.matchInfo.matchDesc,

//               date: new Date(parseInt(match.matchInfo.startDate)).toLocaleString("en-IN", {
//                 timeZone: "Asia/Kolkata",
//                 day: "2-digit",
//                 month: "short",
//                 year: "numeric",
//                 hour: "2-digit",
//                 minute: "2-digit",
//                 hour12: true
//               }),
//               startDate: parseInt(match.matchInfo.startDate)
//             });

//           });

//         }

//       });

//     });

//     res.render("Home", { matches });

//   } catch (error) {

//     console.log("API Error:", error.message);

//     // fallback render
//     res.render("Home", { matches: [] });

//   }

// });



app.get("/", async (req, res) => {
  try {

    const nowTime = Date.now();

    // Agar cache valid hai to API call nahi hogi
    if (cachedMatches && (nowTime - lastFetchTime < CACHE_DURATION)) {
      console.log("Serving from CACHE");
      return res.render("Home", { matches: cachedMatches });
    }

    console.log("Fetching from API");

    const response = await axios.get(
      `https://api.cricapi.com/v1/series_info?apikey=${process.env.CricApi}&id=87c62aac-bc3c-4738-ab93-19da0690488f`
    );

    const matchList = response.data.data.matchList;
    const now = new Date();

    let matches = [];

    matchList.forEach(match => {

      const matchTime = new Date(match.dateTimeGMT + "Z");
      const matchNumber = match.name.match(/\d+/)?.[0] || "";

      // only future match
      if (matchTime > now && !match.matchStarted) {

        matches.push({
          team1: match.teamInfo[0].shortname,
          team2: match.teamInfo[1].shortname,

          team1Img: match.teamInfo[0].img,
          team2Img: match.teamInfo[1].img,

          venue: match.venue,
          city: "",

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

    // nearest upcoming match
    matches.sort((a, b) => a.startDate - b.startDate);

    const finalMatch = [matches[0]];

    // cache save
    cachedMatches = finalMatch;
    lastFetchTime = nowTime;

    res.render("Home", { matches: finalMatch });

  } catch (error) {

    console.log(error);

    // agar error aaye aur cache ho to wahi dikhao
    if (cachedMatches) {
      return res.render("Home", { matches: cachedMatches });
    }

    res.render("Home", { matches: [] });

  }
});
// Server start
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});