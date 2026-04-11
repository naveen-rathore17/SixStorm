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

app.get("/help", (req, res) => res.render("help",{title:"Help | SixStorm"}));
app.get("/issue-message", (req, res) => res.render("warn",{title:"Warning"}));
app.get("/legal", (req, res) => res.render("info",{title:"Legal Notice"}));
app.get("/privacy-policy", (req, res) => res.render("privacy",{title:"Privacy"}));
app.get("/contact-us", (req, res) => res.render("Contact",{title:"Contact"}));
app.get("/about-us", (req, res) => res.render("about",{title:"About"}));
app.get("/cricket-news", (req, res) => res.render("news",{title:"Cricket News"}));
app.get("/developer_tools_warning", (req, res) =>
res.render("dev-tools",{title:"⚠ Illegal Activity Detected"})
);


// =====================================================
// STREAM PAGES
// =====================================================

app.get("/live/starhindi", (req,res)=>{
res.render("redirect",{title:"SixStorm | IPL-2026"});
});
app.get("/ipl/live/2026", (req,res)=>{
res.render("sport-1",{title:"SixStorm | IPL-2026"});
});

app.get("/star_sport_1_live_HD_ipl",(req,res)=>{
res.render("sport");
});
app.get("/watching",(req,res)=>{
res.render("prime");
});

app.get("/star_sport_live_Hd",(req,res)=>{
res.render("star-sport",{
title:"IPL Live 🔴",
streamUrl:process.env.STREAM_URL,
keyId:process.env.KEY_ID,
key:process.env.KEY_VALUE,
cookieUrl:process.env.COOKIE_URL
});
});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/ping",(req,res)=>{
res.status(200).send("Server alive");
});

app.get("/health",(req,res)=>{
res.status(200).json({
status:"OK",
uptime:process.uptime(),
message:"Server running"
});
});


// =====================================================
// FETCH MATCHES
// =====================================================

async function fetchMatches(){

try{

const response = await axios.get(
`https://api.cricapi.com/v1/series_info?apikey=${process.env.CricApi}&id=87c62aac-bc3c-4738-ab93-19da0690488f`
);

const matchList = response.data?.data?.matchList || [];
const now = new Date();

let matches = [];

matchList.forEach(match=>{

const matchTime = new Date(match.dateTimeGMT+"Z");
const matchNumber = match.name.match(/\d+/)?.[0] || "";

if(matchTime>now && !match.matchStarted){

matches.push({

team1:match.teamInfo?.[0]?.shortname,
team2:match.teamInfo?.[1]?.shortname,

team1Img:match.teamInfo?.[0]?.img,
team2Img:match.teamInfo?.[1]?.img,

venue:match.venue,

matchDesc:`Match-${matchNumber}`,

date:matchTime.toLocaleString("en-IN",{
timeZone:"Asia/Kolkata",
day:"2-digit",
month:"short",
year:"numeric",
hour:"2-digit",
minute:"2-digit",
hour12:true
}),

startDate:matchTime.getTime()
});

}

});

matches.sort((a,b)=>a.startDate-b.startDate);

return matches.length>0 ? [matches[0]] : null;

}catch(err){
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
matchDesc: "Match-16",
team1: "RCB",
team2: "RR",
team1Img:
"https://ssl.gstatic.com/onebox/media/sports/logos/optimized/xUS54-BA0dFZPMtbCiHkzQ_96x96.png",
team2Img:
"https://ssl.gstatic.com/onebox/media/sports/logos/optimized/GqIU6xhQAnCpy_Cbr2LZRA_96x96.png",
venue: "Barsapara Stadium",
city: "Guwahati",
date: "10 April 2026 7:30 PM",
startDate:
new Date("2026-04-10T19:30:00+05:30").getTime()
}
];

}

// =====================================================
// POINTS TABLE CACHE
// =====================================================

async function getPoints(){

const now = Date.now();

if(cachedPoints && now-lastPointsFetchTime<CACHE_DURATION){
console.log("POINTS FROM CACHE");
return cachedPoints;
}

try{

const pointsRes = await axios.get(
`https://api.cricapi.com/v1/series_points?apikey=${process.env.CricApi}&id=87c62aac-bc3c-4738-ab93-19da0690488f`
);

let teams = pointsRes.data?.data || [];

teams.forEach(team=>{
team.points=(team.wins||0)*2;
team.nrr=team.nrr||0;
});

teams.sort((a,b)=>{
if(b.points!==a.points) return b.points-a.points;
if(b.wins!==a.wins) return b.wins-a.wins;
return b.nrr-a.nrr;
});

cachedPoints = teams;
lastPointsFetchTime = now;

return teams;

}catch(err){
console.log("Points API failed");
return cachedPoints || [
  {
     message: "The points table is temporarily unavailable while we update the latest standings. Our team is working on it and it will be available very soon. Thank you for your patience."
  }
];
}

}


// =====================================================
// ROUTES
// =====================================================

app.get("/", async (req,res)=>{
const matches = await getMatches();
res.render("Home",{matches,title:"SixStorm LIVE"});
});

app.get("/points", async (req,res)=>{
const teams = await getPoints();
res.render("points",{teams});
});


// =====================================================
// SERVER START
// =====================================================

const port = process.env.PORT || 3000;

server.listen(port,()=>{
console.log(`Server running on port ${port}`);
});