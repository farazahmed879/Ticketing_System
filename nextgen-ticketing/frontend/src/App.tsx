import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Login from "./pages/auth/Login.tsx";
// import Register from "./pages/auth/Register.tsx";
import Dashboard from "./pages/dashboard/Dashboard.tsx";
import TicketList from "./pages/tickets/TicketList.tsx";
import TicketBoard from "./pages/tickets/TicketBoard.tsx";
import TicketDetail from "./pages/tickets/TicketDetail.tsx";
import Messages from "./pages/messages/Messages.tsx";
import DepartmentList from "./pages/departments/DepartmentList.tsx";
import UserList from "./pages/users/UserList.tsx";
import RoleList from "./pages/roles/RoleList.tsx";
import MainLayout from "./layouts/MainLayout.tsx";
import FullScreenLoader from "./components/FullScreenLoader.tsx";
import Notifications from "./pages/notifications/Notifications.tsx";
import Requests from "./pages/requests/Requests.tsx";
import Settings from "./pages/settings/Settings.tsx";
import Profile from "./pages/profile/Profile.tsx";
import Timesheet from "./pages/timesheet/Timesheet.tsx";
import TimesheetReview from "./pages/timesheet/TimesheetReview.tsx";
import TimesheetReport from "./pages/timesheet/TimesheetReport.tsx";
import CandidateList from "./pages/candidates/CandidateList.tsx";
import CandidateDetail from "./pages/candidates/CandidateDetail.tsx";
import InterviewList from "./pages/interviews/InterviewList.tsx";
import InterviewDetail from "./pages/interviews/InterviewDetail.tsx";

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="animate-fade-in">
    <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 24 }}>
      {title}
    </h1>
    <div
      className="glass-card"
      style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}
    >
      {title} management module is under construction.
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader subMessage="Verifying Session..." />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* <Route path="/register" element={<Register />} /> */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="tickets" element={<TicketList />} />
              <Route path="tickets/board" element={<TicketBoard />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="messages" element={<Messages />} />
              <Route path="teams" element={<PlaceholderPage title="Teams" />} />
              <Route path="departments" element={<DepartmentList />} />
              <Route
                path="groups"
                element={<PlaceholderPage title="Projects" />}
              />
              <Route path="timesheet" element={<Timesheet />} />
              <Route path="timesheet/review" element={<TimesheetReview />} />
              <Route path="timesheet/report" element={<TimesheetReport />} />
              <Route path="users" element={<UserList />} />
              <Route path="roles" element={<RoleList />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="requests" element={<Requests />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="candidates" element={<CandidateList />} />
              <Route path="candidates/:id" element={<CandidateDetail />} />
              <Route path="interviews" element={<InterviewList />} />
              <Route path="interviews/:id" element={<InterviewDetail />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;
