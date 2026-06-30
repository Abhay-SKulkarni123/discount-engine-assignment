import { useEffect, useState } from "react";

export default function RuleInput({ onGenerate, loading, clearTrigger }) {
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    setPrompt("");
  }, [clearTrigger]);

  function handleSubmit(e) {
    e.preventDefault();

    if (!prompt.trim()) return;

    onGenerate(prompt);
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <h3>AI Rule Generator</h3>

      <form onSubmit={handleSubmit}>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: 20% off Natura Casa brand, stackable with other offers"
          style={{
            width: "100%",
            padding: "10px",
            resize: "vertical",
            borderRadius: "6px",
            border: "1px solid #ccc",
            fontSize: "14px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "10px",
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Rule"}
        </button>
      </form>
    </div>
  );
}
