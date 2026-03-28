import React from "react";
import PlayerAvatar from "./PlayerAvatar";

const TopPlayersWidget = ({
  title,
  data,
  statKey,
  statLabel,
  accentColor,
  setActiveTab,
  setSelectedTeam,
  setSelectedPlayer,
}) => {
  return (
    <div className="bg-panel rounded-2xl border border-slate-700 flex flex-col p-5 shadow-lg h-[380px]">
      <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-3">
        {title}
      </h3>

      <div className="flex-1 overflow-y-auto pr-2 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
        {data.map((player, index) => (
          <div
            key={player.player_name}
            onClick={() => {
              setSelectedPlayer(player.player_name);
              setSelectedTeam(player.team_name || player.club);
              setActiveTab("players");
            }}
            className="flex items-center justify-between py-1 pr-2 pl-0 rounded-xl hover:bg-slate-800/60 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {/* Rank Number */}
              <span className="text-slate-500 font-bold text-sm w-4 text-center">
                {index + 1}
              </span>

              {/* Player Avatar */}
              <PlayerAvatar
                playerName={player.player_name}
                imageUrl={player.image_url}
                size={8}
              />

              {/* Name & Club */}
              <div>
                <p className="text-sm font-bold text-white group-hover:text-white/80 transition-colors line-clamp-1">
                  {player.player_name}
                </p>
                <p className="text-xs text-slate-400">
                  {player.team_name || player.club || "Unknown Club"}
                </p>
              </div>
            </div>

            {/* The Stat Number */}
            <div className="text-right pl-2">
              <p className={`text-xl font-black ${accentColor}`}>
                {player[statKey]}
              </p>
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                {statLabel}
              </p>
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-10 italic">
            No player data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default TopPlayersWidget;
