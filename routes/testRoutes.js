const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "MyEx API is running successfully 🚀" });
});

module.exports = router;
