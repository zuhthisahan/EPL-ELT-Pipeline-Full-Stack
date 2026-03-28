const express = require("express");
const cors = require("cors");
// const fs = require("fs");
// const path = require("path");

const app = express();

app.use(cors());

// const API_DIR = "D:/Data Engineering/airflow-football/data_lake/gold_api";
// S3 URL
const S3_BASE_URL =
  "https://football-dashboard-data-zuhthi.s3.us-east-1.amazonaws.com";

// Helper funtion
async function sendData(res, file_name) {
  // const filepath = path.join(API_DIR, file_name);
  // fs.readFile(filepath, "utf-8", (err, data) => {
  //   if (err) {
  //     console.error(`Error reading file ${filepath}:`, err);
  //     res.status(500).send("Error reading file");
  //   } else {
  //     res.json(JSON.parse(data));
  //   }
  // });
  try {
    // Fetch the JSON directly from your S3 bucket
    const response = await fetch(`${S3_BASE_URL}/${file_name}`);
    if (!response.ok) throw new Error("Failed to fetch from S3");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching team summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

// Send Team Data
async function sendTeamData(res, filename, teamName) {
  // const filepath = path.join(API_DIR, filename);
  // console.log(`Fetching data for team: ${teamName} from file: ${filename}`);

  // fs.readFile(filepath, "utf-8", (err, data) => {
  //   if (err) {
  //     console.error(`Error reading file ${filepath}:`, err);
  //     return res.status(500).send("Error reading file");
  //   }

  //   const teams = JSON.parse(data);

  const response = await fetch(`${S3_BASE_URL}/${filename}`);
  if (!response.ok) throw new Error("Failed to fetch from S3");
  const teams = await response.json();

  const teamSummary = teams.filter(
    (team) =>
      team.team_name && team.team_name.toLowerCase() === teamName.toLowerCase(),
  );
  if (teamSummary.length > 0) {
    res.json(teamSummary);
  } else {
    res.status(404).json({
      error: `Team '${teamName}' not found in the database.`,
    });
  }
}

// Define API endpoints

// Team APIs
// team stats
app.get("/api/teams/summary", (req, res) => {
  sendData(res, "new_team_summary.json");
});

// team tactics
app.get("/api/teams/tactics", (req, res) => {
  sendData(res, "team_tactics.json");
});

// team results and trends
app.get("/api/teams/trends", (req, res) => {
  sendData(res, "team_trends.json");
});

// Team specific summary
app.get("/api/teams/summary/:team_name", (req, res) => {
  sendTeamData(res, "new_team_summary.json", req.params.team_name);
});

// Team specific tactics
app.get("/api/teams/tactics/:team_name", (req, res) => {
  sendTeamData(res, "team_tactics.json", req.params.team_name);
});

// Team specific trends
app.get("/api/teams/trends/:team_name", (req, res) => {
  sendTeamData(res, "team_trends.json", req.params.team_name);
});

// Get a all players in a team
app.get("/api/teams/players/:team_name", async (req, res) => {
  const teamName = req.params.team_name.toLowerCase();

  const response = await fetch(`${S3_BASE_URL}/new_players.json`);
  if (!response.ok) throw new Error("Failed to fetch from S3");
  const players = await response.json();

  const teamPlayers = players.filter(
    (p) => p.club && p.club.toLowerCase() === teamName,
  );

  if (teamPlayers.length > 0) {
    res.json(teamPlayers);
  } else {
    res.status(404).json({
      error: `Team '${teamName}' not found in players file`,
    });
  }
});

// League
// leagure recent results
app.get("/api/matches/recent", (req, res) => {
  sendData(res, "recent_results.json");
});

// league upcoming fixtures
app.get("/api/matches/upcoming", (req, res) => {
  sendData(res, "upcoming_fixtures.json");
});

// Player API
// players stats
app.get("/api/players", (req, res) => {
  sendData(res, "new_players.json");
});

// Get a single player's profile
app.get("/api/players/profile/:playerName", async (req, res) => {
  // Replace hyphens or underscores with spaces if the frontend sends them that way
  const requestedPlayer = req.params.playerName
    .toLowerCase()
    .replace(/-/g, " ");

  const response = await fetch(`${S3_BASE_URL}/new_players.json`);
  if (!response.ok) throw new Error("Failed to fetch from S3");
  const allPlayers = await response.json();

  const player = allPlayers.find(
    (p) => p.player_name.toLowerCase() === requestedPlayer,
  );

  if (player) {
    res.json(player);
  } else {
    res.status(404).json({ error: "Player not found" });
  }
});

// Get Top 10 Leaders for any stat (goals, assist, xg)
app.get("/api/leaders/:stat", async (req, res) => {
  const stat = req.params.stat;
  const response = await fetch(`${S3_BASE_URL}/new_players.json`);
  if (!response.ok) throw new Error("Failed to fetch from S3");
  let allPlayers = await response.json();

  // Filter out players where the stat is null, then sort descending
  const leaders = allPlayers
    .filter((p) => p[stat] !== null && p[stat] !== undefined)
    .sort((a, b) => b[stat] - a[stat]) // sort descending; without (a,b) => (b-a) it was sorting alphabetically by the stat value instead of numerically
    .slice(0, 10); // limit to top 10

  res.json(leaders);
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\nFootball Backend is LIVE!`);
  console.log(`=============================`);
  console.log(`Test your endpoints here:`);
  console.log(`http://localhost:${PORT}/api/players`);
  console.log(`http://localhost:${PORT}/api/teams/summary`);
  console.log(`http://localhost:${PORT}/api/teams/tactics`);
  console.log(`http://localhost:${PORT}/api/teams/trends`);
  console.log(`http://localhost:${PORT}/api/matches/recent`);
  console.log(`http://localhost:${PORT}/api/matches/upcoming\n`);
});
