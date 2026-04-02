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
const axios= require('axios')

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
  res.send("Server is alive 🚀");
});

// match api data
app.get("/", async (req, res) => {

  const options = {
    method: 'GET',
    url: 'https://cricbuzz-cricket.p.rapidapi.com/matches/v1/upcoming',
    headers: {
      'x-rapidapi-key': process.env.CricApi,
      'x-rapidapi-host': 'cricbuzz-cricket.p.rapidapi.com'
    }
  };

  try {

    const response = await axios.request(options);

    const data = response.data.typeMatches;

    let matches = [];

    data.forEach(type => {

      type.seriesMatches?.forEach(series => {

        if (series.seriesAdWrapper?.seriesName === "Indian Premier League 2026") {

          series.seriesAdWrapper.matches.forEach(match => {

            matches.push({
              team1: match.matchInfo.team1.teamSName,
              team2: match.matchInfo.team2.teamSName,

              team1Img: `https://static.cricbuzz.com/a/img/v1/75x75/i1/c${match.matchInfo.team1.imageId}/team.jpg`,
              team2Img: `https://static.cricbuzz.com/a/img/v1/75x75/i1/c${match.matchInfo.team2.imageId}/team.jpg`,

              venue: match.matchInfo.venueInfo.ground,
              city: match.matchInfo.venueInfo.city,

              seriesName: match.matchInfo.seriesName,
              matchDesc: match.matchInfo.matchDesc,

              date: new Date(parseInt(match.matchInfo.startDate)).toLocaleString(),
              startDate: parseInt(match.matchInfo.startDate)
            });

          });

        }

      });

    });

    res.render("Home", { matches });

  } catch (error) {
    console.log(error);
  }

});

// Server start
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});