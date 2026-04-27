import React, { useEffect, useState } from 'react';
import CustomIcon from "../../components/CustomIcon";
import api from '../../services/api';
import { API_ROUTES } from '../../utils/apiRoutes';
import { useNotification } from '../../context/NotificationContext';
import styles from './DepartmentList.module.css';
import DepartmentModal from './components/DepartmentModal';

import type { Department } from "../../types";

const DepartmentList: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Department State
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDepts = async () => {
    try {
      const res = await api.get(API_ROUTES.DEPARTMENTS.BASE);
      setDepartments(res.data.departments);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const { showNotification, setIsLoading } = useNotification();

  const handleCreateDepartment = async (name: string, description: string) => {
    setIsLoading(true);
    try {
      await api.post(API_ROUTES.DEPARTMENTS.BASE, { name, description });
      setIsModalOpen(false);
      fetchDepts();
      showNotification('success', 'Department created successfully!');
    } catch (err: any) {
      console.error('Failed to create department', err);
      showNotification('error', err.response?.data?.error || 'Failed to create department');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className={styles.header}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Departments</h1>
          <button className="bg-gradient" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 10, color: 'white', fontWeight: 600 }}>
            <CustomIcon name="Plus" size={20} />
            Create Department
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading departments...</div>
        ) : (
          <div className={styles.deptGrid}>
            {departments.map((dept) => (
              <div key={dept.id} className={`${styles.deptCard} glass-card glass-card-hover`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="glass-card" style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124, 58, 237, 0.1)' }}>
                    <CustomIcon name="Building2" size={22} color="var(--accent-primary)" />
                  </div>
                  <button style={{ background: 'transparent', color: 'var(--text-muted)' }}>
                    <CustomIcon name="MoreVertical" size={20} />
                  </button>
                </div>

                <div>
                  <div className={styles.deptName}>{dept.name}</div>
                  <div className={styles.deptDesc}>{dept.description || 'No description provided.'}</div>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Team Members</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CustomIcon name="Users" size={16} color="var(--accent-secondary)" />
                      <div className={styles.statValue}>{dept._count?.users || 0}</div>
                    </div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statLabel}>Active Teams</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CustomIcon name="Ticket" size={16} color="var(--accent-success)" />
                      <div className={styles.statValue}>{dept._count?.teams || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateDepartment}
      />
    </>
  );
};

export default DepartmentList;
