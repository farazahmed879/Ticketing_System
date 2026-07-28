import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { getEntryTypeLabel, isZeroHourEntryType } from './entryTypes';

import { useNavigate } from 'react-router-dom';

const TimesheetReport: React.FC = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: reportData, isLoading: loading } = useQuery<ITimesheetReport>({
    queryKey: ['timesheets', 'report', month, year],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TIMESHEETS.REPORT, {
        params: { month, year }
      });
      return res.data.report;
    }
  });

  const report = reportData || null;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={styles.container}>
      <div className={`${styles.flexBetween} ${styles.mb24}`} style={{ marginTop: 16 }}>
        <div className={`${styles.flexRow} ${styles.alignCenter} ${styles.gap16}`}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate("/timesheet")}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{ 
              width: 40, 
              height: 40, 
              padding: 0, 
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)'
            }}
          />
          <div style={{ marginLeft: 4 }}>
            <h1 className={`${styles.fontXl} ${styles.fw700}`} style={{ margin: 0 }}>Timesheet Report</h1>
            <p className={`${styles.textMuted} ${styles.fontSm}`} style={{ margin: "4px 0 0 0" }}>
              Detailed breakdown of hours and projects
            </p>
          </div>
        </div>
        <div className={`${styles.flexRow} ${styles.gap12}`}>
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
          <div className={`${styles.statValue} ${styles.textSuccess}`}>
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
          <div className={`${styles.statValue} ${styles.textSecondary}`}>
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
                render: (e) => (
                  <strong>
                    {isZeroHourEntryType(e.entryType)
                      ? getEntryTypeLabel(e.entryType)
                      : `${e.totalHours}h`}
                  </strong>
                )
              },
              {
                header: "Day Type",
                key: "entryType",
                render: (e) => getEntryTypeLabel(e.entryType)
              },
              { 
                header: "Manager Status", 
                key: "managerStatus", 
                render: (e) => (
                  <CustomBadge 
                    variant={
                      e.managerApproved === "APPROVED"
                        ? 'success'
                        : e.managerApproved === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {e.managerApproved === "APPROVED"
                      ? 'Approved'
                      : e.managerApproved === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending'}
                  </CustomBadge>
                )
              },
              { 
                header: "HR Status", 
                key: "hrStatus", 
                render: (e) => (
                  <CustomBadge 
                    variant={
                      e.hrApproved === "APPROVED"
                        ? 'success'
                        : e.hrApproved === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {e.hrApproved === "APPROVED"
                      ? 'Approved'
                      : e.hrApproved === 'REJECTED'
                        ? 'Rejected'
                        : 'Pending'}
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
