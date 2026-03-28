import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import TeamLogo from "./TeamLogo";

// 1. Accept getBadgeUrl as a prop in the CustomTooltip
const CustomTooltip = ({ active, payload, getBadgeUrl }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isHome = data.home_away === "h" || data.home_away === "Home";

    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 p-3 rounded-xl shadow-2xl min-w-[180px]">
        {/* Header with Logo and Opponent Name */}
        <div className="flex items-center gap-3 mb-3 border-b border-slate-700 pb-3">
          <TeamLogo
            teamName={data.opponent}
            badgeUrl={getBadgeUrl ? getBadgeUrl(data.opponent) : null}
            size={6}
          />

          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {data.opponent}
            </p>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">
              {isHome ? "Home" : "Away"} • {data.short_date}
            </p>
          </div>
        </div>

        {/* Match Result Stats */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center bg-slate-900/50 px-2 py-1 rounded">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Score
            </span>
            <span className="text-sm font-black text-white">
              {data.goals_scored} - {data.goals_conceded}
            </span>
          </div>
          <div className="flex justify-between items-center px-2 py-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              xG For
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {data.xg_for?.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center px-2 py-1">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              xG Against
            </span>
            <span className="text-sm font-bold text-rose-400">
              {data.xg_against?.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const isHome = payload.home_away === "h" || payload.home_away === "Home";
  const fill = isHome ? "#10b981" : "#06b6d4";

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={fill}
      stroke="#1e293b"
      strokeWidth={2}
      className="transition-all hover:r-6 cursor-pointer"
    />
  );
};

// 2. Accept getBadgeUrl in the main component props
const TeamTrends = ({ matchHistory, getBadgeUrl }) => {
  if (!matchHistory || matchHistory.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl flex items-center justify-center h-full text-slate-500 italic text-sm">
        Loading trend data...
      </div>
    );
  }

  const formattedData = matchHistory.map((match) => ({
    ...match,
    short_date: match.match_date ? match.match_date.split(",")[0] : "",
  }));

  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 shadow-lg hover:border-emerald-500/40 transition rounded-xl flex flex-col p-5 h-96">
      <h3 className="text-sm font-bold text-emerald-400 mb-6 border-b border-slate-700 pb-2 tracking-wide flex items-center justify-between">
        <span>Performance Trends (xG)</span>

        <div className="flex items-center gap-4 text-[10px] text-slate-300 uppercase font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>{" "}
            Home Match
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.5)]"></span>{" "}
            Away Match
          </div>
        </div>
      </h3>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />

            <XAxis
              dataKey="short_date"
              stroke="#64748b"
              fontSize={10}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              stroke="#64748b"
              fontSize={10}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />

            {/* Pass getBadgeUrl into the CustomTooltip via the content prop */}
            <Tooltip
              content={<CustomTooltip getBadgeUrl={getBadgeUrl} />}
              cursor={{
                stroke: "#475569",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />

            <Line
              type="monotone"
              dataKey="xg_for"
              stroke="#10b981"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: "#10b981", stroke: "#fff" }}
            />

            <Line
              type="monotone"
              dataKey="xg_against"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TeamTrends;
