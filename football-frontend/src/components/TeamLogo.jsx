import React from "react";

const TeamLogo = ({ teamName, badgeUrl, size = 8 }) => {
  const sizeMap = {
    4: "w-4 h-4 text-[8px]",
    6: "w-6 h-6 text-[10px]",
    8: "w-8 h-8 text-xs",
    16: "w-16 h-16 text-sm",
  };

  const dimensions = sizeMap[size] || sizeMap[8];

  return (
    <div className={`${dimensions} flex items-center justify-center shrink-0`}>
      {badgeUrl ? (
        <img
          src={badgeUrl}
          alt={teamName}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full bg-slate-700 rounded-full flex items-center justify-center text-slate-400 font-bold overflow-hidden">
          {teamName ? teamName.substring(0, 3).toUpperCase() : "?"}
        </div>
      )}
    </div>
  );
};

export default TeamLogo;
