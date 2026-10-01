import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const { login, register, error: authError, loading } = useAuth();
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    if (!isLogin && !name) {
      setLocalError('Please enter your full name.');
      return;
    }

    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      result = await register({ name, email, password, phone });
    }

    if (result?.success) {
      navigate('/');
    } else {
      setLocalError(result?.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const displayError = localError || authError;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconCircle}>✨</div>
        <h1 style={styles.title}>Cosmetics Inventory</h1>
        <h2 style={styles.subtitle}>
          {isLogin ? 'Sign into your dashboard' : 'Register your staff account'}
        </h2>

        {displayError && <div style={styles.error}>{displayError}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <>
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                required
              />
              <Input
                label="Phone Number (Optional)"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 555-0199"
              />
            </>
          )}

          <Input
            label="Work Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@cosmetics.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <div style={{ marginTop: '10px' }}>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In to Workspace' : 'Complete Registration'}
            </Button>
          </div>
        </form>

        <p style={styles.switchText}>
          {isLogin ? "Don't have an account yet? " : 'Already registered? '}
          <span
            style={styles.switchLink}
            onClick={() => {
              setIsLogin(!isLogin);
              setLocalError('');
            }}
          >
            {isLogin ? 'Create one now' : 'Sign In instead'}
          </span>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, rgba(168, 85, 247, 0.18), rgba(255,255,255,0) 50%), linear-gradient(135deg, #f9f3ff 0%, #edf8ff 55%, #fff7ee 100%)',
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(16px)',
    padding: '36px 32px',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(124, 58, 237, 0.12)',
    width: '100%',
    maxWidth: '430px',
    border: '1px solid rgba(255,255,255,0.8)',
    textAlign: 'left',
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: '#f3e8ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    margin: '0 auto 16px',
  },
  title: {
    textAlign: 'center',
    color: '#2b1d47',
    margin: '0 0 6px',
    fontSize: '26px',
    letterSpacing: '-0.03em',
    fontWeight: 800,
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    margin: '0 0 24px',
    fontSize: '14px',
    fontWeight: 400,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '12px 14px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '13px',
    fontWeight: 600,
    border: '1px solid #fecaca',
  },
  switchText: {
    textAlign: 'center',
    marginTop: '22px',
    color: '#64748b',
    fontSize: '13px',
  },
  switchLink: {
    color: '#7c3aed',
    cursor: 'pointer',
    fontWeight: 700,
  },
};

export default Login;
