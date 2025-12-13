const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send("API is alive");
});

// In-memory test data
let items = [
  { id: 1, name: "Test item 5" },
  { id: 2, name: "Test item 2" }
];

// In-memory books collection
let books = [];

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

// Books endpoints
const ALLOWED_BOOK_FIELDS = ["title", "author", "totalPages"];

const formatBookResponse = book => ({
  id: book.id,
  title: book.title,
  author: book.author,
  totalPages: book.totalPages,
  createdAt: book.createdAt,
  updatedAt: book.updatedAt
});

const validateBookPayload = payload => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "Invalid payload" };
  }

  const extraFields = Object.keys(payload).filter(
    key => !ALLOWED_BOOK_FIELDS.includes(key)
  );

  if (extraFields.length > 0) {
    return { valid: false, message: "Unexpected fields in payload" };
  }

  if (typeof payload.title !== "string" || payload.title.trim() === "") {
    return { valid: false, message: "title is required and must be a non-empty string" };
  }

  if (
    typeof payload.totalPages !== "number" ||
    !Number.isInteger(payload.totalPages) ||
    payload.totalPages <= 0
  ) {
    return {
      valid: false,
      message: "totalPages is required and must be a positive integer"
    };
  }

  if (
    payload.author !== undefined &&
    payload.author !== null &&
    typeof payload.author !== "string"
  ) {
    return { valid: false, message: "author must be a string if provided" };
  }

  return { valid: true };
};

app.get("/books", (req, res) => {
  res.json(books.map(formatBookResponse));
});

app.post("/books", (req, res) => {
  const validationResult = validateBookPayload(req.body);
  if (!validationResult.valid) {
    return res.status(400).json({ error: validationResult.message });
  }

  const timestamp = new Date().toISOString();
  const newBook = {
    id: Date.now(),
    title: req.body.title.trim(),
    author: req.body.author ?? null,
    totalPages: req.body.totalPages,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  books.push(newBook);
  res.status(201).json(formatBookResponse(newBook));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
