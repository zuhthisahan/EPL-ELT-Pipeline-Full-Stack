import React, { useState, useEffect } from "react";
import PlayerAvatar from "./PlayerAvatar";

const Players = ({
  selectedTeam,
  setSelectedTeam,
  selectedPlayer,
  setSelectedPlayer,
}) => {
  const [allTeams, setAllTeams] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch the master list of teams for the top-left filter
  useEffect(() => {
    fetch("https://football-api-zuhthi.onrender.com/api/teams/summary")
      .then((res) => res.json())
      .then((data) => {
        setAllTeams(data);
        if (!selectedTeam && data.length > 0) {
          setSelectedTeam(data[0].team_name);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedTeam, setSelectedTeam]);

  // 2. Fetch the roster for the currently selected team
  useEffect(() => {
    if (!selectedTeam) return;

    // setIsLoading(true);
    fetch(
      `https://football-api-zuhthi.onrender.com/api/teams/players/${encodeURIComponent(selectedTeam)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setTeamPlayers(data);

        // If there's no selected player, OR if the selected player is from a different team,
        // automatically default to this team's top scorer.
        const isPlayerInTeam = data.some(
          (p) => p.player_name === selectedPlayer,
        );

        if (!selectedPlayer || !isPlayerInTeam) {
          if (data.length > 0) {
            // Sort by goals descending to find the top scorer
            const topScorer = [...data].sort(
              (a, b) => b.total_goals - a.total_goals,
            )[0];
            setSelectedPlayer(topScorer.player_name);
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching players:", err);
        setIsLoading(false);
      });
  }, [selectedTeam, selectedPlayer, setSelectedPlayer]);

  if (
    isLoading ||
    !selectedTeam ||
    !selectedPlayer ||
    teamPlayers.length === 0
  ) {
    return (
      <div className="text-slate-400 animate-pulse">
        Loading player profile...
      </div>
    );
  }

  // Get the current player's data object
  const playerStats =
    teamPlayers.find((p) => p.player_name === selectedPlayer) || teamPlayers[0];

  // Derived Stats
  const safeMinutes = Math.max(playerStats.total_minutes, 1);
  const goalsPer90 = ((playerStats.total_goals / safeMinutes) * 90).toFixed(2);
  const assistsPer90 = ((playerStats.total_assists / safeMinutes) * 90).toFixed(
    2,
  );

  const maxStatValue = 15;
  const goalsPercent = Math.min(
    (playerStats.total_goals / maxStatValue) * 100,
    100,
  );
  const xgPercent = Math.min((playerStats.total_xg / maxStatValue) * 100, 100);
  const assistsPercent = Math.min(
    (playerStats.total_assists / maxStatValue) * 100,
    100,
  );
  const xaPercent = Math.min((playerStats.total_xa / maxStatValue) * 100, 100);

  // Similar Players Algorithm
  // 1. Get everyone in the same position (excluding the current player)
  let similarPlayers = teamPlayers.filter(
    (p) =>
      p.position === playerStats.position &&
      p.player_name !== playerStats.player_name,
  );

  // 2. If we have less than 8, pad the list with other players alphabetically
  if (similarPlayers.length < 8) {
    const otherPlayers = teamPlayers
      .filter(
        (p) =>
          p.position !== playerStats.position &&
          p.player_name !== playerStats.player_name,
      )
      .sort((a, b) => a.player_name.localeCompare(b.player_name));

    similarPlayers = [...similarPlayers, ...otherPlayers].slice(0, 8);
  } else {
    similarPlayers = similarPlayers.slice(0, 8);
  }

  return (
    <div className="space-y-6">
      {/* TOP BAR: Dual Filters */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-4 flex flex-col md:flex-row items-center justify-between shadow-xl gap-4">
        <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
          Player Profile Hub
        </h1>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* 1. Team Filter */}
          <div className="flex items-center bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-700 shrink-0">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-transparent text-white text-sm font-bold py-1 focus:outline-none cursor-pointer"
            >
              {allTeams.map((team) => (
                <option
                  key={team.team_name}
                  value={team.team_name}
                  className="bg-slate-800"
                >
                  {team.team_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Player Filter */}
          <div className="flex items-center bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30 shrink-0">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="bg-transparent text-emerald-400 text-sm font-bold py-1 focus:outline-none cursor-pointer max-w-[150px] md:max-w-xs"
            >
              {teamPlayers.map((p) => (
                <option
                  key={p.player_name}
                  value={p.player_name}
                  className="bg-slate-800 text-white"
                >
                  {p.player_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: Profile (Left) & Data (Right) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN: Player Profile Card */}
        <div className="w-full lg:w-1/4">
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg rounded-2xl flex flex-col items-center p-6 sticky top-6">
            <div className="w-40 h-40 rounded-full bg-slate-900 border-4 border-slate-700 overflow-hidden mb-4 shadow-xl shrink-0">
              {playerStats.image_url ? (
                <img
                  src={playerStats.image_url.replace("40x40", "250x250")}
                  alt={playerStats.player_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = playerStats.image_url;
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-slate-500 font-bold">
                  {playerStats.player_name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="text-2xl font-black text-white text-center leading-tight mb-1">
              {playerStats.player_name}
            </h2>
            <p className="text-emerald-400 font-bold text-sm tracking-wider uppercase mb-6">
              {playerStats.club}
            </p>

            <div className="w-full space-y-3 border-t border-slate-700 pt-5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Position
                </span>
                <span className="text-sm text-slate-200 font-bold">
                  {playerStats.position}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Nationality
                </span>
                <span className="text-sm text-slate-200 font-bold">
                  {playerStats.nationality}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Matches
                </span>
                <span className="text-sm text-slate-200 font-bold">
                  {playerStats.matches_played}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Minutes
                </span>
                <span className="text-sm text-slate-200 font-bold">
                  {playerStats.total_minutes}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Performance Data & Similar Players */}
        <div className="w-full lg:w-3/4 flex flex-col gap-6">
          {/* Top Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col justify-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Goals
              </span>
              <span className="text-3xl font-black text-emerald-400">
                {playerStats.total_goals}
              </span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col justify-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Assists
              </span>
              <span className="text-3xl font-black text-cyan-400">
                {playerStats.total_assists}
              </span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col justify-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Goals / 90
              </span>
              <span className="text-3xl font-black text-white">
                {goalsPer90}
              </span>
            </div>
            <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-xl shadow-lg flex flex-col justify-center text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Assists / 90
              </span>
              <span className="text-3xl font-black text-white">
                {assistsPer90}
              </span>
            </div>
          </div>

          {/* Expected vs Actual Section */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-6 border-b border-slate-700 pb-2 tracking-wide flex justify-between">
              <span>Expected vs Actual Performance</span>
              <span className="text-emerald-400">
                Total xG: {playerStats.total_xg?.toFixed(2)}
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Goal Finishing Analysis */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Goal Threat
                </h4>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">
                      Actual Goals
                    </span>
                    <span className="text-white font-bold">
                      {playerStats.total_goals}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-emerald-400 h-2.5 rounded-full"
                      style={{ width: `${goalsPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">
                      Expected Goals (xG)
                    </span>
                    <span className="text-white font-bold">
                      {playerStats.total_xg?.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-slate-500 h-2.5 rounded-full"
                      style={{ width: `${xgPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div
                  className={`mt-4 p-3 rounded-lg border ${playerStats.xg_performance > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"}`}
                >
                  <p className="text-xs text-slate-300 text-center">
                    Finishing Performance:{" "}
                    <span
                      className={`font-bold ${playerStats.xg_performance > 0 ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {playerStats.xg_performance > 0 ? "+" : ""}
                      {playerStats.xg_performance?.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Playmaking Analysis */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Playmaking Threat
                </h4>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">
                      Actual Assists
                    </span>
                    <span className="text-white font-bold">
                      {playerStats.total_assists}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-cyan-400 h-2.5 rounded-full"
                      style={{ width: `${assistsPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">
                      Expected Assists (xA)
                    </span>
                    <span className="text-white font-bold">
                      {playerStats.total_xa?.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-slate-500 h-2.5 rounded-full"
                      style={{ width: `${xaPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SIMILAR PLAYERS (Squad Overview)           */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-xl shadow-lg mt-2">
            <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-700 pb-2 tracking-wide">
              Squad Mates & Similar Roles
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {similarPlayers.map((p) => (
                <div
                  key={p.player_name}
                  onClick={() => setSelectedPlayer(p.player_name)}
                  className="bg-slate-900/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-3 flex flex-col items-center cursor-pointer transition-all group hover:-translate-y-1"
                >
                  <PlayerAvatar
                    playerName={p.player_name}
                    imageUrl={p.image_url}
                    size={12}
                  />
                  <span className="mt-3 text-xs font-bold text-white text-center line-clamp-1 group-hover:text-emerald-400 transition-colors">
                    {p.player_name}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mt-1">
                    {p.position}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Players;
