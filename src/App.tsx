import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CreateRoomPage from "./pages/CreateRoomPage";
import JoinRoomPage from "./pages/JoinRoomPage";
import RoomPage from "./pages/RoomPage";
import { isFirebaseConfigured } from "./firebase";

function ConfigBanner() {
  return (
    <div className="bg-amber-500 px-3 py-2 text-center text-xs font-semibold text-black">
      ⚠️ Firebase isn't configured yet. Copy <code>.env.example</code> to{" "}
      <code>.env</code>, add your Firebase keys, and restart. (See README.)
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      {!isFirebaseConfigured && <ConfigBanner />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
