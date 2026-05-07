import React from "react";
import CustomIcon from "../../components/CustomIcon";
import StatsCards from "./components/StatsCards";

interface CustomerDashboardProps {
  stats: any;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ stats }) => {
  const cards = [
    {
      label: "My Total Tickets",
      value: stats?.totalTickets,
      icon: <CustomIcon name="Ticket" size={24} />,
      color: "var(--accent-primary)",
    },
    {
      label: "My Open Tickets",
      value: stats?.openTickets,
      icon: <CustomIcon name="Clock" size={24} />,
      color: "var(--accent-warning)",
    },
    {
      label: "My Resolved Tickets",
      value: stats?.resolvedTickets,
      icon: <CustomIcon name="CheckCircle2" size={24} />,
      color: "var(--accent-success)",
    },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}>
          Welcome Back!
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Here's an overview of your support tickets.
        </p>
      </div>

      <StatsCards cards={cards} />
      
      {/* If customer should see anything else, add it here */}
    </div>
  );
};

export default CustomerDashboard;
