import React, { useState, useEffect } from "react";
import TeamLogo from "./TeamLogo";
import TopPlayersWidget from "./TopPlayersWidget";

const Home = ({ setActiveTab, setSelectedTeam, setSelectedPlayer }) => {
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topScorers, setTopScorers] = useState([]);
  const [topAssisters, setTopAssisters] = useState([]);

  const SERVER_URL = "https://football-api-zuhthi.onrender.com/api";
  // When the page loads, fetch the data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Table
        const standingRes = await fetch(`${SERVER_URL}/teams/summary`);
        const standingData = await standingRes.json();
        setStandings(standingData);

        // Fetch Top Scorers
        const goalsRes = await fetch(`${SERVER_URL}/leaders/total_goals`);
        const goalsData = await goalsRes.json();
        setTopScorers(goalsData.slice(0, 5));

        // Fetch Top Assisters
        const assistsRes = await fetch(`${SERVER_URL}/leaders/total_assists`);
        const assistsData = await assistsRes.json();
        setTopAssisters(assistsData.slice(0, 5));
      } catch (error) {
        console.error("Error connecting to backend:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading)
    return (
      <div className="text-slate-400 animate-pulse">
        Loading dashboard data...
      </div>
    );

  // Helper to find opponent badges
  const getBadgeUrl = (teamName) => {
    const team = standings.find((t) => t.team_name === teamName);
    return team ? team.badge_url : null;
  };

  return (
    // lg:flex-row layout to put the table on the left and stats on the right on large screens
    <div className="flex flex-col xl:flex-row gap-6">
      {/* LEFT COLUMN: THE LEAGUE TABLE (Takes up ~70% width)  */}
      <div className="flex-grow w-full xl:w-[70%]">
        <div className="bg-panel rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
          {/* Table Header */}
          <div className="p-5 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Premier League
            </h2>
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
              2024/2025
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 font-medium">#</th>
                  <th className="px-5 py-4 font-medium">Club</th>
                  <th className="px-3 py-4 font-medium text-center">MP</th>
                  <th className="px-3 py-4 font-medium text-center">W</th>
                  <th className="px-3 py-4 font-medium text-center">D</th>
                  <th className="px-3 py-4 font-medium text-center">L</th>
                  <th className="px-3 py-4 font-medium text-center hidden md:table-cell">
                    GF
                  </th>
                  <th className="px-3 py-4 font-medium text-center hidden md:table-cell">
                    GA
                  </th>
                  <th className="px-3 py-4 font-medium text-center">GD</th>
                  <th className="px-5 py-4 font-bold text-white text-center">
                    Pts
                  </th>
                  <th className="px-5 py-4 font-medium text-center">Form</th>
                  <th className="px-5 py-4 font-medium text-center">Next</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {standings.map((team) => (
                  <tr
                    key={team.team_name}
                    className="hover:bg-slate-750 transition-colors group"
                  >
                    {/* Position */}
                    <td className="px-5 py-3">
                      <span
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                          team.rank <= 4
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : team.rank >= 18
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "text-slate-400"
                        }`}
                      >
                        {team.rank}
                      </span>
                    </td>

                    {/* Club Name & Logo */}
                    <td
                      className="px-5 py-3 cursor-pointer group"
                      onClick={() => {
                        setSelectedTeam(team.team_name);
                        setActiveTab("teams");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <TeamLogo
                          teamName={team.team_name}
                          badgeUrl={team.badge_url}
                          size={6}
                        />
                        <span className="font-semibold text-white group-hover:text-accent transition-colors cursor-pointer whitespace-nowrap">
                          {team.team_name}
                        </span>
                      </div>
                    </td>

                    {/* Core Stats */}
                    <td className="px-3 py-3 text-center">
                      {team.matches_played}
                    </td>
                    <td className="px-3 py-3 text-center">{team.wins}</td>
                    <td className="px-3 py-3 text-center">{team.draws}</td>
                    <td className="px-3 py-3 text-center">{team.losses}</td>
                    <td className="px-3 py-3 text-center text-slate-400 hidden md:table-cell">
                      {team.goals_for}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400 hidden md:table-cell">
                      {team.goals_against}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {team.goal_difference}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-white text-base bg-slate-800/20">
                      {team.points}
                    </td>

                    {/* Form (Recent 5 Matches Placeholder) */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {team.form_array &&
                          team.form_array.map((res, i) => (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border ${
                                res === "W"
                                  ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                                  : res === "D"
                                    ? "bg-slate-600/30 text-slate-400 border-slate-600/50"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                              }`}
                            >
                              {res}
                            </div>
                          ))}
                      </div>
                    </td>

                    {/* Next Fixture (Placeholder) */}
                    <td className="px-5 py-3">
                      {team.next_opponent && team.next_opponent !== "TBD" ? (
                        <div className="flex items-center justify-center gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700 whitespace-nowrap">
                          <TeamLogo
                            teamName={team.next_opponent}
                            badgeUrl={getBadgeUrl(team.next_opponent)}
                            size={4}
                          />

                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                            {/* Grabs the first 3 letters of the team  */}
                            {team.next_opponent.substring(0, 3)}{" "}
                            <span className="text-slate-500">
                              ({team.next_home_away === "h" ? "H" : "A"})
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 flex justify-center">
                          -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PLAYER STATS (Takes up ~25% width)*/}
      <div className="w-full xl:w-[25%] space-y-6">
        {/* Top Scorers Box Placeholder */}
        <TopPlayersWidget
          title="Top Scorers"
          data={topScorers}
          statKey="total_goals"
          statLabel="Goals"
          accentColor="text-emerald-400"
          setActiveTab={setActiveTab}
          setSelectedTeam={setSelectedTeam}
          setSelectedPlayer={setSelectedPlayer}
        />

        {/* Top Assists Box Placeholder */}
        <TopPlayersWidget
          title="Top Assists"
          data={topAssisters}
          statKey="total_assists"
          statLabel="Assists"
          accentColor="text-blue-400"
          setActiveTab={setActiveTab}
          setSelectedTeam={setSelectedTeam}
          setSelectedPlayer={setSelectedPlayer}
        />
      </div>
    </div>
  );
};

export default Home;
