import { Router } from "express";

const router = Router();

const COMPATIBILITY: Record<string, string[]> = {
  input:  ["llm", "agent", "tool", "router"],
  llm:    ["output", "router", "llm", "agent"],
  tool:   ["llm", "agent", "output"],
  agent:  ["output", "router", "llm"],
  router: ["llm", "agent", "tool", "output"],
  output: [],
};

router.post("/", (req, res) => {
  const { sourceType, targetType } = req.body;
  const allowed = COMPATIBILITY[sourceType] || [];
  const compatible = allowed.includes(targetType);
  res.json({
    compatible,
    message: compatible
      ? sourceType + " -> " + targetType + " connection looks good."
      : "Warning: " + sourceType + " cannot connect directly to " + targetType + " nodes."
  });
});

export default router;
