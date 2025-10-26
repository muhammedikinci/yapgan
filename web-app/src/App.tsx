import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { apiService } from "./services/api";
import Dashboard from "./pages/Dashboard";
import Notes from "./pages/Notes";
import NoteDetail from "./pages/NoteDetail";
import NewNote from "./pages/NewNote";
import EditNote from "./pages/EditNote";
import Tags from "./pages/Tags";
import Graph from "./pages/Graph";
import VectorSpace from "./pages/VectorSpace";
import Login from "./pages/Login";
import PublicNote from "./pages/PublicNote";
import NoteChat from "./pages/NoteChat";

// Simple auth check
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = apiService.getToken();
  return token ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set up 401 redirect callback
    apiService.setUnauthorizedCallback(() => {
      navigate("/login");
    });
  }, [navigate]);

  return (
    <Routes>
      {/* Public routes - no authentication required */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/public/:slug" element={<PublicNote />} />

      {/* Protected routes - all under /my prefix */}
      <Route
        path="/my/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/notes"
        element={
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/notes/:id"
        element={
          <ProtectedRoute>
            <NoteDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/new-note"
        element={
          <ProtectedRoute>
            <NewNote />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/edit-note/:id"
        element={
          <ProtectedRoute>
            <EditNote />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/tags"
        element={
          <ProtectedRoute>
            <Tags />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/graph"
        element={
          <ProtectedRoute>
            <Graph />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/vector-space"
        element={
          <ProtectedRoute>
            <VectorSpace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/notes/:noteId/chat"
        element={
          <ProtectedRoute>
            <NoteChat />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
