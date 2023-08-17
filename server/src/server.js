const http = require("http");

require("dotenv").config();

const mongoose = require("mongoose");
const { loadPlanetsData } = require("./models/planets.model");
const { loadLaunchesData } = require("./models/launches.model");
const app = require("./app");

const PORT = process.env.PORT || 8000;

const MONGO_URL = process.env.MONGO_URL;

const server = http.createServer(app);

mongoose.connection.once("open", () =>
  console.log("MongoDB is Running and Connected")
);
mongoose.connection.on("error", (err) => console.error(err));

async function startServer() {
  await mongoose.connect(MONGO_URL, {
    useNewURLParser: true,
    useUnifiedTopology: true,
  });

  await loadPlanetsData();
  await loadLaunchesData();

  server.listen(PORT, () => {
    console.log(`Server is running on http://192.168.0.151:${PORT}`);
  });
}
startServer();
