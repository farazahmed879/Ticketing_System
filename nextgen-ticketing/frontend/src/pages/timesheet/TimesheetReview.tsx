import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../services/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import CustomButton from '../../components/CustomButton';
import CustomTable from '../../components/CustomTable';
import CustomIcon from '../../components/CustomIcon';
import styles from './Timesheet.module.css';
import TimesheetReviewModal from './components/TimesheetReviewModal';

import type { TimesheetEntry } from '../../types';

const TimesheetReview: React.FC = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.TIMESHEETS.PENDING);
      setEntries(res.data.entries);
    } catch (err) {
      console.error('Failed to fetch pending timesheets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.post(API_ROUTES.TIMESHEETS.APPROVE(id));
      setEntries(entries.filter(e => e.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to approve timesheet', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(API_ROUTES.TIMESHEETS.REJECT(id), { reason: rejectReason });
      setEntries(entries.filter(e => e.id !== id));
      setIsModalOpen(false);
      setRejectReason("");
    } catch (err) {
      console.error('Failed to reject timesheet', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Pending Timesheet Approvals</h1>
        <CustomButton variant="secondary" onClick={fetchPending} icon={<CustomIcon name="Clock" size={18} />}>
          Refresh
        </CustomButton>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <CustomTable
          columns={[
            { 
              header: "User", 
              key: "user", 
              render: (e) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CustomIcon name="User" size={16} />
                  </div>
                  <span>{e.user?.fullname}</span>
                </div>
              )
            },
            { 
              header: "Date", 
              key: "date", 
              render: (e) => format(new Date(e.date), "MMM dd, yyyy") 
            },
            { 
              header: "Hours", 
              key: "totalHours", 
              render: (e) => <strong>{e.totalHours}h</strong>
            },
            {
              header: "Tasks",
              key: "tasks",
              render: (e) => `${e.tasks.length} tasks`
            },
            {
              header: "Actions",
              key: "actions",
              render: (e) => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <CustomButton 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => { setSelectedEntry(e); setIsModalOpen(true); }}
                    icon={<CustomIcon name="Eye" size={16} />}
                  >
                    View
                  </CustomButton>
                  <CustomButton 
                    variant="gradient" 
                    size="sm" 
                    onClick={() => handleApprove(e.id)}
                    icon={<CustomIcon name="CheckCircle2" size={16} />}
                    style={{ background: 'var(--accent-success)', border: 'none' }}
                  >
                    Approve
                  </CustomButton>
                </div>
              )
            }
          ]}
          data={entries}
          loading={loading}
          emptyMessage="No pending timesheets to review"
        />
      </div>

      <TimesheetReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entry={selectedEntry}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};

export default TimesheetReview;
