import CustomIcon from "./CustomIcon";
import CustomSelect from "./CustomSelect";

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
  showSearch = false,
}: any) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <label
        style={{
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <CustomIcon name={icon} size={18} color={iconColor} /> {label}
      </label>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
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
          <div
            className="glass-card"
            style={{
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              minHeight: 64,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-glass)",
              borderRadius: 12,
            }}
          >
            {dummyLabel ? (
              multiple ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {dummyLabel.split(",").map((tag: string) => (
                    tag.trim() ? (
                      <span
                        key={tag}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "rgba(255,255,255,0.05)",
                          fontSize: "0.8rem",
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
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "rgba(6, 182, 212, 0.1)",
                      color: iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1rem",
                      flexShrink: 0,
                    }}
                  >
                    {dummyLabel.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {dummyLabel}
                    </div>
                  </div>
                </>
              )
            ) : (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
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
