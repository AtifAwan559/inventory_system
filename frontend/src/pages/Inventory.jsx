import { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import api from '../api/axios';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [stockUpdate, setStockUpdate] = useState({
    productId: '',
    variantId: '',
    batchId: '',
    quantity: 1,
    operation: 'add',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      const productList = response?.data || response || [];
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!stockUpdate.productId || !stockUpdate.variantId || !stockUpdate.batchId) {
      setFeedback({ type: 'error', message: 'Please select product, variant, and batch.' });
      return;
    }

    if (!stockUpdate.quantity || stockUpdate.quantity < 1) {
      setFeedback({ type: 'error', message: 'Quantity must be at least 1.' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.patch('/products/stock', {
        ...stockUpdate,
        quantity: parseInt(stockUpdate.quantity),
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Stock updated successfully!',
      });

      await fetchProducts();

      // Reset form
      setStockUpdate({
        productId: '',
        variantId: '',
        batchId: '',
        quantity: 1,
        operation: 'add',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Error updating stock',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Compile all flattened batches for reporting
  const allBatches = [];
  products.forEach((prod) => {
    prod.variants?.forEach((v) => {
      v.batches?.forEach((b) => {
        const expDate = b.expiryDate ? new Date(b.expiryDate) : null;
        const now = new Date();
        let status = 'healthy';

        if (expDate) {
          const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            status = 'expired';
          } else if (diffDays <= 30) {
            status = 'expiring';
          }
        }

        if (status !== 'expired' && b.quantity <= 10) {
          status = 'low_stock';
        }

        allBatches.push({
          productId: prod._id,
          productName: prod.name,
          brand: prod.brand,
          category: prod.category,
          variantId: v._id,
          shade: v.shade,
          size: v.size,
          sku: v.sku,
          batchId: b._id,
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          location: b.warehouseLocation || 'Main Warehouse',
          status,
        });
      });
    });
  });

  const filteredBatches = allBatches.filter((item) => {
    const s = search.toLowerCase();
    const matchesSearch =
      item.productName.toLowerCase().includes(s) ||
      item.brand.toLowerCase().includes(s) ||
      item.sku.toLowerCase().includes(s) ||
      item.batchNumber.toLowerCase().includes(s);

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const selectedProductObj = products.find((p) => p._id === stockUpdate.productId);
  const selectedVariantObj = selectedProductObj?.variants?.find((v) => v._id === stockUpdate.variantId);
  const selectedBatchObj = selectedVariantObj?.batches?.find((b) => b._id === stockUpdate.batchId);

  return (
    <div style={styles.container}>
      <Navbar />
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>📦 Stock & Inventory Control</h1>
          <p style={styles.subtitle}>Execute batch receipts, deductions, and audit shelf stocks</p>
        </div>

        {feedback.message && (
          <div
            style={{
              ...styles.feedbackBox,
              background: feedback.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            {feedback.type === 'success' ? '✅ ' : '❌ '}
            {feedback.message}
          </div>
        )}

        {/* Stock Update Form Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Adjust Stock Level</h2>
          <form onSubmit={handleStockUpdate} style={styles.form}>
            <div style={styles.row}>
              {/* 1. Select Product */}
              <div style={styles.formGroup}>
                <label style={styles.label}>1. Select Product *</label>
                <select
                  value={stockUpdate.productId}
                  onChange={(e) => {
                    setStockUpdate({
                      ...stockUpdate,
                      productId: e.target.value,
                      variantId: '',
                      batchId: '',
                    });
                  }}
                  style={styles.select}
                  required
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.brand})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Variant */}
              <div style={styles.formGroup}>
                <label style={styles.label}>2. Select Variant *</label>
                <select
                  value={stockUpdate.variantId}
                  disabled={!stockUpdate.productId}
                  onChange={(e) => {
                    setStockUpdate({
                      ...stockUpdate,
                      variantId: e.target.value,
                      batchId: '',
                    });
                  }}
                  style={{ ...styles.select, opacity: stockUpdate.productId ? 1 : 0.6 }}
                  required
                >
                  <option value="">-- Choose Variant --</option>
                  {selectedProductObj?.variants?.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.shade ? `${v.shade} - ` : ''}{v.size} ({v.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Select Batch */}
              <div style={styles.formGroup}>
                <label style={styles.label}>3. Select Batch *</label>
                <select
                  value={stockUpdate.batchId}
                  disabled={!stockUpdate.variantId}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, batchId: e.target.value })}
                  style={{ ...styles.select, opacity: stockUpdate.variantId ? 1 : 0.6 }}
                  required
                >
                  <option value="">-- Choose Batch --</option>
                  {selectedVariantObj?.batches?.map((b) => (
                    <option key={b._id} value={b._id}>
                      Batch {b.batchNumber} (Current: {b.quantity} units)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedBatchObj && (
              <div style={styles.batchInfoBanner}>
                <span>Selected: Batch <strong>{selectedBatchObj.batchNumber}</strong></span>
                <span>Current Stock: <strong>{selectedBatchObj.quantity} units</strong></span>
                <span>Expiry: <strong>{selectedBatchObj.expiryDate ? new Date(selectedBatchObj.expiryDate).toLocaleDateString() : 'N/A'}</strong></span>
              </div>
            )}

            <div style={styles.row}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Operation *</label>
                <select
                  value={stockUpdate.operation}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, operation: e.target.value })}
                  style={styles.select}
                  required
                >
                  <option value="add">➕ Add Stock (Restock / Receipt)</option>
                  <option value="deduct">➖ Deduct Stock (Sale / Disposal)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Quantity Units *</label>
                <input
                  type="number"
                  min="1"
                  max={stockUpdate.operation === 'deduct' && selectedBatchObj ? selectedBatchObj.quantity : 99999}
                  value={stockUpdate.quantity}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, quantity: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <Button type="submit" variant="primary" disabled={submitting || !stockUpdate.batchId}>
                {submitting ? 'Applying Adjustment...' : 'Apply Stock Adjustment'}
              </Button>
            </div>
          </form>
        </div>

        {/* Batch Audit Table */}
        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.cardTitle}>Inventory Batches Audit</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                Showing {filteredBatches.length} of {allBatches.length} tracked batches
              </p>
            </div>

            {/* Filter buttons */}
            <div style={styles.filterBtns}>
              <button
                onClick={() => setFilterStatus('all')}
                style={{ ...styles.filterPill, background: filterStatus === 'all' ? '#7c3aed' : '#ffffff', color: filterStatus === 'all' ? '#fff' : '#475569' }}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('expiring')}
                style={{ ...styles.filterPill, background: filterStatus === 'expiring' ? '#f59e0b' : '#ffffff', color: filterStatus === 'expiring' ? '#fff' : '#475569' }}
              >
                Expiring Soon
              </button>
              <button
                onClick={() => setFilterStatus('expired')}
                style={{ ...styles.filterPill, background: filterStatus === 'expired' ? '#ef4444' : '#ffffff', color: filterStatus === 'expired' ? '#fff' : '#475569' }}
              >
                Expired
              </button>
              <button
                onClick={() => setFilterStatus('low_stock')}
                style={{ ...styles.filterPill, background: filterStatus === 'low_stock' ? '#dc2626' : '#ffffff', color: filterStatus === 'low_stock' ? '#fff' : '#475569' }}
              >
                Low Stock
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Filter batches by product name, SKU, or batch number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading inventory batches...</p>
          ) : filteredBatches.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No inventory batches found matching criteria.</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Product & Brand</th>
                    <th>Variant & SKU</th>
                    <th>Batch Number</th>
                    <th>Warehouse Location</th>
                    <th>Expiry Date</th>
                    <th>Quantity</th>
                    <th>Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((item) => (
                    <tr key={item.batchId}>
                      <td>
                        <strong>{item.productName}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.brand} • {item.category}</div>
                      </td>
                      <td>
                        {item.shade ? `${item.shade} - ` : ''}{item.size}
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>{item.sku}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.batchNumber}</td>
                      <td>{item.location}</td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ fontWeight: 700, color: item.quantity <= 10 ? '#dc2626' : '#16a34a' }}>
                        {item.quantity}
                      </td>
                      <td>
                        {item.status === 'expired' && (
                          <span style={{ ...styles.badge, background: '#fee2e2', color: '#dc2626' }}>
                            Expired
                          </span>
                        )}
                        {item.status === 'expiring' && (
                          <span style={{ ...styles.badge, background: '#fef3c7', color: '#d97706' }}>
                            Expiring Soon
                          </span>
                        )}
                        {item.status === 'low_stock' && (
                          <span style={{ ...styles.badge, background: '#fee2e2', color: '#dc2626' }}>
                            Low Stock
                          </span>
                        )}
                        {item.status === 'healthy' && (
                          <span style={{ ...styles.badge, background: '#dcfce7', color: '#16a34a' }}>
                            Healthy
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f9eefc 0%, #eef5ff 45%, #fff8f2 100%)',
    color: '#1f2937',
  },
  content: {
    padding: '36px 20px 60px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    color: '#2b1d47',
    margin: '0 0 4px',
    fontSize: '2.2rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
    fontSize: '1rem',
  },
  feedbackBox: {
    padding: '12px 18px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontWeight: 600,
    fontSize: '14px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '26px',
    borderRadius: '20px',
    boxShadow: '0 12px 30px rgba(90, 60, 130, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
    marginBottom: '30px',
  },
  cardTitle: {
    color: '#2b1d47',
    margin: '0 0 16px',
    fontSize: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '6px',
    fontWeight: '600',
    color: '#334155',
    fontSize: '13px',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
  },
  select: {
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#ffffff',
  },
  batchInfoBanner: {
    background: '#f1f5f9',
    padding: '10px 16px',
    borderRadius: '8px',
    display: 'flex',
    gap: '24px',
    fontSize: '13px',
    color: '#334155',
    flexWrap: 'wrap',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterBtns: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterPill: {
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid #cbd5e1',
    cursor: 'pointer',
  },
  searchInput: {
    width: '100%',
    maxWidth: '460px',
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    fontSize: '14px',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    textAlign: 'left',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
  },
};

export default Inventory;
