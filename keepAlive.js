const axios = require("axios");

const URL = "https://sixstorm-live.onrender.com/health";

function keepAlive() {
  setInterval(async () => {
    try {
      await axios.get(URL);
      console.log("Self ping success");
    } catch (err) {
      console.log("Ping failed");
    }
  }, 240000); // 4 minutes
}

module.exports = keepAlive;