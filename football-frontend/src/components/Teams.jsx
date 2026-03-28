import React, { useState, useEffect } from "react";
import TeamLogo from "./TeamLogo";
import TeamTactics from "./TeamTactics";
import TeamTrends from "./TeamTrends";

const Teams = ({
  selectedTeam,
  setSelectedTeam,
  setActiveTab,
  setSelectedPlayer,
}) => {
  const [allTeams, setAllTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentMatches, setRecentMatches] = useState([]);

  const [teamPlayers, setTeamPlayers] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "total_goals",
    direction: "desc",
  });
  const [fullTimeline, setFullTimeline] = useState([]);

  // To get selected team details
  useEffect(() => {
    // Fetch all teams to populate the dropdown and find our current team's stats
    fetch("https://football-api-zuhthi.onrender.com/api/teams/summary")
      .then((res) => res.json())
      .then((data) => {
        setAllTeams(data);

        // If no team is selected (e.g., clicked from Sidebar), default to the #1 rank team
        if (!selectedTeam && data.length > 0) {
          setSelectedTeam(data[0].team_name);
        }
        setIsLoading(false);
      })
      .catch((err) => console.error(err));
  }, [selectedTeam, setSelectedTeam]);

  // To get selected team recent results
  useEffect(() => {
    if (!selectedTeam) return;

    fetch(
      `https://football-api-zuhthi.onrender.com/api/teams/trends/${encodeURIComponent(selectedTeam)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        // filter out any fixutres included
        const playedMatches = data.filter((m) => m.result !== null);

        // Sort by date
        const sortedMatches = playedMatches.sort(
          (a, b) => new Date(b.match_date) - new Date(a.match_date),
        );
        console.log(sortedMatches.slice(0, 3).reverse());
        // Get the last five result
        setRecentMatches(sortedMatches.slice(0, 3).reverse());
        setFullTimeline([...sortedMatches].reverse());
      })
      .catch((err) => console.error(err));
  }, [selectedTeam]);

  // Fetch players
  useEffect(() => {
    if (!selectedTeam) return;
    console.log(selectedTeam);
    fetch(
      `https://football-api-zuhthi.onrender.com/api/teams/players/${encodeURIComponent(selectedTeam)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setTeamPlayers(data);
      })
      .catch((err) => console.error(err));
  }, [selectedTeam]);

  // Handle sorting logic
  const handleSort = (key) => {
    if (key === "XGP") {
      key = "xg_performance";
    }
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  // Sort the players based on current config [top 5]
  const sortedPlayers = [...teamPlayers]
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key])
        return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key])
        return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    })
    .slice(0, 6);

  // Loaidnf data
  if (isLoading || !selectedTeam)
    return (
      <div className="text-slate-400 animate-pulse">Loading team data...</div>
    );

  // Find the specific stats for the currently selected team
  const teamStats =
    allTeams.find((t) => t.team_name === selectedTeam) || allTeams[0];

  // Helper to find opponent badges
  const getBadgeUrl = (teamName) => {
    const team = allTeams.find((t) => t.team_name === teamName);
    return team ? team.badge_url : null;
  };

  return (
    <div className="space-y-6">
      {/* TOP BAR: Logo, Name, Header, and Filter    */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-4 flex items-center justify-between shadow-xl gap-4">
        {/* RIGHT — logo */}
        <div className="shrink-0">
          <TeamLogo
            teamName={teamStats.team_name}
            badgeUrl={teamStats.badge_url}
            size={16}
          />
        </div>
        {/* CENTER — team name */}
        <div className="flex flex-col items-center text-center flex-1">
          <h1 className="text-2xl md:text-3xl font-black text-emerald-400 tracking-wide drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
            {teamStats.team_name}
          </h1>

          <p className="text-emerald-400 font-semibold tracking-widest uppercase text-[10px] md:text-xs mt-1">
            Team Performance Overview
          </p>
        </div>

        {/* Left — Filter */}
        <div className="flex items-center bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-700">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-dark text-white text-sm font-bold py-2 px-4 rounded-lg border border-slate-600 focus:outline-none focus:border-emerald-500 cursor-pointer w-40 md:w-48"
          >
            {allTeams.map((team) => (
              <option key={team.team_name} value={team.team_name}>
                {team.team_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MAIN LAYOUT: Left (Stats/Players) & Right (Tactics/Trends) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN (Takes up 50% width)     */}

        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          <div className="flex flex-row w-full gap-3 md:gap-4">
            {/* Games */}
            <div className="flex-1 bg-slate-800/60 border border-slate-600 rounded-xl shadow-lg text-center flex flex-col justify-center h-24 w-1/4 hover:scale-[1.03] transition">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 leading-tight">
                Total
                <br />
                Games
              </p>

              <p className="text-lg md:text-2xl font-black text-white">
                {teamStats.matches_played}
              </p>
            </div>

            {/* Position */}
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/40 rounded-xl shadow-lg text-center flex flex-col justify-center h-24 w-1/4 hover:scale-[1.03] transition">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 leading-tight">
                League
                <br />
                Pos
              </p>

              <p className="text-lg md:text-2xl font-black text-emerald-400">
                {teamStats.rank}
              </p>
            </div>

            {/* Points */}
            <div className="flex-1 bg-cyan-500/10 border border-cyan-500/40 rounded-xl shadow-lg text-center flex flex-col justify-center h-24 w-1/4 hover:scale-[1.03] transition">
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 leading-tight">
                Total
                <br />
                Points
              </p>

              <p className="text-lg md:text-2xl font-black text-cyan-400">
                {teamStats.points}
              </p>
            </div>

            {/* Overall */}
            <div className="flex-1 bg-amber-500/10 border border-amber-500/40 rounded-xl shadow-lg text-center flex flex-col justify-center h-24 w-1/4 hover:scale-[1.03] transition">
              <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Overall
              </p>

              <p className="text-xs md:text-sm font-black text-slate-200">
                <span className="text-emerald-400">{teamStats.wins}W</span>
                <span className="text-slate-400"> - {teamStats.draws}D - </span>
                <span className="text-red-400">{teamStats.losses}L</span>
              </p>
            </div>
          </div>

          {/* FORM & NEXT GAME ROW: 3:1 ratio using w-3/4 and w-1/4 */}
          <div className="flex flex-row w-full gap-3 md:gap-4">
            {/* Last 3 Matches (Takes up 75% width) */}
            <div className="flex-[3] bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg hover:border-emerald-500/40 transition p-4 rounded-xl shadow-md w-3/4">
              <h3 className="text-[15px] text-slate-400 font-bold uppercase tracking-wider mb-3 text-center pb-4">
                Current Form
              </h3>

              <div className="flex flex-row justify-around items-end h-16">
                {recentMatches.length > 0 ? (
                  recentMatches.map((match, i) => {
                    const isHome = match.home_away === "h";
                    const opponent = match.opponent;
                    const teamGoals = match.goals_scored;
                    const oppGoals = match.goals_conceded;

                    // Determine the pill color based on the result
                    let outcomeColor =
                      "bg-yellow-500/70 text-slate-200 border-slate-500"; // Draw
                    if (teamGoals > oppGoals)
                      outcomeColor = "bg-emerald-500/80 border-emerald-600"; // Win
                    if (teamGoals < oppGoals)
                      outcomeColor = "bg-red-500/80 border-red-600"; // Loss

                    return (
                      <div
                        key={i}
                        className="flex flex-col items-center cursor-pointer group"
                        onClick={() => setSelectedTeam(opponent)}
                      >
                        <div className="transform group-hover:scale-110 transition-transform duration-200">
                          <TeamLogo
                            teamName={opponent}
                            badgeUrl={getBadgeUrl(opponent)}
                            size={8}
                          />
                        </div>

                        <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 mb-1">
                          {opponent.substring(0, 3)} ({isHome ? "h" : "a"})
                        </span>

                        <div
                          className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wider shadow-sm border border-b-2 ${outcomeColor}`}
                        >
                          {teamGoals} - {oppGoals}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full flex items-center justify-center text-xs text-slate-500 italic h-full">
                    Loading matches...
                  </div>
                )}
              </div>
            </div>

            {/* Next Game (Takes up 25% width) */}
            <div className="flex-1 bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg hover:border-emerald-500/40 transition p-2 md:p-4 rounded-xl shadow-md w-1/4 flex flex-col items-center justify-center text-center">
              <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                Next
              </h3>
              {teamStats.next_opponent && teamStats.next_opponent !== "TBD" ? (
                <div
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => setSelectedTeam(teamStats.next_opponent)}
                >
                  <div className="transform group-hover:scale-110 transition-transform duration-200">
                    <TeamLogo
                      teamName={teamStats.next_opponent}
                      badgeUrl={getBadgeUrl(teamStats.next_opponent)}
                      size={16}
                    />
                  </div>
                  <p className="text-[8px] md:text-[9px] text-slate-400 font-semibold mt-1">
                    {teamStats.next_home_away === "h" ? "HOME" : "AWAY"}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 font-medium text-xs italic">N/A</p>
              )}
            </div>
          </div>

          {/* PLAYERS TABLE PLACEHOLDER */}
          {/* PLAYERS TABLE */}
          <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg hover:border-emerald-500/40 transition rounded-xl flex flex-col p-4 overflow-hidden">
            <h3 className="text-sm font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-2 tracking-wide">
              Top Performers
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm text-slate-300">
                <thead className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-2 px-2 font-medium">Player</th>
                    {[
                      "matches_played",
                      "total_minutes",
                      "total_goals",
                      "total_assists",
                      "total_xg",
                      "total_xa",
                      "XGP",
                    ].map((col) => (
                      <th
                        key={col}
                        className="py-2 px-1 font-medium text-center cursor-pointer hover:text-emerald-400 transition-colors group"
                        onClick={() => handleSort(col)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {col.replace("total_", "").replace("_", " ")}
                          {/* Sort Indicator Arrow */}
                          <span
                            className={`text-[8px] ${sortConfig.key === col ? "text-emerald-400 opacity-100" : "opacity-0 group-hover:opacity-50"}`}
                          >
                            {sortConfig.key === col &&
                            sortConfig.direction === "asc"
                              ? "▲"
                              : "▼"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {sortedPlayers.length > 0 ? (
                    sortedPlayers.map((player) => (
                      <tr
                        key={player.player_name}
                        className="hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="py-3 px-2 flex items-center gap-3">
                          <div
                            onClick={() => {
                              setSelectedPlayer(player.player_name);
                              setSelectedTeam(player.team_name || player.club);
                              setActiveTab("players");
                            }}
                            className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-600 group cursor-pointer"
                          >
                            {player.image_url ? (
                              <img
                                src={player.image_url}
                                alt={player.player_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">
                                {player.player_name.substring(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-white whitespace-nowrap">
                              {player.player_name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {player.position || "Player"}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`py-3 px-2 text-center ${sortConfig.key === "matches_played" ? "text-emerald-400 font-bold bg-emerald-500/5" : ""}`}
                        >
                          {player.matches_played}
                        </td>
                        <td
                          className={`py-3 px-2 text-center ${sortConfig.key === "total_minutes" ? "text-emerald-400 font-bold bg-emerald-500/5" : ""}`}
                        >
                          {player.total_minutes}
                        </td>
                        <td
                          className={`py-3 px-2 text-center font-bold ${sortConfig.key === "total_goals" ? "text-emerald-400 bg-emerald-500/5" : "text-slate-200"}`}
                        >
                          {player.total_goals}
                        </td>
                        <td
                          className={`py-3 px-2 text-center font-bold ${sortConfig.key === "total_assists" ? "text-emerald-400 bg-emerald-500/5" : "text-slate-200"}`}
                        >
                          {player.total_assists}
                        </td>
                        <td
                          className={`py-3 px-2 text-center ${sortConfig.key === "total_xg" ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-400"}`}
                        >
                          {player.total_xg?.toFixed(2) || "0.00"}
                        </td>
                        <td
                          className={`py-3 px-2 text-center ${sortConfig.key === "total_xa" ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-400"}`}
                        >
                          {player.total_xa?.toFixed(2) || "0.00"}
                        </td>
                        <td
                          className={`py-3 px-2 text-center ${sortConfig.key === "xg_performance" ? "text-emerald-400 font-bold bg-emerald-500/5" : "text-slate-400"}`}
                        >
                          {player.xg_performance?.toFixed(2) || "0.00"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="py-8 text-center text-sm text-slate-500 italic"
                      >
                        No player data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* RIGHT COLUMN (Takes up 50% width)    */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          {/* TACTICS TABLE PLACEHOLDER */}
          <TeamTactics selectedTeam={selectedTeam} />

          <TeamTrends matchHistory={fullTimeline} getBadgeUrl={getBadgeUrl} />
        </div>
      </div>
    </div>
  );
};

export default Teams;
