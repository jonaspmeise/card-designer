import express from "express";
import { createCard } from "cardcreator-library";

const app = express();
const port = 3000;

app.use(express.json());

app.post("/create-card", (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: "Name and description required" });
  }
  const card = createCard(name, description);
  res.json(card);
});

app.listen(port, () => {
  console.log(`Webapp listening on port ${port}`);
});