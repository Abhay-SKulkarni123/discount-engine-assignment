export default function RulePreview({ rule, open, onConfirm, onCancel }) {
  if (!open || !rule) return null;

  const offer =
    rule.type === "percentage" ? `${rule.value}% off` : `₹${rule.value} off`;

  const appliesTo = rule.scope === "cart" ? "Entire Cart" : rule.appliesTo;

  const condition =
    rule.scope === "cart"
      ? `Cart Total ≥ ₹${rule.minCartValue?.toLocaleString("en-IN")}`
      : "None";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          background: "#fff",
          width: 520,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 10px 35px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            background: "#131A48",
            color: "#fff",
            padding: "18px 22px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>Confirm AI Generated Rule</h2>

          <div
            style={{
              marginTop: 5,
              fontSize: 13,
              opacity: 0.8,
            }}
          >
            Please review the generated rule before adding it.
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <tbody>
              <tr>
                <td>
                  <strong>Offer</strong>
                </td>
                <td>{offer}</td>
              </tr>

              <tr>
                <td>
                  <strong>Scope</strong>
                </td>
                <td>
                  {rule.scope.charAt(0).toUpperCase() + rule.scope.slice(1)}
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Applies To</strong>
                </td>
                <td>{appliesTo}</td>
              </tr>

              <tr>
                <td>
                  <strong>Condition</strong>
                </td>
                <td>{condition}</td>
              </tr>

              <tr>
                <td>
                  <strong>Stackable</strong>
                </td>
                <td>{rule.stackable ? "Yes" : "No"}</td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 28,
            }}
          >
            <button
              onClick={onCancel}
              style={{
                padding: "10px 18px",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                borderRadius: 6,
              }}
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              style={{
                padding: "10px 18px",
                background: "#FF5800",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              Add Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
