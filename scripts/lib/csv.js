export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let index = 0;
  let inQuotes = false;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }
    if (char === "\r") {
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }

  if (inQuotes) throw new Error("CSV has an unterminated quoted field.");
  row.push(field);
  rows.push(row);
  return trimTrailingEmptyRows(rows);
}

export function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value === null || value === undefined ? "" : String(value);
          return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",")
    )
    .join("\n");
}

export function csvToObjects(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { headers: [], rows: [], duplicateHeaders: [], missingHeaders: [] };
  const rawHeaders = rows[0].map((header) => String(header || "").trim());
  const duplicateHeaders = findDuplicates(rawHeaders.filter(Boolean));
  const missingHeaders = rawHeaders
    .map((header, index) => (header ? null : `Column ${index + 1}`))
    .filter(Boolean);

  if (duplicateHeaders.length || missingHeaders.length) {
    return { headers: rawHeaders, rows: [], duplicateHeaders, missingHeaders };
  }

  const dataRows = rows.slice(1).filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
  const objects = dataRows.map((row) => {
    const object = {};
    rawHeaders.forEach((header, index) => {
      object[header] = row[index] === undefined ? "" : String(row[index]);
    });
    return object;
  });
  return { headers: rawHeaders, rows: objects, duplicateHeaders: [], missingHeaders: [] };
}

export function findDuplicates(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    else seen.add(value);
  }
  return [...dupes];
}

function trimTrailingEmptyRows(rows) {
  const next = [...rows];
  while (next.length && next[next.length - 1].every((cell) => cell === "")) {
    next.pop();
  }
  return next;
}
