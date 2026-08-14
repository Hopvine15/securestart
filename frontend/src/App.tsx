import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ModuleDetail from "./pages/ModuleDetail";
import QuizPage from "./pages/QuizPage";
import ResultsPage from "./pages/ResultsPage";
import Training from "./pages/Training";

function App() {
  return (
    <Routes>
      <Route path="/" element={<div>Home</div>} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/mytraining" element={<Training />} />
      <Route path="/training" element={<Training />} />
      <Route path="/modules/:id" element={<ModuleDetail />} />
      <Route path="/modules/:id/quiz" element={<QuizPage />} />
      <Route path="/modules/:id/results" element={<ResultsPage />} />
    </Routes>
  );
}

export default App;
