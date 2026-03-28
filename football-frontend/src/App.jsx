import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Home from "./components/Home";
import Teams from "./components/Teams";
import Players from "./components/Players";

function App() {
  // This state controls which page is currently visible
  const [activeTab, setActiveTab] = useState("home");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div className="min-h-screen bg-dark text-slate-200 font-sans flex">
      {/* 1. The Left Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* 2. The Main Content Area */}
      <main className="flex-1 ml-48 p-5">
        {/* Top Header with Banner Background */}
        <header className="mb-10 relative rounded-2xl overflow-hidden h-20 flex flex-col items-center justify-center text-center shadow-2xl border border-slate-700/50">
          {/* 1. The Banner Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity transition-all duration-700"
            style={{
              backgroundImage: `url('https://r2.thesportsdb.com/images/media/league/banner/xe1es51638921786.jpg?q=80&w=2000&auto=format&fit=crop')`,
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-dark via-dark/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-dark/50 via-transparent to-dark/50"></div>

          {/* 3. The Text Content */}
          <div className="relative z-10 transform transition-transform hover:scale-105 duration-300">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 capitalize tracking-tight mb-2">
              {activeTab === "home"
                ? "Premier League Leaderboard"
                : `${activeTab} Dashboard`}
            </h2>
            <div className="text-sm font-bold text-slate-300 tracking-[0.3em] uppercase drop-shadow-md">
              Season 2025/2026
            </div>
          </div>
        </header>

        {/* Dynamic Content Rendering */}
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 ">
          {activeTab === "home" && (
            <Home
              setActiveTab={setActiveTab}
              setSelectedTeam={setSelectedTeam}
              setSelectedPlayer={setSelectedPlayer}
            />
          )}

          {activeTab === "teams" && (
            <Teams
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              setSelectedPlayer={setSelectedPlayer}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "players" && (
            <Players
              selectedTeam={selectedTeam}
              setSelectedTeam={setSelectedTeam}
              selectedPlayer={selectedPlayer}
              setSelectedPlayer={setSelectedPlayer}
            />
          )}
        </div>

        <footer className="w-full text-center py-8 mt-6 border-t border-slate-800/60">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            Designed & Developed by{" "}
            <span className="text-emerald-400 font-bold ml-1">
              Zuhthi Sahan Rahmathullah
            </span>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
