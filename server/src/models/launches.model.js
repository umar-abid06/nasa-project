const axios = require("axios");

const launches = require("./launches.mongo");
const planets = require("./planets.mongo");

// const launches = new Map();

// let latestFlightNumber = 100;

const DEFAULT_FLIGHT_NUMBER = 100;

// const launch = {
//   flightNumber: 100, //flight_number
//   mission: "Kepler Exploration X", //name
//   rocket: "Explorer IS1", //rocket.name
//   launchDate: new Date("June 6, 2030"), //date_local
//   target: "Kepler-442 b", //not applicable
//   customers: ["ZTM", "NASA"], //payload.customers
//   upcoming: true, //upcoming
//   success: true, //success
// };

// launches.set(launch.flightNumber, launch);
// saveLaunch(launch);

const SPACEX_API_URL = "https://api.spacexdata.com/v4/launches/query";

async function populateLaunches() {
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      pagination: false,
      populate: [
        {
          path: "rocket",
          select: {
            name: 1,
          },
        },
        {
          path: "payloads",
          select: {
            customers: 1,
          },
        },
      ],
    },
  });

  if (response.status !== 200) {
    console.log("Problem Downloading Launch Data...");
    throw new Error("Launch Data Download Failed!");
  }

  const launchDocs = response.data.docs;

  for (const launchDoc of launchDocs) {
    const payloads = launchDoc["payloads"];
    const customers = payloads.flatMap((payload) => {
      return payload["customers"];
    });

    const launch = {
      flightNumber: launchDoc["flight_number"],
      mission: launchDoc["name"],
      rocket: launchDoc["rocket"]["name"],
      launchDate: launchDoc["date_local"],
      upcoming: launchDoc["upcoming"],
      success: launchDoc["success"],
      customers,
    };
    // console.log(launch);
    await saveLaunch(launch);
  }
}

async function loadLaunchesData() {
  const firstLaunch = await findLaunch({
    flightNumber: 1,
    rocket: "Falcon 1",
    mission: "FalconSat",
  });

  if (firstLaunch) {
    console.log("Launch data already loaded!");
    return;
  } else {
    await populateLaunches();
  }
  console.log("Downloading data...");
}

async function saveLaunch(launch) {
  await launches.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  );
}

async function findLaunch(filter) {
  return await launches.findOne(filter);
}

async function existsLaunchWithId(launchId) {
  return await findLaunch({
    flightNumber: launchId,
  });
}

async function getLatestFlightNumber() {
  const latestLaunch = await launches.findOne().sort("-flightNumber");

  if (!latestLaunch) {
    return DEFAULT_FLIGHT_NUMBER;
  }

  return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
  // return Array.from(launches.values());
  return await launches
    .find({}, { _id: 0, __v: 0 })
    .sort({ flightNumber: 1 })
    .skip(skip)
    .limit(limit);
}

async function addNewLaunch(launch) {
  const planet = await planets.findOne({
    keplerName: launch.target,
  });

  if (!planet) {
    throw new Error("No matching planet found!");
  }
  const newFlightNumber = (await getLatestFlightNumber()) + 1;

  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ["ZTM", "NASA"],
    flightNumber: newFlightNumber,
  });

  await saveLaunch(newLaunch);
}

// function addNewLaunch(launch) {
//   latestFlightNumber++;
//   launches.set(
//     latestFlightNumber,
//     Object.assign(launch, {
//       success: true,
//       upcoming: true,
//       customers: ["ZTM", "NASA"],
//       flightNumber: latestFlightNumber,
//     })
//   );
// }

async function abortLaunchById(launchId) {
  const aborted = await launches.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      success: false,
      //we will not use the upsert check to true because we are not inserting into database
    }
  );
  return aborted.acknowledged === true && aborted.modifiedCount === 1;

  // const aborted = launches.get(launchId);
  // aborted.upcoming = false;
  // aborted.success = false;
  // return aborted;
  // launches.delete(launchId);
}

module.exports = {
  existsLaunchWithId,
  getAllLaunches,
  addNewLaunch,
  abortLaunchById,
  loadLaunchesData,
};
