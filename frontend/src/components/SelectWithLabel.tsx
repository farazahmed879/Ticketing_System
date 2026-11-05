import CustomIcon from "./CustomIcon";
import CustomSelect from "./CustomSelect";
import styles from "./SelectWithLabel.module.css";

const SelectWithLabel = ({
  icon = "Tag",
  iconColor = "var(--accent-secondary)",
  control,
  onChange,
  value,
  disabled = false,
  multiple = false,
  options = [],
  label = "",
  name = "",
  canAssign = false,
  dummyLabel = "",
  showSearch = true,
  required = false,
  rules,
}: any) => {
  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <CustomIcon name={icon} size={15} color={iconColor} /> {label}
        {Boolean(required || rules?.required) && (
          <span style={{ color: "var(--accent-danger)" }}>*</span>
        )}
      </label>
      <div className={styles.fieldWrapper}>
        {canAssign && (
          <CustomSelect
            name={name}
            control={control}
            value={value}
            isMulti={multiple}
            options={options}
            onChange={onChange}
            disabled={disabled}
            placeholder={`${label}...`}
            showSearch={showSearch}
          />
        )}
        {!canAssign && (
          <div className={`${styles.readOnlyCard} glass-card`}>
            {dummyLabel ? (
              multiple ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dummyLabel.split(",").map((tag: string) => (
                    tag.trim() ? (
                      <span
                        key={tag}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: "rgba(255,255,255,0.05)",
                          fontSize: "0.78rem",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-glass)",
                        }}
                      >
                        {tag.trim()}
                      </span>
                    ) : null
                  ))}
                </div>
              ) : (
                <>
                  <div
                    className={styles.avatar}
                    style={{ color: iconColor }}
                  >
                    {dummyLabel.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.dummyLabelText}>
                      {dummyLabel}
                    </div>
                  </div>
                </>
              )
            ) : (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontStyle: "italic",
                }}
              >
                Unassigned
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectWithLabel;
