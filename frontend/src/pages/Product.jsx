import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/common/Navbar';
import Button from '../components/common/Button';
import api from '../api/axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { user } = useAuth();

  const categories = ['All', 'Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Body Care', 'Tools'];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParam = selectedCategory !== 'All' ? `?category=${selectedCategory}` : '';
      const response = await api.get(`/products${queryParam}`);
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
  }, [selectedCategory]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter((p) => p._id !== id));
    } catch (error) {
      alert('Error deleting product: ' + error.message);
    }
  };

  const filteredProducts = products.filter((product) => {
    const s = search.toLowerCase();
    return (
      product.name?.toLowerCase().includes(s) ||
      product.brand?.toLowerCase().includes(s) ||
      product.variants?.some((v) => v.sku?.toLowerCase().includes(s))
    );
  });

  const getProductStock = (product) => {
    if (typeof product.totalStock === 'number') return product.totalStock;
    let total = 0;
    product.variants?.forEach((v) => {
      v.batches?.forEach((b) => {
        total += b.quantity || 0;
      });
    });
    return total;
  };

  const getPriceRange = (product) => {
    if (!product.variants || product.variants.length === 0) return 'N/A';
    const prices = product.variants.map((v) => Number(v.sellingPrice) || 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `$${min.toFixed(2)}`;
    return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  };

  return (
    <div style={styles.container}>
      <Navbar />
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Product Catalog</h1>
            <p style={styles.subtitle}>Browse, manage, and update cosmetic products & variants</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Link to="/products/create">
              <Button variant="primary">+ Add New Product</Button>
            </Link>
          )}
        </div>

        {/* Filter and Search Bar */}
        <div style={styles.filterBar}>
          <div style={styles.searchWrap}>
            <input
              type="text"
              placeholder="Search by product name, brand, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.categoryPills}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...styles.categoryPill,
                  background: selectedCategory === cat ? '#7c3aed' : '#ffffff',
                  color: selectedCategory === cat ? '#ffffff' : '#475569',
                  border: selectedCategory === cat ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Table or Empty State */}
        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.spinner}></div>
            <p>Loading products catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={styles.empty}>
            <h3>No products found</h3>
            <p>No products match your current search or category filter.</p>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Link to="/products/create" style={{ display: 'inline-block', marginTop: '14px' }}>
                <Button variant="primary">+ Create First Product</Button>
              </Link>
            )}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Price Range</th>
                  <th>Variants</th>
                  <th>Total Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stock = getProductStock(product);
                  return (
                    <tr key={product._id}>
                      <td>
                        <Link to={`/products/${product._id}`} style={styles.productLink}>
                          <strong>{product.name}</strong>
                          <span style={styles.subCategoryText}>{product.subCategory}</span>
                        </Link>
                      </td>
                      <td>{product.brand}</td>
                      <td>
                        <span style={styles.categoryBadge}>{product.category}</span>
                      </td>
                      <td>{getPriceRange(product)}</td>
                      <td>{product.variants?.length || 0} variant(s)</td>
                      <td style={{ fontWeight: 700 }}>{stock} units</td>
                      <td>
                        {stock === 0 ? (
                          <span style={{ ...styles.stockBadge, background: '#fee2e2', color: '#dc2626' }}>
                            Out of Stock
                          </span>
                        ) : stock <= 10 ? (
                          <span style={{ ...styles.stockBadge, background: '#fef3c7', color: '#d97706' }}>
                            Low Stock
                          </span>
                        ) : (
                          <span style={{ ...styles.stockBadge, background: '#dcfce7', color: '#16a34a' }}>
                            In Stock
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={styles.btnRow}>
                          <Link to={`/products/${product._id}`}>
                            <button style={styles.viewBtn}>View</button>
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <Link to={`/products/edit/${product._id}`}>
                              <button style={styles.editBtn}>Edit</button>
                            </Link>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(product._id, product.name)}
                              style={styles.deleteBtn}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap',
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
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '24px',
  },
  searchWrap: {
    width: '100%',
  },
  searchInput: {
    width: '100%',
    maxWidth: '520px',
    padding: '12px 16px',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    fontSize: '15px',
    background: '#ffffff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
  },
  categoryPills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryPill: {
    padding: '7px 16px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tableContainer: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    boxShadow: '0 12px 30px rgba(90, 60, 130, 0.08)',
    overflow: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.7)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  productLink: {
    display: 'flex',
    flexDirection: 'column',
    color: '#2b1d47',
  },
  subCategoryText: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  categoryBadge: {
    background: '#f3e8ff',
    color: '#7e22ce',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  stockBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  btnRow: {
    display: 'flex',
    gap: '6px',
  },
  viewBtn: {
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  editBtn: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  deleteBtn: {
    background: '#fee2e2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #f3e8ff',
    borderTop: '3px solid #9333ea',
    borderRadius: '50%',
    margin: '0 auto 12px',
    animation: 'spin 1s linear infinite',
  },
};

export default Products;
