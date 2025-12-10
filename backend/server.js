const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is alive");
});

// In-memory test data
let items = [
  { id: 1, name: "Test item 1" },
  { id: 2, name: "Test item 2" }
];

// GET all
app.get("/items", (req, res) => {
  res.json(items);
});

// GET one
app.get("/items/:id", (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

// CREATE
app.post("/items", (req, res) => {
  const newItem = { id: Date.now(), name: req.body.name };
  items.push(newItem);
  res.status(201).json(newItem);
});

// UPDATE
app.patch("/items/:id", (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Not found" });
  item.name = req.body.name ?? item.name;
  res.json(item);
});

// DELETE
app.delete("/items/:id", (req, res) => {
  items = items.filter(i => i.id !== Number(req.params.id));
  res.status(204).send();
});

app.listen(3000, () => console.log("API running on port 3000"));
