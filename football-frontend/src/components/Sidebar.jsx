import React from "react";
import { Home, Trophy, Users, Activity } from "lucide-react";

const Sidebar = ({ activeTab, setActiveTab }) => {
  // Define our menu items and their corresponding icons
  const menuItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "teams", label: "Teams", icon: Users },
    { id: "players", label: "Players", icon: Activity },
  ];

  return (
    <div className="w-48 h-screen bg-panel border-r border-slate-700 flex flex-col fixed left-0 top-0">
      {/* Logo Area */}
      <div className="h-20 flex items-center justify-center border-b border-slate-700 p-4">
        <img
          src="https://r2.thesportsdb.com/images/media/league/badge/gasy9d1737743125.png"
          alt="Premier League"
          className="h-14 w-auto object-contain drop-shadow-lg"
        />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-8 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-accent/10 text-accent font-semibold" // Active state style
                  : "text-slate-400 hover:bg-slate-800 hover:text-white" // Inactive state style
              }`}
            >
              <Icon size={20} className="mr-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
