const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
  ...props
}) => {
  return (
    <div style={{ marginBottom: "15px" }}>
      {label && (
        <label
          style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}
        >
          {label} {required && <span style={{ color: "red" }}>*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          fontSize: "16px",
          boxSizing: "border-box",
        }}
        className={className}
        {...props}
      />
    </div>
  );
};

export default Input;
