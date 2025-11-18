import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import DevicePage from "./pages/DevicePage";
import ChirpStackEventsPage from "./pages/ChirpStackEventsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/device/:id" element={<DevicePage />} />
        <Route path="/chirpstack/events" element={<ChirpStackEventsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
