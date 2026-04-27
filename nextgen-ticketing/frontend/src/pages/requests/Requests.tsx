import React, { useEffect, useState } from 'react';
import CustomIcon from '../../components/CustomIcon';
import { formatDistanceToNow } from 'date-fns';
import api from "../../services/api";
import styles from "./Requests.module.css";

import type { UserRequest } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomFilterBar from "../../components/CustomFilterBar";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { TableColumn } from "../../components/types";

const Requests: React.FC = () => {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  const fetchRequests = async () => {
    try {
      const res = await api.get(API_ROUTES.REQUESTS.BASE);
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.patch(API_ROUTES.REQUESTS.BY_ID(id), { status });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      console.error('Failed to update request status', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      await api.delete(API_ROUTES.REQUESTS.BY_ID(id));
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete request', err);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'ALL' || r.status === filter);

  const columns: TableColumn<UserRequest>[] = [
    {
      header: "Type",
      key: "type",
      render: (r) => (
        <div className={styles.typeBadge}>
          {r.type.replace('_', ' ')}
        </div>
      ),
    },
    {
      header: "User / Email",
      key: "user",
      render: (r) => (
        <div className={styles.userInfo}>
          <span className={styles.userName}>{r.user?.fullname || 'Anonymous'}</span>
          <span className={styles.userEmail}>{r.email || r.user?.email}</span>
        </div>
      ),
    },
    {
      header: "Message",
      key: "message",
      className: styles.messageCell,
    },
    {
      header: "Requested",
      key: "createdAt",
      render: (r) => formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }),
    },
    {
      header: "Status",
      key: "status",
      render: (r) => (
        <CustomBadge 
          variant={
            r.status === 'APPROVED' ? 'success' : 
            r.status === 'REJECTED' ? 'danger' : 'warning'
          }
        >
          {r.status}
        </CustomBadge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (r) => (
        <div className={styles.actions}>
          {r.status === 'PENDING' && (
            <>
              <CustomButton 
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                title="Approve"
                style={{ color: 'var(--accent-success)' }}
                icon={<CustomIcon name="CheckCircle2" size={18} />}
              />
              <CustomButton 
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                title="Reject"
                style={{ color: 'var(--accent-danger)' }}
                icon={<CustomIcon name="XCircle" size={18} />}
              />
            </>
          )}
          <CustomButton 
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(r.id)}
            title="Delete"
            icon={<CustomIcon name="Trash2" size={18} />}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Management Requests</h1>
        <CustomFilterBar
          activeOption={filter}
          onChange={setFilter}
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'ALL', label: 'All' }
          ]}
        />
      </div>

      <CustomTable
        columns={columns}
        data={filteredRequests}
        loading={loading}
        loadingMessage="Loading requests..."
        emptyMessage={`No ${filter.toLowerCase()} requests found.`}
      />
    </div>
  );
};

export default Requests;
