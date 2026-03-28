import React from "react";

const PlayerAvatar = ({ playerName, imageUrl, size = 10 }) => {
  // fallback if a player doesn't have an image
  const getFallbackUrl = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Unknown")}&background=1e293b&color=cbd5e1&rounded=true&bold=true`;

  return (
    <img
      src={imageUrl || getFallbackUrl(playerName)}
      alt={playerName}
      className={`w-${size} h-${size} rounded-full shadow-sm object-contain bg-slate-800 shrink-0`}
    />
  );
};

export default PlayerAvatar;
