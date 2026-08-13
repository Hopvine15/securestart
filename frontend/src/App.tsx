import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ModuleDetail from "./pages/ModuleDetail";

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/modules/:id" element={<ModuleDetail />} />
    </Routes>
  );
}

export default App;
