import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import api from '../api/axios';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjustModal, setAdjustModal] = useState({
    isOpen: false,
    variantId: '',
    batchId: '',
    batchNumber: '',
    currentQuantity: 0,
    quantity: 1,
    operation: 'add',
  });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/products/${id}`);
      const data = res?.data || res;
      setProduct(data);
    } catch (err) {
      console.error('Error fetching product detail:', err);
      setError(err.message || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${product?.name}"?`)) return;

    try {
      await api.delete(`/products/${id}`);
      navigate('/products');
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleOpenAdjust = (variantId, batch) => {
    setAdjustModal({
      isOpen: true,
      variantId,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      currentQuantity: batch.quantity,
      quantity: 1,
      operation: 'add',
    });
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    try {
      setAdjustLoading(true);
      await api.patch('/products/stock', {
        productId: id,
        variantId: adjustModal.variantId,
        batchId: adjustModal.batchId,
        quantity: parseInt(adjustModal.quantity),
        operation: adjustModal.operation,
      });

      setAdjustModal({ ...adjustModal, isOpen: false });
      await fetchProduct();
    } catch (err) {
      alert('Error adjusting stock: ' + err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { text: 'No date', color: '#6b7280', bg: '#f3f4f6' };
    const exp = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Expired (${Math.abs(diffDays)}d ago)`, color: '#dc2626', bg: '#fee2e2' };
    }
    if (diffDays <= 30) {
      return { text: `Expiring soon (${diffDays}d)`, color: '#d97706', bg: '#fef3c7' };
    }
    return { text: `Valid (${diffDays}d left)`, color: '#16a34a', bg: '#dcfce7' };
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.errorBox}>
          <h2>Product Not Found</h2>
          <p>{error || 'The requested product could not be loaded.'}</p>
          <Link to="/products">
            <Button variant="primary">Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalVariants = product.variants?.length || 0;
  let totalBatches = 0;
  let totalUnits = 0;
  let totalInventoryCost = 0;

  product.variants?.forEach((v) => {
    const cost = Number(v.costPrice) || 0;
    v.batches?.forEach((b) => {
      totalBatches++;
      const qty = Number(b.quantity) || 0;
      totalUnits += qty;
      totalInventoryCost += qty * cost;
    });
  });

  return (
    <div style={styles.container}>
      <Navbar />

      <div style={styles.content}>
        {/* Top breadcrumb & Actions */}
        <div style={styles.topBar}>
          <Link to="/products" style={styles.backLink}>
            ← Back to Products
          </Link>
          <div style={styles.actionGroup}>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Link to={`/products/edit/${product._id}`}>
                <Button variant="warning">Edit Product</Button>
              </Link>
            )}
            {user?.role === 'admin' && (
              <Button variant="danger" onClick={handleDelete}>
                Delete Product
              </Button>
            )}
          </div>
        </div>

        {/* Product Overview Card */}
        <div style={styles.heroCard}>
          <div style={styles.heroInfo}>
            <div style={styles.categoryBadge}>
              {product.category} • {product.subCategory}
            </div>
            <h1 style={styles.productTitle}>{product.name}</h1>
            <p style={styles.brandName}>Brand: <strong>{product.brand}</strong></p>
            {product.description && <p style={styles.description}>{product.description}</p>}
          </div>

          <div style={styles.statGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total Stock</span>
              <span style={{ ...styles.statVal, color: totalUnits < 10 ? '#dc2626' : '#16a34a' }}>
                {totalUnits} units
              </span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Variants</span>
              <span style={styles.statVal}>{totalVariants}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Active Batches</span>
              <span style={styles.statVal}>{totalBatches}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Stock Valuation</span>
              <span style={{ ...styles.statVal, color: '#7c3aed' }}>
                ${totalInventoryCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Variants and Batches Section */}
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Variants & Batch Inventory</h2>
        </div>

        <div style={styles.variantsList}>
          {product.variants?.map((variant, vIdx) => {
            const vTotalStock = variant.batches?.reduce((acc, b) => acc + (b.quantity || 0), 0) || 0;
            const margin = variant.sellingPrice && variant.costPrice
              ? (((variant.sellingPrice - variant.costPrice) / variant.sellingPrice) * 100).toFixed(1)
              : 0;

            return (
              <div key={variant._id || vIdx} style={styles.variantContainer}>
                <div style={styles.variantTop}>
                  <div>
                    <h3 style={styles.variantName}>
                      {variant.shade && variant.shade !== 'N/A' ? `${variant.shade} - ` : ''}
                      {variant.size}
                    </h3>
                    <div style={styles.skuTag}>SKU: {variant.sku}</div>
                  </div>
                  <div style={styles.priceRow}>
                    <div style={styles.priceTag}>
                      <span style={styles.priceLabel}>Cost:</span> ${Number(variant.costPrice).toFixed(2)}
                    </div>
                    <div style={styles.priceTag}>
                      <span style={styles.priceLabel}>Selling:</span> ${Number(variant.sellingPrice).toFixed(2)}
                    </div>
                    <div style={{ ...styles.priceTag, background: '#f0fdf4', color: '#15803d' }}>
                      Margin: {margin}%
                    </div>
                    <div style={{ ...styles.stockPill, background: vTotalStock < 10 ? '#fee2e2' : '#e0e7ff', color: vTotalStock < 10 ? '#b91c1c' : '#3730a3' }}>
                      Stock: {vTotalStock}
                    </div>
                  </div>
                </div>

                <div style={styles.batchTableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Batch Number</th>
                        <th>Location</th>
                        <th>Expiry Date</th>
                        <th>Expiry Status</th>
                        <th>Quantity</th>
                        {(user?.role === 'admin' || user?.role === 'manager') && <th>Quick Adjust</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {variant.batches?.map((batch) => {
                        const status = getExpiryStatus(batch.expiryDate);
                        return (
                          <tr key={batch._id}>
                            <td style={{ fontWeight: 600 }}>{batch.batchNumber}</td>
                            <td>{batch.warehouseLocation || 'Main Warehouse'}</td>
                            <td>{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              <span style={{ ...styles.statusBadge, color: status.color, background: status.bg }}>
                                {status.text}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: batch.quantity < 5 ? '#dc2626' : '#1f2937' }}>
                                {batch.quantity}
                              </span>
                            </td>
                            {(user?.role === 'admin' || user?.role === 'manager') && (
                              <td>
                                <button
                                  style={styles.adjustBtn}
                                  onClick={() => handleOpenAdjust(variant._id, batch)}
                                >
                                  ± Adjust Stock
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stock Adjustment Modal */}
      {adjustModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Adjust Stock: {adjustModal.batchNumber}</h3>
            <p style={styles.modalSubtitle}>Current batch stock: <strong>{adjustModal.currentQuantity} units</strong></p>

            <form onSubmit={handleAdjustSubmit}>
              <div style={styles.modalFormGroup}>
                <label style={styles.modalLabel}>Action</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="operation"
                      value="add"
                      checked={adjustModal.operation === 'add'}
                      onChange={(e) => setAdjustModal({ ...adjustModal, operation: e.target.value })}
                    />
                    ➕ Add Stock
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="operation"
                      value="deduct"
                      checked={adjustModal.operation === 'deduct'}
                      onChange={(e) => setAdjustModal({ ...adjustModal, operation: e.target.value })}
                    />
                    ➖ Deduct Stock
                  </label>
                </div>
              </div>

              <div style={styles.modalFormGroup}>
                <label style={styles.modalLabel}>Quantity to {adjustModal.operation === 'add' ? 'Add' : 'Deduct'}</label>
                <input
                  type="number"
                  min="1"
                  max={adjustModal.operation === 'deduct' ? adjustModal.currentQuantity : 99999}
                  value={adjustModal.quantity}
                  onChange={(e) => setAdjustModal({ ...adjustModal, quantity: e.target.value })}
                  style={styles.modalInput}
                  required
                />
              </div>

              <div style={styles.modalActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={adjustLoading}>
                  {adjustLoading ? 'Updating...' : 'Save Stock'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px 60px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  backLink: {
    color: '#6b21a8',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  actionGroup: {
    display: 'flex',
    gap: '10px',
  },
  heroCard: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 16px 36px rgba(100, 60, 140, 0.1)',
    marginBottom: '30px',
    border: '1px solid rgba(255, 255, 255, 0.6)',
  },
  heroInfo: {
    marginBottom: '24px',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    background: '#f3e8ff',
    color: '#7e22ce',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '10px',
  },
  productTitle: {
    fontSize: '2.4rem',
    margin: '4px 0 8px',
    color: '#2b1d47',
  },
  brandName: {
    fontSize: '1.1rem',
    color: '#4b5563',
    margin: '0 0 10px',
  },
  description: {
    color: '#6b7280',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    maxWidth: '800px',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px',
    borderTop: '1px solid #f0e6fa',
    paddingTop: '20px',
  },
  statCard: {
    background: '#ffffff',
    padding: '16px 20px',
    borderRadius: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9',
  },
  statLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 600,
    marginBottom: '6px',
  },
  statVal: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#1e293b',
  },
  sectionHeader: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    color: '#2b1d47',
  },
  variantsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  variantContainer: {
    background: 'rgba(255,255,255,0.85)',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(80, 50, 110, 0.08)',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  variantTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  variantName: {
    margin: '0 0 4px',
    fontSize: '1.25rem',
    color: '#1f2937',
  },
  skuTag: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  priceRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  priceTag: {
    background: '#f8fafc',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    border: '1px solid #e2e8f0',
  },
  priceLabel: {
    color: '#94a3b8',
    marginRight: '4px',
  },
  stockPill: {
    padding: '6px 14px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 700,
  },
  batchTableWrap: {
    overflowX: 'auto',
    borderRadius: '12px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    textAlign: 'left',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  adjustBtn: {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '80px 20px',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3e8ff',
    borderTop: '4px solid #9333ea',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },
  errorBox: {
    textAlign: 'center',
    padding: '80px 20px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '28px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
  },
  modalTitle: {
    margin: '0 0 6px',
    fontSize: '1.25rem',
    color: '#1e293b',
  },
  modalSubtitle: {
    margin: '0 0 20px',
    color: '#64748b',
    fontSize: '14px',
  },
  modalFormGroup: {
    marginBottom: '16px',
  },
  modalLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  modalInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
  },
};

export default ProductDetail;
