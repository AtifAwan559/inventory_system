import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import api from '../api/axios';

const CreateProduct = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);
  const [error, setError] = useState('');

  const [product, setProduct] = useState({
    name: '',
    brand: '',
    category: 'Makeup',
    subCategory: 'Foundation',
    description: '',
    variants: [
      {
        shade: '',
        size: '50ml',
        sku: '',
        costPrice: 0,
        sellingPrice: 0,
        batches: [
          {
            batchNumber: 'B-001',
            expiryDate: '',
            quantity: 10,
            warehouseLocation: 'Main Warehouse',
          },
        ],
      },
    ],
  });

  const categories = ['Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Body Care', 'Tools'];
  const subCategories = [
    'Foundation',
    'Lipstick',
    'Mascara',
    'Eyeshadow',
    'Moisturizer',
    'Serum',
    'Sunscreen',
    'Shampoo',
    'Conditioner',
    'Perfume',
    'Other',
  ];

  const fetchProduct = async () => {
    try {
      setFetchLoading(true);
      const response = await api.get(`/products/${id}`);
      const productData = response?.data || response;
      if (productData) {
        setProduct({
          name: productData.name || '',
          brand: productData.brand || '',
          category: productData.category || 'Makeup',
          subCategory: productData.subCategory || 'Foundation',
          description: productData.description || '',
          variants: (productData.variants || []).map((v) => ({
            _id: v._id,
            shade: v.shade || '',
            size: v.size || '',
            sku: v.sku || '',
            costPrice: v.costPrice ?? 0,
            sellingPrice: v.sellingPrice ?? 0,
            batches: (v.batches || []).map((b) => ({
              _id: b._id,
              batchNumber: b.batchNumber || '',
              expiryDate: b.expiryDate ? b.expiryDate.split('T')[0] : '',
              quantity: b.quantity ?? 0,
              warehouseLocation: b.warehouseLocation || 'Main Warehouse',
            })),
          })),
        });
      }
    } catch (err) {
      console.error('Error fetching product for editing:', err);
      alert('Error loading product');
      navigate('/products');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      fetchProduct();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!product.name || !product.brand) {
      setError('Please provide product name and brand.');
      return;
    }

    if (!product.variants || product.variants.length === 0) {
      setError('Please add at least one product variant.');
      return;
    }

    // Validate variants
    for (let i = 0; i < product.variants.length; i++) {
      const v = product.variants[i];
      if (!v.size) {
        setError(`Variant #${i + 1} must have a size (e.g. 50ml, 30g).`);
        return;
      }
      if (v.costPrice < 0 || v.sellingPrice < 0) {
        setError(`Variant #${i + 1} prices cannot be negative.`);
        return;
      }
      if (!v.batches || v.batches.length === 0) {
        setError(`Variant #${i + 1} must have at least one batch.`);
        return;
      }
      for (let j = 0; j < v.batches.length; j++) {
        const b = v.batches[j];
        if (!b.batchNumber) {
          setError(`Variant #${i + 1} Batch #${j + 1} must have a batch number.`);
          return;
        }
        if (!b.expiryDate) {
          setError(`Variant #${i + 1} Batch #${j + 1} must have an expiry date.`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/products/${id}`, product);
      } else {
        await api.post('/products', product);
      }
      navigate('/products');
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.message || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const addVariant = () => {
    const vCount = product.variants.length + 1;
    setProduct({
      ...product,
      variants: [
        ...product.variants,
        {
          shade: '',
          size: '50ml',
          sku: '',
          costPrice: 0,
          sellingPrice: 0,
          batches: [
            {
              batchNumber: `B-00${vCount}`,
              expiryDate: '',
              quantity: 10,
              warehouseLocation: 'Main Warehouse',
            },
          ],
        },
      ],
    });
  };

  const removeVariant = (index) => {
    if (product.variants.length <= 1) {
      alert('A product must have at least one variant.');
      return;
    }
    const newVariants = product.variants.filter((_, i) => i !== index);
    setProduct({ ...product, variants: newVariants });
  };

  const addBatch = (variantIndex) => {
    const newVariants = [...product.variants];
    const bCount = (newVariants[variantIndex].batches?.length || 0) + 1;
    newVariants[variantIndex].batches.push({
      batchNumber: `B-00${bCount}`,
      expiryDate: '',
      quantity: 10,
      warehouseLocation: 'Main Warehouse',
    });
    setProduct({ ...product, variants: newVariants });
  };

  const removeBatch = (variantIndex, batchIndex) => {
    const newVariants = [...product.variants];
    if (newVariants[variantIndex].batches.length <= 1) {
      alert('A variant must have at least one batch.');
      return;
    }
    newVariants[variantIndex].batches = newVariants[variantIndex].batches.filter((_, i) => i !== batchIndex);
    setProduct({ ...product, variants: newVariants });
  };

  const updateVariant = (variantIndex, field, value) => {
    const newVariants = [...product.variants];
    newVariants[variantIndex][field] = value;
    setProduct({ ...product, variants: newVariants });
  };

  const updateBatch = (variantIndex, batchIndex, field, value) => {
    const newVariants = [...product.variants];
    newVariants[variantIndex].batches[batchIndex][field] = value;
    setProduct({ ...product, variants: newVariants });
  };

  if (fetchLoading) {
    return (
      <div style={styles.container}>
        <Navbar />
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p>Loading product information...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Navbar />
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.topBar}>
          <div>
            <Link to="/products" style={styles.backLink}>← Back to Products</Link>
            <h1 style={styles.title}>{isEditing ? 'Edit Product' : 'Create New Product'}</h1>
            <p style={styles.subtitle}>Define product specifications, sizes, shades, and stock batches</p>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Basic Info Section */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>1. Basic Information</h2>
            <div style={styles.row}>
              <Input
                label="Product Name"
                type="text"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                placeholder="e.g., Luminous Silk Foundation"
                required
              />
              <Input
                label="Brand"
                type="text"
                value={product.brand}
                onChange={(e) => setProduct({ ...product, brand: e.target.value })}
                placeholder="e.g., Giorgio Armani"
                required
              />
            </div>

            <div style={styles.row}>
              <div style={styles.selectGroup}>
                <label style={styles.label}>Category *</label>
                <select
                  value={product.category}
                  onChange={(e) => setProduct({ ...product, category: e.target.value })}
                  style={styles.select}
                  required
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div style={styles.selectGroup}>
                <label style={styles.label}>Sub-Category *</label>
                <select
                  value={product.subCategory}
                  onChange={(e) => setProduct({ ...product, subCategory: e.target.value })}
                  style={styles.select}
                  required
                >
                  {subCategories.map((sc) => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Description (Optional)"
              type="text"
              value={product.description}
              onChange={(e) => setProduct({ ...product, description: e.target.value })}
              placeholder="Describe formula, finish, recommended skin types..."
            />
          </div>

          {/* Variants and Batches Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>2. Product Variants & Stock Batches</h2>
                <p style={styles.sectionSub}>Add shades, sizes, and their initial inventory batches</p>
              </div>
              <Button type="button" onClick={addVariant} variant="secondary">
                + Add Variant
              </Button>
            </div>

            {product.variants.map((variant, vIdx) => (
              <div key={vIdx} style={styles.variantCard}>
                <div style={styles.variantTop}>
                  <h3 style={styles.variantTitle}>
                    Variant #{vIdx + 1}: {variant.shade || 'Standard'} ({variant.size || 'N/A'})
                  </h3>
                  {product.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(vIdx)}
                      style={styles.removeBtn}
                    >
                      ✕ Remove Variant
                    </button>
                  )}
                </div>

                <div style={styles.row}>
                  <Input
                    label="Shade / Tone"
                    type="text"
                    value={variant.shade}
                    onChange={(e) => updateVariant(vIdx, 'shade', e.target.value)}
                    placeholder="e.g., Fair Warm, 02 Light, N/A"
                  />
                  <Input
                    label="Size / Volume"
                    type="text"
                    value={variant.size}
                    onChange={(e) => updateVariant(vIdx, 'size', e.target.value)}
                    placeholder="e.g., 30ml, 50g, 100ml"
                    required
                  />
                </div>

                <div style={styles.row}>
                  <Input
                    label="Custom SKU (Leave blank to auto-generate)"
                    type="text"
                    value={variant.sku}
                    onChange={(e) => updateVariant(vIdx, 'sku', e.target.value)}
                    placeholder="e.g., GA-SILK-02-30ML"
                  />
                  <Input
                    label="Cost Price ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.costPrice}
                    onChange={(e) => updateVariant(vIdx, 'costPrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                  <Input
                    label="Selling Price ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={variant.sellingPrice}
                    onChange={(e) => updateVariant(vIdx, 'sellingPrice', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Batches Container */}
                <div style={styles.batchesBox}>
                  <div style={styles.batchTop}>
                    <h4 style={styles.batchHeading}>📦 Batches & Expiry Dates</h4>
                    <button
                      type="button"
                      onClick={() => addBatch(vIdx)}
                      style={styles.addBatchBtn}
                    >
                      + Add Batch
                    </button>
                  </div>

                  {variant.batches.map((batch, bIdx) => (
                    <div key={bIdx} style={styles.batchRowCard}>
                      <div style={styles.batchCardHeader}>
                        <span style={styles.batchIndex}>Batch #{bIdx + 1}</span>
                        {variant.batches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBatch(vIdx, bIdx)}
                            style={styles.removeBatchBtn}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div style={styles.batchRow}>
                        <Input
                          label="Batch Number"
                          type="text"
                          value={batch.batchNumber}
                          onChange={(e) => updateBatch(vIdx, bIdx, 'batchNumber', e.target.value)}
                          placeholder="e.g., B-2026-01"
                          required
                        />
                        <Input
                          label="Expiry Date"
                          type="date"
                          value={batch.expiryDate}
                          onChange={(e) => updateBatch(vIdx, bIdx, 'expiryDate', e.target.value)}
                          required
                        />
                        <Input
                          label="Quantity"
                          type="number"
                          min="0"
                          value={batch.quantity}
                          onChange={(e) => updateBatch(vIdx, bIdx, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          required
                        />
                        <Input
                          label="Warehouse Location"
                          type="text"
                          value={batch.warehouseLocation}
                          onChange={(e) => updateBatch(vIdx, bIdx, 'warehouseLocation', e.target.value)}
                          placeholder="e.g., Rack A-12"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/products')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving Product...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
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
    maxWidth: '1080px',
    margin: '0 auto',
  },
  topBar: {
    marginBottom: '24px',
  },
  backLink: {
    color: '#6b21a8',
    fontWeight: 600,
    fontSize: '0.95rem',
    display: 'inline-block',
    marginBottom: '8px',
  },
  title: {
    color: '#2b1d47',
    margin: '0 0 6px',
    fontSize: '2.2rem',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: '#6b7280',
    margin: 0,
    fontSize: '1rem',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#b91c1c',
    padding: '14px 20px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontWeight: 600,
    border: '1px solid #fecaca',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 12px 30px rgba(90, 60, 130, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.7)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitle: {
    margin: '0 0 4px',
    fontSize: '1.3rem',
    color: '#2b1d47',
  },
  sectionSub: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#64748b',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  selectGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500',
    color: '#2c3e50',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },
  variantCard: {
    background: '#f8fafc',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
    border: '1px solid #e2e8f0',
  },
  variantTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  variantTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#1e293b',
  },
  removeBtn: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    padding: '5px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  batchesBox: {
    marginTop: '16px',
    borderTop: '1px dashed #cbd5e1',
    paddingTop: '16px',
  },
  batchTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  batchHeading: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#475569',
  },
  addBatchBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#475569',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  batchRowCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '12px',
    border: '1px solid #e2e8f0',
  },
  batchCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  batchIndex: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  removeBatchBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '14px',
  },
  batchRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '80px 20px',
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

export default CreateProduct;
