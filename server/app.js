// Basic Express app that appends each submission to a single CSV file
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const port = 3000;
const app = express();
app.use(cors());

const CSV_PATH = path.join(__dirname, "class_data.csv");
const CSV_HEADER = "name,learning_style,tech_hours,submitted_at";
const LEARNING_STYLES = ["Reading", "Watching", "Listening", "Practicing"];

function ensureCsv() {
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, `${CSV_HEADER}\n`);
  }
}

function csvEscape(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function readStudents() {
  const text = fs.readFileSync(CSV_PATH, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const [name, learning_style, tech_hours, submitted_at] = parseCsvLine(
      lines[i],
    );
    rows.push({ name, learning_style, tech_hours, submitted_at });
  }

  rows.sort((a, b) => (a.submitted_at < b.submitted_at ? 1 : -1));
  return rows;
}

ensureCsv();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../client")));

app.post("/api/submit", (req, res) => {
  const { name, learning_style, tech_hours } = req.body;
  const hours = Number(tech_hours);

  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    !LEARNING_STYLES.includes(learning_style) ||
    !Number.isFinite(hours) ||
    hours < 0 ||
    hours > 168
  ) {
    res.status(400).json({ error: "Invalid submission" });
    return;
  }

  const line =
    [
      csvEscape(name.trim()),
      csvEscape(learning_style),
      csvEscape(hours),
      csvEscape(new Date().toISOString()),
    ].join(",") + "\n";

  fs.appendFile(CSV_PATH, line, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ ok: true });
  });
});

app.get("/api/students", (req, res) => {
  try {
    const rows = readStudents().map(({ name, learning_style, tech_hours }) => ({
      name,
      learning_style,
      tech_hours,
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`App running at http://localhost:${port}`);
});
