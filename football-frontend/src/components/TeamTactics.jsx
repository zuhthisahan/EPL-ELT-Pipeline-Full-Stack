import React, { useState, useEffect } from "react";

const TeamTactics = ({ selectedTeam }) => {
  const [tactics, setTactics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedTeam) return;

    fetch(
      `https://football-api-zuhthi.onrender.com/api/teams/tactics/${encodeURIComponent(selectedTeam)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setTactics(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching tactics:", err);
        setIsLoading(false);
      });
  }, [selectedTeam]);

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg hover:border-emerald-500/40 transition rounded-xl flex flex-col p-5 min-h-[300px]">
      <h3 className="text-sm font-bold text-emerald-400 mb-4 border-b border-slate-700 pb-2 tracking-wide flex items-center justify-between">
        <span>Attacking Play Types</span>
        <span className="text-[10px] text-slate-500 font-normal tracking-normal uppercase">
          Season Totals
        </span>
      </h3>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic animate-pulse">
          Analyzing tactical data...
        </div>
      ) : tactics.length > 0 ? (
        <div className="overflow-x-auto flex-1 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-2 px-2 font-medium">Play Type</th>
                <th className="py-2 px-2 font-medium text-center">Goals</th>
                <th className="py-2 px-2 font-medium text-center">xG</th>
                <th className="py-2 px-2 font-medium text-center">Shots</th>
                <th className="py-2 px-2 font-medium text-center">xG/Shot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {tactics.map((item, index) => {
                // Calculate Over/Under performance for visual flair
                const diff = (item.goals_scored - item.expected_goals).toFixed(
                  2,
                );
                const isOverperforming = diff > 0;

                return (
                  <tr
                    key={index}
                    className="hover:bg-slate-700/30 transition-colors group"
                  >
                    {/* Play Type Name */}
                    <td className="py-3 px-2 font-bold text-white whitespace-nowrap">
                      {item.play_type}
                    </td>

                    {/* Goals */}
                    <td className="py-3 px-2 text-center">
                      <span className="text-emerald-400 font-black text-base">
                        {item.goals_scored}
                      </span>
                    </td>

                    {/* Expected Goals (xG) with Over/Under Indicator */}
                    <td className="py-3 px-2 text-center text-slate-300 font-semibold">
                      {item.expected_goals?.toFixed(2)}
                      <span
                        className={`ml-2 text-[9px] font-bold ${isOverperforming ? "text-emerald-500" : "text-red-500"}`}
                      >
                        ({isOverperforming ? "+" : ""}
                        {diff})
                      </span>
                    </td>

                    {/* Total Shots */}
                    <td className="py-3 px-2 text-center text-slate-400">
                      {item.total_shots}
                    </td>

                    {/* xG per shot */}
                    <td className="py-3 px-2 text-center text-slate-400">
                      {item.xg_per_shot?.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic">
          No tactical data available.
        </div>
      )}
    </div>
  );
};

export default TeamTactics;
