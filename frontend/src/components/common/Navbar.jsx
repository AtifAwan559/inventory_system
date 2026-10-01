import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getLinkStyle = (path) => ({
    ...styles.link,
    background: isActive(path) ? 'rgba(255,255,255,0.22)' : 'transparent',
    fontWeight: isActive(path) ? 700 : 500,
    boxShadow: isActive(path) ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
  });

  return (
    <aside style={styles.sidebar}>
      <Link to="/" style={styles.logo}>
        ✨ Cosmetics Hub
      </Link>

      <nav style={styles.navLinks}>
        <Link to="/" style={getLinkStyle('/')}>
          Dashboard
        </Link>
        <Link to="/products" style={getLinkStyle('/products')}>
          Products
        </Link>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Link to="/inventory" style={getLinkStyle('/inventory')}>
            Stock & Batches
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/users" style={getLinkStyle('/users')}>
            Team Access
          </Link>
        )}
      </nav>

      <div style={styles.userSection}>
        <div style={styles.userProfile}>
          <span style={styles.userName}>{user?.name || 'User'}</span>
          <span style={styles.roleBadge}>{user?.role || 'staff'}</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '240px',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #24143e 0%, #4a1d6d 50%, #7c3aed 100%)',
    padding: '24px 16px',
    color: '#fff',
    boxShadow: '4px 0 24px rgba(74, 29, 109, 0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: '28px',
    position: 'sticky',
    top: 0,
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  logo: {
    color: '#fff',
    textDecoration: 'none',
    fontSize: '1.15rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    padding: '0 8px',
  },
  navLinks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  link: {
    color: '#fdf4ff',
    textDecoration: 'none',
    fontSize: '0.92rem',
    padding: '10px 14px',
    borderRadius: '10px',
    transition: 'all 0.15s ease',
    display: 'block',
  },
  userSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderTop: '1px solid rgba(255,255,255,0.15)',
    paddingTop: '16px',
  },
  userProfile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '0 8px',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  roleBadge: {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    background: 'rgba(255,255,255,0.2)',
    padding: '1px 6px',
    borderRadius: '4px',
    color: '#fae8ff',
    marginTop: '4px',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '8px 14px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    transition: 'all 0.15s ease',
    width: '100%',
  },
};

export default Navbar;