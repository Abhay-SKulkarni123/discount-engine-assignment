import { useRef, useState } from "react";
import { extractPdfText, parseStructuredCart } from "../engine/pdfParser";
import { parseCartItems } from "../services/aiService";

export default function PdfUploader({
  onCartLoaded,
  fileName = "",
  hasData = false,
}) {
  const inputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setLoading(true);
    setError("");

    setSelectedFile(file.name);

    try {
      const text = await extractPdfText(file);

      let items = [];
      let parser = "AI Parser";

      try {
        const result = parseStructuredCart(text);

        items = result.items;

        const looksInvalid =
          items.length <= 1 ||
          items.some(
            (item) =>
              item.product === "Product" ||
              item.brand === "Brand" ||
              item.platform === "Platform",
          );

        if (looksInvalid) {
          throw new Error("Structured parser failed.");
        }

        parser = "Structured Parser";
      } catch {
        items = await parseCartItems(text);
      }

      console.log("Parsed Items:", items);
      onCartLoaded(items, parser, file.name);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to extract cart items from this PDF. Please upload a valid cart PDF.",
      );
    } finally {
      setLoading(false);
    }

    event.target.value = "";
  }

  return (
    <div
      style={{
        border: `2px dashed ${hasData ? "#1e5c2c" : "#CECECE"}`,
        borderRadius: 6,
        padding: "1rem 1.2rem",
        background: hasData ? "#f0faf2" : "#fafafa",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={handleChange}
        disabled={loading}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <span style={{ fontSize: 20 }}>{hasData ? "✅" : "📄"}</span>

        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: "#131A48",
            }}
          >
            cart.pdf
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#888",
              marginTop: 2,
            }}
          >
            {loading
              ? "Parsing PDF..."
              : hasData
                ? fileName || selectedFile
                : "Upload your cart PDF"}
          </div>
        </div>

        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: hasData ? "#1e5c2c" : "#FF5800",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {hasData ? "Change" : "Upload"}
          </span>
        </div>

        {error && (
          <div
            style={{
              color: "#d32f2f",
              fontSize: "12px",
              marginTop: "8px",
            }}
          >
            {error}
          </div>
        )}

      </div>
    </div>
  );
}
