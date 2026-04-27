import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import CustomButton from '../../components/CustomButton';
import CustomTable from '../../components/CustomTable';
import CustomBadge from '../../components/CustomBadge';
import CustomSelect from '../../components/CustomSelect';
import CustomIcon from '../../components/CustomIcon';
import CustomSkeleton from '../../components/CustomSkeleton';
import api from '../../services/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import styles from './Timesheet.module.css';

import type { TimesheetReport as ITimesheetReport } from '../../types';

const TimesheetReport: React.FC = () => {
  const [report, setReport] = useState<ITimesheetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.TIMESHEETS.REPORT, {
        params: { month, year }
      });
      setReport(res.data.report);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Monthly Timesheet Report</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <CustomSelect
            value={month.toString()}
            onChange={(val) => setMonth(parseInt(val))}
            options={months.map((m, i) => ({ value: i.toString(), label: m }))}
            style={{ width: 150 }}
          />
          <CustomSelect
            value={year.toString()}
            onChange={(val) => setYear(parseInt(val))}
            options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
            style={{ width: 120 }}
          />
          <CustomButton variant="secondary" icon={<CustomIcon name="Download" size={18} />}>
            Export PDF
          </CustomButton>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Hours Logged</div>
          <div className={styles.statValue}>
            {loading ? <CustomSkeleton width="60px" height="2rem" /> : `${report?.totalHours || 0}h`}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Approved Hours</div>
          <div className={styles.statValue} style={{ color: 'var(--accent-success)' }}>
            {loading ? <CustomSkeleton width="60px" height="2rem" /> : `${report?.approvedHours || 0}h`}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Days Logged</div>
          <div className={styles.statValue}>
            {loading ? <CustomSkeleton width="60px" height="2rem" /> : report?.daysCount || 0}
          </div>
        </div>
        <div className={`glass-card ${styles.statCard}`}>
          <div className={styles.statLabel}>Utilization Rate</div>
          <div className={styles.statValue} style={{ color: 'var(--accent-secondary)' }}>
            {loading ? <CustomSkeleton width="60px" height="2rem" /> : `${report ? Math.round((report.totalHours / 160) * 100) : 0}%`}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>Daily Breakdown</h3>
          <CustomTable
            columns={[
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
                header: "Status", 
                key: "status", 
                render: (e) => (
                  <CustomBadge 
                    variant={e.status === 'APPROVED' ? 'success' : e.status === 'REJECTED' ? 'danger' : 'warning'}
                  >
                    {e.status}
                  </CustomBadge>
                )
              },
              {
                header: "Tasks",
                key: "tasks",
                render: (e) => `${e.tasks.length} tasks`
              }
            ]}
            data={report?.entries || []}
            loading={loading}
          />
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>Project Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <CustomSkeleton width="40%" height="12px" />
                    <CustomSkeleton width="20%" height="12px" />
                  </div>
                  <CustomSkeleton width="100%" height="8px" borderRadius="4px" />
                </div>
              ))
            ) : (
              report?.projectBreakdown.map((p, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ fontWeight: 700 }}>{p.hours}h</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${(p.hours / (report.totalHours || 1)) * 100}%`, 
                        background: 'var(--accent-primary)',
                        borderRadius: 4
                      }} 
                    />
                  </div>
                </div>
              ))
            )}
            {!loading && report?.projectBreakdown.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>
                No project data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimesheetReport;
