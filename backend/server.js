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

// In-memory logs collection
let logs = [];

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
const ALLOWED_LOG_FIELDS = ["date", "pagesRead"];

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

const isValidIsoDate = value => {
  if (typeof value !== "string") return false;
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDatePattern.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().startsWith(value);
};

const validateLogPayload = payload => {
  if (!payload || typeof payload !== "object") {
    return { valid: false, message: "Invalid payload" };
  }

  const extraFields = Object.keys(payload).filter(
    key => !ALLOWED_LOG_FIELDS.includes(key)
  );

  if (extraFields.length > 0) {
    return { valid: false, message: "Unexpected fields in payload" };
  }

  if (!isValidIsoDate(payload.date)) {
    return { valid: false, message: "date is required and must be YYYY-MM-DD" };
  }

  if (
    typeof payload.pagesRead !== "number" ||
    !Number.isInteger(payload.pagesRead) ||
    payload.pagesRead <= 0
  ) {
    return {
      valid: false,
      message: "pagesRead is required and must be a positive integer"
    };
  }

  return { valid: true };
};

const formatLogResponse = log => ({
  id: log.id,
  bookId: log.bookId,
  date: log.date,
  pagesRead: log.pagesRead,
  createdAt: log.createdAt
});

const findBookById = id => books.find(book => book.id === Number(id));

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

app.patch("/books/:id", (req, res) => {
  const bookIndex = books.findIndex(book => book.id === Number(req.params.id));

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  const currentBook = books[bookIndex];
  const payload = req.body ?? {};

  const mergedPayload = {
    title: payload.title ?? currentBook.title,
    author: payload.author ?? currentBook.author,
    totalPages: payload.totalPages ?? currentBook.totalPages
  };

  const validationResult = validateBookPayload(mergedPayload);

  if (!validationResult.valid) {
    return res.status(400).json({ error: validationResult.message });
  }

  const updatedBook = {
    ...currentBook,
    ...payload,
    title: mergedPayload.title.trim(),
    author:
      payload.author === undefined
        ? currentBook.author
        : payload.author?.trim() ?? null,
    totalPages: mergedPayload.totalPages,
    updatedAt: new Date().toISOString()
  };

  books[bookIndex] = updatedBook;

  res.json(formatBookResponse(updatedBook));
});

app.delete("/books/:id", (req, res) => {
  const bookIndex = books.findIndex(book => book.id === Number(req.params.id));

  if (bookIndex === -1) {
    return res.status(404).json({ error: "Not found" });
  }

  const [deletedBook] = books.splice(bookIndex, 1);
  logs = logs.filter(log => log.bookId !== deletedBook.id);

  res.status(204).send();
});

app.get("/books/:id/logs", (req, res) => {
  const book = findBookById(req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Not found" });
  }

  const bookLogs = logs
    .filter(log => log.bookId === book.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(bookLogs.map(formatLogResponse));
});

app.post("/books/:id/logs", (req, res) => {
  const book = findBookById(req.params.id);

  if (!book) {
    return res.status(404).json({ error: "Not found" });
  }

  const validationResult = validateLogPayload(req.body);

  if (!validationResult.valid) {
    return res.status(400).json({ error: validationResult.message });
  }

  const existingLog = logs.find(
    log => log.bookId === book.id && log.date === req.body.date
  );

  if (existingLog) {
    return res
      .status(409)
      .json({ error: "A log for this book already exists on that date" });
  }

  const totalPagesReadForBook = logs
    .filter(log => log.bookId === book.id)
    .reduce((sum, log) => sum + log.pagesRead, 0);

  if (totalPagesReadForBook + req.body.pagesRead > book.totalPages) {
    return res
      .status(400)
      .json({ error: "Total pages read cannot exceed totalPages" });
  }

  const timestamp = new Date().toISOString();
  const newLog = {
    id: Date.now(),
    bookId: book.id,
    date: req.body.date,
    pagesRead: req.body.pagesRead,
    createdAt: timestamp
  };

  logs.push(newLog);

  res.status(201).json(formatLogResponse(newLog));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on port " + PORT));
