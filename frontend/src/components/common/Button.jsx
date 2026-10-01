const Button = ({
  children,
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  style = {},
  ...props
}) => {
  const variants = {
    primary: {
      background: "linear-gradient(135deg, #8a4fbf 0%, #d06ae7 100%)",
      color: "#fff",
      boxShadow: "0 12px 22px rgba(138, 79, 191, 0.24)",
    },
    secondary: {
      background: "#eef2ff",
      color: "#4338ca",
    },
    danger: {
      background: "linear-gradient(135deg, #ff7aa2 0%, #ff4d67 100%)",
      color: "#fff",
    },
    warning: {
      background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
      color: "#fff",
    },
  };

  const baseStyle = {
    border: "none",
    borderRadius: "999px",
    padding: "10px 18px",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    ...variants[variant],
    ...style,
  };

  return (
    <button type={type} disabled={disabled} onClick={onClick} style={baseStyle} {...props}>
      {children}
    </button>
  );
};

export default Button;
