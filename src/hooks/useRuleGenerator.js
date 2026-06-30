import { useState } from "react";
import { parseDiscountRule } from "../services/aiService";

export default function useRuleGenerator() {
  const [loading, setLoading] = useState(false);
  const [parsedRule, setParsedRule] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  async function generateRule(prompt) {
    try {
      setLoading(true);
      setError("");

      const rule = await parseDiscountRule(prompt);

      if (rule.error) {
        setError(
          "Couldn't understand the rule. Please be more specific by including:\n" +
            "• Discount type (percentage or flat)\n" +
            "• Discount value\n" +
            "• Brand, platform, or cart condition",
        );
        return;
      }

      setParsedRule(rule);
      setDialogOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to generate rule.");
    } finally {
      setLoading(false);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setParsedRule(null);
  }

  return {
    loading,
    error,
    parsedRule,
    dialogOpen,
    generateRule,
    closeDialog,
  };
}
