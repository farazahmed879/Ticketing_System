import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { useTranslation } from "react-i18next";
import Login from "./pages/auth/Login.tsx";
// import Register from "./pages/auth/Register.tsx";
import Dashboard from "./pages/dashboard/index.tsx";
import TicketList from "./pages/tickets/index.tsx";
import TicketBoard from "./pages/tickets/kanbanBoard/TicketBoard.tsx";
import TicketDetail from "./pages/tickets/ticket-details/ticket-details-page/index.tsx";
import Messages from "./pages/messages/index.tsx";
import DepartmentList from "./pages/departments/index.tsx";
import DepartmentDetail from "./pages/departments/DepartmentDetail.tsx";
import TeamList from "./pages/teams/index.tsx";
import TeamDetail from "./pages/teams/TeamDetail.tsx";
import ProjectList from "./pages/projects/index.tsx";
import ProjectDetail from "./pages/projects/ProjectDetail.tsx";
import UserList from "./pages/users/index.tsx";
import RoleList from "./pages/roles/index.tsx";
import MainLayout from "./layouts/MainLayout.tsx";
import FullScreenLoader from "./components/FullScreenLoader";
import Notifications from "./pages/notifications/index.tsx";
import Requests from "./pages/requests/index.tsx";
import Settings from "./pages/settings/index.tsx";
import Profile from "./pages/profile/index.tsx";
import Timesheet from "./pages/timesheet/index.tsx";
import TimesheetReview from "./pages/timesheet/TimesheetReview.tsx";
import TimesheetReport from "./pages/timesheet/TimesheetReport.tsx";
import CandidateList from "./pages/candidates/index.tsx";
import CandidateDetail from "./pages/candidates/candidate-details/CandidateDetail.tsx";
import CandidateLeaderboard from "./pages/candidates/CandidateLeaderboard.tsx";
import InterviewList from "./pages/interviews/index.tsx";
import InterviewDetail from "./pages/interviews/InterviewDetail.tsx";
import AnnouncementList from "./pages/announcements/index.tsx";
import NotFound from "./pages/NotFound.tsx";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading)
    return <FullScreenLoader subMessage={t("topbar.verifyingSession")} />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
                <Route path="teams" element={<TeamList />} />
                <Route path="teams/:id" element={<TeamDetail />} />
                <Route path="departments" element={<DepartmentList />} />
                <Route path="departments/:id" element={<DepartmentDetail />} />
                <Route path="projects" element={<ProjectList />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="timesheet" element={<Timesheet />} />
                <Route path="timesheet/review" element={<TimesheetReview />} />
                <Route path="timesheet/report" element={<TimesheetReport />} />
                <Route path="users" element={<UserList />} />
                <Route path="roles" element={<RoleList />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="requests" element={<Requests />} />
                <Route path="settings" element={<Settings />} />
                <Route path="profile/:id?" element={<Profile />} />
                <Route path="candidates" element={<CandidateList />} />
                <Route
                  path="candidates/leaderboard"
                  element={<CandidateLeaderboard />}
                />
                <Route path="candidates/:id" element={<CandidateDetail />} />
                <Route path="interviews" element={<InterviewList />} />
                <Route path="interviews/:id" element={<InterviewDetail />} />
                <Route path="announcements" element={<AnnouncementList />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
