// Basic Express app with SQLite
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const port = 3000;
const path = require("path");

const app = express();
app.use(cors());

// Database setup
const db = new sqlite3.Database("./class_data.db");
db.serialize(() => {
  // Modalities table
  db.run(`CREATE TABLE IF NOT EXISTS modalities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modality_name TEXT UNIQUE NOT NULL
  )`);

  // Students table with foreign key to modalities
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    modality_id INTEGER,
    tech_hours REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modality_id) REFERENCES modalities(id)
  )`);

  // Pre-populate the learning modalities
  const modalities = ["Reading", "Watching", "Listening", "Practicing"];
  modalities.forEach((modality) => {
    db.run(
      `INSERT OR IGNORE INTO modalities (modality_name) VALUES (?)`,
      modality
    );
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../client")));

// Routes
app.post("/api/submit", (req, res) => {
  const { name, modality_id, tech_hours } = req.body;
  const stmt = db.prepare(
    `INSERT INTO students (name, modality_id, tech_hours) VALUES (?, ?, ?)`
  );
  stmt.run(name, modality_id, tech_hours);
  stmt.finalize();
  res.redirect("/");
});

app.get("/api/students", (req, res) => {
  db.all(
    `
    SELECT s.name, m.modality_name, s.tech_hours 
    FROM students s
    JOIN modalities m ON s.modality_id = m.id
    ORDER BY s.timestamp DESC
  `,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.get("/api/modalities", (req, res) => {
  db.all("SELECT * FROM modalities", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
