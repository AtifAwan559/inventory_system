import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import api from '../api/axios';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const list = response?.data || response || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingId(userId);
      await api.put(`/users/${userId}`, { role: newRole });
      setUsers(users.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      alert('Error updating user role: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      setUpdatingId(userId);
      const newStatus = !currentStatus;
      await api.put(`/users/${userId}`, { isActive: newStatus });
      setUsers(users.map((u) => (u._id === userId ? { ...u, isActive: newStatus } : u)));
    } catch (err) {
      alert('Error toggling user status: ' + (err.message || 'Unknown error'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;

    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter((u) => u._id !== userId));
    } catch (err) {
      alert('Error deleting user: ' + (err.message || 'Unknown error'));
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.role?.toLowerCase().includes(s)
    );
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div style={styles.pageShell}>
        <Navbar />
        <div style={styles.centerBox}>
          <h2>Access Denied</h2>
          <p>Administrator privileges are required to view and manage team members.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageShell}>
      <Navbar />
      <div style={styles.content}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Team & Access Management</h1>
            <p style={styles.subtitle}>Control roles, system permissions, and account statuses</p>
          </div>
        </div>

        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Search team members by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {loading ? (
          <div style={styles.centerBox}>Loading team members...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={styles.centerBox}>No team members found.</div>
        ) : (
          <div style={styles.card}>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role Assignment</th>
                    <th>Account Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((member) => {
                    const isSelf = member._id === currentUser?._id || member._id === currentUser?.id;

                    return (
                      <tr key={member._id}>
                        <td>
                          <strong>{member.name}</strong>
                          {isSelf && <span style={styles.selfTag}>(You)</span>}
                        </td>
                        <td>{member.email}</td>
                        <td>
                          <select
                            value={member.role}
                            disabled={isSelf || updatingId === member._id}
                            onChange={(e) => handleRoleChange(member._id, e.target.value)}
                            style={styles.roleSelect}
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <button
                            disabled={isSelf || updatingId === member._id}
                            onClick={() => handleStatusToggle(member._id, member.isActive)}
                            style={{
                              ...styles.statusBtn,
                              background: member.isActive ? '#dcfce7' : '#fee2e2',
                              color: member.isActive ? '#15803d' : '#b91c1c',
                              cursor: isSelf ? 'default' : 'pointer',
                            }}
                          >
                            {member.isActive ? '● Active' : '○ Deactivated'}
                          </button>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '13px' }}>
                          {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : 'Never logged in'}
                        </td>
                        <td>
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(member._id, member.name)}
                              style={styles.deleteBtn}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  pageShell: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f9eefc 0%, #eef6ff 40%, #fff8f3 100%)',
    color: '#1f2937',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '36px 20px 60px',
  },
  headerRow: {
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 4px',
    fontSize: '2.2rem',
    color: '#2b1d47',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '1rem',
  },
  searchBar: {
    marginBottom: '20px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '460px',
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
    background: '#ffffff',
  },
  card: {
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    borderRadius: '20px',
    boxShadow: '0 12px 30px rgba(90, 60, 130, 0.08)',
    padding: '18px',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    color: '#1f2937',
    fontSize: '14px',
    textAlign: 'left',
  },
  selfTag: {
    marginLeft: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: '#7c3aed',
    background: '#f3e8ff',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  roleSelect: {
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    fontWeight: 600,
    background: '#ffffff',
    color: '#334155',
  },
  statusBtn: {
    border: 'none',
    padding: '5px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  deleteBtn: {
    background: '#fee2e2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  centerBox: {
    margin: '40px auto',
    maxWidth: '500px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '18px',
    padding: '36px 20px',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
    color: '#475569',
  },
};

export default Users;
