export default function UserInputFormItem({
  id,
  label,
  helperText,
  type = "number",
  min = 0,
  max = 100,
  step,
  value,
  placeholder,
  onChange,
  prependText,
  appendText,
}) {
  const placeholderText = placeholder
    ? placeholder
    : `Enter ${label.toLowerCase()}`;

  return (
    <div className="mb-3">
      <label htmlFor={id}>{label}</label>

      <div className="input-group">
        {prependText && (
          <div className="input-group-prepend">
            <span className="input-group-text">{prependText}</span>
          </div>
        )}
        <input
          id={id}
          type={type}
          min={min}
          max={max}
          className="form-control"
          onChange={onChange}
          value={value}
          placeholder={placeholderText}
          step={step}
        />
        {appendText && (
          <div className="input-group-append">
            <span className="input-group-text">{appendText}</span>
          </div>
        )}
      </div>

      {helperText && (
        <div id={`${id}HelpText`} className="form-text">
          {helperText}
        </div>
      )}
    </div>
  );
}
