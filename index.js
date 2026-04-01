require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path')
const helmet = require("helmet")


app.set("view engine", "ejs");
app.set("trust proxy", 1);
app.use(express.static(path.join(__dirname, "public")));

app.use(helmet())
app.use(require("helmet")({
contentSecurityPolicy: false
}));

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://allrounder-live.pages.dev"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  })
)


// Routes
app.get("/", (req, res) => {
  res.render("Home");
});

app.get("/help", (req, res) => {
  res.render("help");
});


app.get("/legal", (req, res) => {
  res.render("info");
});
app.get("/privacy-policy", (req, res) => {
  res.render("privacy");
})

app.get("/contact-us", (req, res) => {
  res.render("Contact");
})

app.get("/star_sport_1_live_HD_ipl", (req, res) => {
  res.render("sport-1", {
    stream: process.env.url
  })
});
app.get("/ping", (req, res) => {
  res.send("Server is alive 🚀");
});


const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});