/**
 * App.jsx
 *
 * Top-level component. Manages state for rules, cart items, and results.
 * Wires together CSV upload → parse → engine → display.
 */

import { useRef, useState } from 'react'
import CsvUploader from './components/CsvUploader.jsx'
import DataTable from './components/DataTable.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import { processCart, calculateCartOffer,} from "./engine/discountEngine.js";
import RuleInput from "./components/RuleInput.jsx";
import RulePreview from "./components/RulePreview.jsx";
import useRuleGenerator from "./hooks/useRuleGenerator.js";
import PdfUploader from "./components/PdfUploader.jsx";

// ── Column definitions ───────────────────────────────────────────

const RULES_COLUMNS = [
  { key: 'ruleId',    label: 'Rule ID' },
  { key: 'scope',     label: 'Scope',      render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies To' },
  { key: 'type',      label: 'Type',       render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  {
    key: 'value',
    label: 'Value',
    render: (v, row) => row.type === 'percentage' ? `${v}% off` : `Rs.${v} off`,
  },
  { key: 'stackable', label: 'Stackable',  render: (v) => (v ? 'Yes' : 'No') },
]

const CART_COLUMNS = [
  { key: 'itemId',    label: 'Item' },
  { key: 'product',   label: 'Product' },
  { key: 'brand',     label: 'Brand' },
  { key: 'platform',  label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
]

const RESULTS_COLUMNS = [
  { key: 'itemId',    label: 'Item' },
  { key: 'product',   label: 'Product' },
  { key: 'basePrice', label: 'Base Price',  render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
  { key: 'finalPrice',label: 'Final Price',
    render: (v, row) => (
      <span style={{ fontWeight: 700, color: row.totalDiscount > 0 ? '#1e5c2c' : '#131A48' }}>
        Rs.{v.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'totalDiscount',
    label: 'You Save',
    render: (v) =>
      v > 0 ? (
        <span style={{ color: '#1e5c2c', fontWeight: 600 }}>Rs.{v.toLocaleString('en-IN')}</span>
      ) : (
        <span style={{ color: '#888' }}>—</span>
      ),
  },
  {
    key: 'reasoning',
    label: 'Offer Applied',
    render: (v) => (
      <span style={{ color: v === 'No offers available' ? '#888' : '#131A48', fontStyle: v === 'No offers available' ? 'italic' : 'normal' }}>
        {v}
      </span>
    ),
  },
]

// ── Styles ───────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: "100vh",
    background: "#f7f7f9",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#131A48",
    padding: "1rem 3rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoTxt: {
    fontFamily: "Georgia, serif",
    fontSize: 17,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  logoSpan: { color: "#FF5800" },
  headerSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  main: {
    maxWidth: 1500,
    width: "95%",
    margin: "0 auto",
    padding: "2rem 0",
  },
  section: {
    background: "#fff",
    border: "1px solid #CECECE",
    borderRadius: 12,
    padding: '1.6rem',
    marginBottom: "1.2rem",
  },
  sectionTitle: {
    fontFamily: "Georgia, serif",
    fontWeight: 700,
    fontSize: 14,
    color: "#131A48",
    marginBottom: "0.7rem",
    paddingBottom: 6,
    borderBottom: "2px solid #FF5800",
    display: "inline-block",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateAreas: `
    "rules ai"
    "cart cart"
  `,
    gap: "24px",
    alignItems: "start",
  },
  btn: {
    background: "#FF5800",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "0.65rem 2rem",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  btnDisabled: {
    background: "#CECECE",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "0.65rem 2rem",
    fontSize: 13,
    fontWeight: 700,
    cursor: "not-allowed",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  totalRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "1rem",
    marginTop: "0.75rem",
    paddingTop: "0.75rem",
    borderTop: "2px solid #131A48",
  },
  totalLabel: { fontWeight: 700, fontSize: 14, color: "#131A48" },
  totalValue: { fontWeight: 700, fontSize: 16, color: "#131A48" },
  tag: (color, bg) => ({
    display: "inline-block",
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 20,
    background: bg,
    color,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  }),
};

// ── Component ────────────────────────────────────────────────────

export default function App() {
  const [csvRules, setCsvRules] = useState([]);
  const [aiRules, setAiRules] = useState([]);
  const rules = [...csvRules, ...aiRules];
  const [rulesErrors, setRulesErr] = useState([]);
  const [rulesFileName, setRulesFileName] = useState("");
  const [cartItems, setCartItems]   = useState([])
  const [cartErrors, setCartErrors] = useState([])
  const [results, setResults]       = useState(null)
  const [csvCartFileName, setCsvCartFileName] = useState("");
  const [pdfCartFileName, setPdfCartFileName] = useState("");
  const [cartSummary, setCartSummary] = useState(null);
  const [cartSource, setCartSource] = useState("");
  const [clearPromptTrigger, setClearPromptTrigger] = useState(0);
  const resultsRef = useRef(null);
  const {
    loading,
    error: ruleGenerationError,
    parsedRule,
    dialogOpen,
    generateRule,
    closeDialog,
  } = useRuleGenerator();

  // ── Handlers ──

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText);

    setCsvRules(data);
    setAiRules([]);
    setRulesErr(errors);
    setRulesFileName(fileName);

    setResults(null);
    setCartSummary(null);
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText)
    setCartItems(data)
    setCartErrors(errors)
    setCsvCartFileName(fileName);
    setPdfCartFileName("");
    setResults(null);
    setCartSummary(null);
    setCartSource("CSV");
  }

  async function handlePdfCart(items, parser, fileName) {
    setCartItems(items);
    setCartErrors([]);
    setPdfCartFileName(fileName|| "cart.pdf");
    setCsvCartFileName("");
    setCartSource("PDF");

    console.log(`Cart parsed using: ${parser}`);

    setResults(null);
    setCartSummary(null);
  }

  function handleClearCart() {
    setCartItems([]);
    setCartErrors([]);
    setResults(null);
    setCartSummary(null);

    setCartSource("");

    setCsvCartFileName("");
    setPdfCartFileName("");
  }

  function handleCalculate() {
    const itemResults = processCart(cartItems, rules);
    const summary = calculateCartOffer(itemResults, rules);

    setResults(itemResults);
    setCartSummary(summary);

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  const canCalculate = rules.length > 0 && cartItems.length > 0

  function handleRuleConfirm() {
    const newRule = {
      ruleId: `AI-RULE-${Date.now()}`,
      ...parsedRule,
    };

    setAiRules((prev) => [...prev, newRule]);

    closeDialog();
    setClearPromptTrigger((v) => v + 1);

    setResults(null);
    setCartSummary(null);
  }

  function handleClearAiRules() {
    setAiRules([]);
    setResults(null);
    setCartSummary(null);
  }

  // ── Render ──

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.logoTxt}>
          O<span style={S.logoSpan}>pp</span>tra
        </div>
        <div style={S.headerSub}>Discount Engine</div>
      </div>

      <div style={S.main}>
        {/* Upload row */}
        <div style={S.grid2}>
          {/* Rules upload */}
          <div
            style={{
              ...S.section,
              gridArea: "rules",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <div style={S.sectionTitle}>Discount Rules</div>

              <button
                onClick={handleClearAiRules}
                disabled={aiRules.length === 0}
                style={{
                  background: "#fff",
                  color: "#d32f2f",
                  border: "1px solid #d32f2f",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: aiRules.length ? "pointer" : "not-allowed",
                  opacity: aiRules.length ? 1 : 0.5,
                }}
              >
                Clear AI Rules ({aiRules.length})
              </button>
            </div>
            <CsvUploader
              label="rules.csv"
              description="Upload your discount rules CSV"
              onLoad={handleRulesLoad}
              hasData={csvRules.length > 0}
              fileName={rulesFileName}
            />
            <ErrorBanner errors={rulesErrors} />
            {rules.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                  {csvRules.length} CSV rule{csvRules.length !== 1 ? "s" : ""}
                  {aiRules.length > 0 && (
                    <span style={{ marginLeft: 8, color: "#1e5c2c" }}>
                      + {aiRules.length} AI rule
                      {aiRules.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <DataTable columns={RULES_COLUMNS} rows={rules} />
              </div>
            )}
          </div>

          {/* AI Rule Generator */}
          <div
            style={{
              ...S.section,
              gridArea: "ai",
            }}
          >
            <div style={S.sectionTitle}>AI Rule Generator</div>

            <RuleInput
              onGenerate={generateRule}
              loading={loading}
              clearTrigger={clearPromptTrigger}
            />

            {ruleGenerationError && (
              <div style={{ color: "red", marginTop: "10px" }}>
                {ruleGenerationError}
              </div>
            )}
          </div>

          {/* Cart upload */}
          <div
            style={{
              ...S.section,
              gridArea: "cart",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div style={S.sectionTitle}>Cart Items</div>

              <button
                onClick={handleClearCart}
                disabled={!cartItems.length}
                style={{
                  background: "#fff",
                  color: "#d32f2f",
                  border: "1px solid #d32f2f",
                  borderRadius: 6,
                  padding: "8px 14px",
                  cursor: cartItems.length ? "pointer" : "not-allowed",
                  opacity: cartItems.length ? 1 : 0.5,
                  fontWeight: 600,
                }}
              >
                Clear Cart
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <CsvUploader
                label="cart.csv"
                description="Upload your cart CSV"
                onLoad={handleCartLoad}
                hasData={cartSource === "CSV"}
                fileName={csvCartFileName}
              />

              <PdfUploader
                onCartLoaded={handlePdfCart}
                hasData={cartSource === "PDF"}
                fileName={pdfCartFileName}
              />
            </div>

            {cartItems.length > 0 && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: cartSource === "CSV" ? "#E8F5E9" : "#E3F2FD",
                  color: cartSource === "CSV" ? "#1B5E20" : "#1565C0",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                Current Source: {cartSource} •{" "}
                {cartSource === "CSV" ? csvCartFileName : pdfCartFileName}
              </div>
            )}

            <ErrorBanner errors={cartErrors} />
            {cartItems.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>
                  {cartItems.length} item{cartItems.length > 1 ? "s" : ""}{" "}
                  loaded
                </div>
                <DataTable columns={CART_COLUMNS} rows={cartItems} />
              </div>
            )}
          </div>
        </div>

        {/* Calculate button */}
        <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
          <button
            style={{
              ...(canCalculate ? S.btn : S.btnDisabled),
              width: "320px",
            }}
            onClick={handleCalculate}
            disabled={!canCalculate}
          >
            Calculate Discounts
          </button>
          {!canCalculate && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>
              Upload both Rules and Cart files to calculate
            </div>
          )}
        </div>

        {/* Results */}
        {results && (
          <div
            ref={resultsRef}
            style={{
              ...S.section,
              gridArea: "results",
            }}
          >
            <div style={S.sectionTitle}>Cart Summary</div>
            <DataTable columns={RESULTS_COLUMNS} rows={results} />
            <div style={S.totalRow}>
              <div style={{ textAlign: "right" }}>
                <div>
                  <strong>Subtotal:</strong> Rs.
                  {cartSummary.subtotal.toLocaleString("en-IN")}
                </div>

                {cartSummary.cartDiscount > 0 && (
                  <div
                    style={{
                      display: "block",
                      marginTop: "12px",
                      padding: "10px 0",
                      borderTop: "1px solid #ddd",
                      color: "#1e5c2c",
                      fontWeight: 600,
                    }}
                  >
                    <span>
                      Cart Offer: {cartSummary.appliedRule.value}% off — Rs.
                      {cartSummary.cartDiscount.toLocaleString("en-IN")} saved
                    </span>
                  </div>
                )}

                <div style={{ marginTop: 6 }}>
                  <strong>Final Total:</strong> Rs.
                  {cartSummary.finalTotal.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <RulePreview
        open={dialogOpen}
        rule={parsedRule}
        onConfirm={handleRuleConfirm}
        onCancel={() => {
          closeDialog();
          setClearPromptTrigger((v) => v + 1);
        }}
      />
    </div>
  );
}
