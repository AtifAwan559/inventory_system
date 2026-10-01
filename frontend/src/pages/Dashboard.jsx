import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import api from '../api/axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    expiringSoon: 0,
    lowStock: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [productsRes, expiringRes, lowStockRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/products/expiring?days=30'),
        api.get('/products/low-stock?threshold=10'),
      ]);

      let productsList = [];
      if (productsRes.status === 'fulfilled') {
        const pData = productsRes.value?.data || productsRes.value || [];
        productsList = Array.isArray(pData) ? pData : [];
      }

      let totalStockUnits = 0;
      let totalValue = 0;

      productsList.forEach((prod) => {
        prod.variants?.forEach((v) => {
          const cost = Number(v.costPrice) || 0;
          v.batches?.forEach((b) => {
            const qty = Number(b.quantity) || 0;
            totalStockUnits += qty;
            totalValue += qty * cost;
          });
        });
      });

      let expiringList = [];
      let totalExpiring = 0;
      if (expiringRes.status === 'fulfilled') {
        const expData = expiringRes.value?.data || expiringRes.value?.data?.data || expiringRes.value || [];
        expiringList = Array.isArray(expData) ? expData : (expData.data || []);
        totalExpiring = expiringRes.value?.totalExpiringBatches ?? expiringList.length;
      }

      let lowStockList = [];
      let totalLowStock = 0;
      if (lowStockRes.status === 'fulfilled') {
        const lsData = lowStockRes.value?.data || lowStockRes.value || [];
        lowStockList = Array.isArray(lsData) ? lsData : (lsData.data || []);
        totalLowStock = lowStockRes.value?.totalLowStockBatches ?? lowStockList.length;
      }

      setExpiringProducts(expiringList);
      setLowStockProducts(lowStockList);

      setStats({
        totalProducts: productsList.length,
        totalStockUnits,
        expiringSoon: totalExpiring,
        lowStock: totalLowStock,
        totalValue,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div style={styles.layout}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.content}>
          {/* Welcome and Action Header */}
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.welcome}>Welcome back, {user?.name || 'Manager'}!</h1>
              <p style={styles.subtitle}>Here is your live inventory status and supply alerts.</p>
            </div>

            <div style={styles.quickActions}>
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <>
                  <Link to="/products/create">
                    <Button variant="primary">+ Add Product</Button>
                  </Link>
                  <Link to="/inventory">
                    <Button variant="secondary">📦 Adjust Stock</Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>🏷️</span>
                <span style={styles.cardLabel}>Catalog Products</span>
              </div>
              <p style={styles.cardNumber}>{loading ? '...' : stats.totalProducts}</p>
              <span style={styles.cardFooter}>{stats.totalStockUnits} total units in stock</span>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #10b981' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>💰</span>
                <span style={styles.cardLabel}>Inventory Valuation</span>
              </div>
              <p style={{ ...styles.cardNumber, color: '#059669' }}>
                {loading ? '...' : `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <span style={styles.cardFooter}>Calculated at cost value</span>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #f59e0b' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>⏳</span>
                <span style={styles.cardLabel}>Expiring Soon (30d)</span>
              </div>
              <p style={{ ...styles.cardNumber, color: '#d97706' }}>
                {loading ? '...' : stats.expiringSoon}
              </p>
              <span style={styles.cardFooter}>Batches requiring attention</span>
            </div>

            <div style={{ ...styles.card, borderTop: '4px solid #ef4444' }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>⚠️</span>
                <span style={styles.cardLabel}>Low Stock Batches</span>
              </div>
              <p style={{ ...styles.cardNumber, color: '#dc2626' }}>
                {loading ? '...' : stats.lowStock}
              </p>
              <span style={styles.cardFooter}>≤ 10 items remaining</span>
            </div>
          </div>

          {/* Alerts Section */}
          <div style={styles.alertColumns}>
            {/* Expiring Batches */}
            <div style={styles.alertCard}>
              <div style={styles.alertHeader}>
                <h2 style={{ ...styles.alertTitle, color: '#b45309' }}>⏳ Products Expiring Soon</h2>
                <span style={styles.alertBadge}>{expiringProducts.length} items</span>
              </div>

              {loading ? (
                <p style={styles.emptyText}>Loading expiring items...</p>
              ) : expiringProducts.length === 0 ? (
                <p style={styles.emptyText}>✅ All product batches have healthy shelf life.</p>
              ) : (
                <div style={styles.alertList}>
                  {expiringProducts.slice(0, 5).map((item) => (
                    <div key={item._id} style={styles.alertRow}>
                      <div>
                        <div style={styles.alertName}>{item.name}</div>
                        <div style={styles.alertSub}>{item.brand} • {item.category}</div>
                      </div>
                      <Link to={`/products/${item._id}`}>
                        <button style={styles.viewBtn}>View</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div style={styles.alertCard}>
              <div style={styles.alertHeader}>
                <h2 style={{ ...styles.alertTitle, color: '#b91c1c' }}>⚠️ Low Stock Warnings</h2>
                <span style={{ ...styles.alertBadge, background: '#fee2e2', color: '#dc2626' }}>
                  {lowStockProducts.length} items
                </span>
              </div>

              {loading ? (
                <p style={styles.emptyText}>Loading low stock items...</p>
              ) : lowStockProducts.length === 0 ? (
                <p style={styles.emptyText}>✅ All product stock levels are above threshold.</p>
              ) : (
                <div style={styles.alertList}>
                  {lowStockProducts.slice(0, 5).map((item) => (
                    <div key={item._id} style={styles.alertRow}>
                      <div>
                        <div style={styles.alertName}>{item.name}</div>
                        <div style={styles.alertSub}>{item.brand} • {item.category}</div>
                      </div>
                      <Link to={`/products/${item._id}`}>
                        <button style={styles.viewBtn}>View</button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f9eefc 0%, #eef5ff 45%, #fff8f2 100%)',
    color: '#1f2937',
  },
  container: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    padding: '36px 32px 60px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  welcome: {
    color: '#2b1d47',
    margin: '0 0 6px',
    fontSize: '2.2rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
    fontSize: '1.05rem',
  },
  quickActions: {
    display: 'flex',
    gap: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '36px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.88)',
    backdropFilter: 'blur(10px)',
    padding: '24px',
    borderRadius: '20px',
    boxShadow: '0 12px 30px rgba(90, 60, 130, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  cardIcon: {
    fontSize: '1.3rem',
  },
  cardLabel: {
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  cardNumber: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: '#1e293b',
    margin: '0 0 8px',
    letterSpacing: '-0.03em',
  },
  cardFooter: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  alertColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px',
  },
  alertCard: {
    background: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 12px 30px rgba(90, 60, 130, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
  },
  alertHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  alertTitle: {
    margin: 0,
    fontSize: '1.25rem',
  },
  alertBadge: {
    background: '#fef3c7',
    color: '#b45309',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #f1f5f9',
  },
  alertName: {
    fontWeight: 700,
    color: '#1e293b',
    fontSize: '0.95rem',
  },
  alertSub: {
    color: '#64748b',
    fontSize: '0.85rem',
    marginTop: '2px',
  },
  viewBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#475569',
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '0.95rem',
    padding: '20px 0',
    textAlign: 'center',
  },
};

export default Dashboard;