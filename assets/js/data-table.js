import { createEl, formatDateTime, freshnessText, requireLiveOrDemo, safeText } from "./utils.js";

export function parseNumberish(value) {
  const raw = safeText(value).trim();
  if (!raw) return null;
  const percent = raw.endsWith("%");
  const normalized = raw.replace(/[%\s,]/g, "");
  if (!/^[-+]?\d*(\.\d+)?$/.test(normalized) || normalized === "" || normalized === "." || normalized === "-" || normalized === "+") {
    return null;
  }
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return percent ? number / 100 : number;
}

export function inferColumnType(rows, column) {
  const samples = rows.map((row) => safeText(row[column]).trim()).filter(Boolean);
  if (!samples.length) return "text";
  const numeric = samples.filter((value) => parseNumberish(value) !== null).length;
  return numeric / samples.length >= 0.75 ? "number" : "text";
}

export function normalizeColumns(headers, config = {}) {
  const seen = new Set();
  const duplicates = new Set();
  const clean = [];
  for (const header of headers || []) {
    const name = safeText(header).trim();
    if (!name) continue;
    if (seen.has(name)) duplicates.add(name);
    else {
      seen.add(name);
      clean.push(name);
    }
  }

  const hidden = new Set(config.hiddenColumns || []);
  const ordered = [];
  for (const name of config.columnOrder || []) {
    if (clean.includes(name) && !hidden.has(name)) ordered.push(name);
  }
  for (const name of clean) {
    if (!ordered.includes(name) && !hidden.has(name)) ordered.push(name);
  }

  return { columns: ordered, duplicates: [...duplicates] };
}

export function sortRows(rows, column, direction, type) {
  const factor = direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = safeText(a[column]);
    const bv = safeText(b[column]);
    const aBlank = av.trim() === "";
    const bBlank = bv.trim() === "";
    if (aBlank && bBlank) return 0;
    if (aBlank) return 1;
    if (bBlank) return -1;

    if (type === "number") {
      const an = parseNumberish(av);
      const bn = parseNumberish(bv);
      if (an !== null && bn !== null && an !== bn) return (an - bn) * factor;
      if (an !== null && bn === null) return -1;
      if (an === null && bn !== null) return 1;
    }

    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" }) * factor;
  });
}

export function renderDataTable(container, snapshot, tableConfig = {}, tableKey = "") {
  if (!container) return;
  container.replaceChildren();

  if (!requireLiveOrDemo(snapshot)) {
    container.append(
      createEl("div", { class: "notice", "data-tone": "danger", role: "status" }, [
        createEl("p", { text: "Live mode is enabled, but no valid live snapshot is available. Demo rows are not being shown." })
      ])
    );
    return;
  }

  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  const { columns, duplicates } = normalizeColumns(snapshot.headers || collectHeaders(rows), tableConfig);
  const state = {
    query: "",
    page: 1,
    pageSize: 25,
    sortColumn: tableConfig.defaultSort?.column && columns.includes(tableConfig.defaultSort.column) ? tableConfig.defaultSort.column : columns[0],
    sortDirection: tableConfig.defaultSort?.direction === "desc" ? "desc" : "asc",
    filters: {}
  };

  const root = createEl("div", { class: "table-shell" });
  const notices = createEl("div");
  const meta = createEl("div", { class: "table-meta" });
  const toolbar = createEl("div", { class: "table-toolbar" });
  const tableWrap = createEl("div", { class: "table-wrap" });
  const pagination = createEl("div", { class: "pagination" });
  root.append(notices, meta, toolbar, tableWrap, pagination);
  container.append(root);

  if (snapshot.demo || snapshot.mode === "demo") {
    notices.append(
      createEl("div", { class: "demo-banner", role: "status" }, [
        createEl("span", { class: "badge", text: "Demo mode" }),
        createEl("p", { text: "Rows are fictitious demonstration data and are visibly separated from live mode." })
      ])
    );
  }

  if (duplicates.length) {
    notices.append(
      createEl("div", { class: "notice", "data-tone": "danger", role: "status" }, [
        createEl("p", { text: `Duplicate headers reported: ${duplicates.join(", ")}. Fix the sheet headers before publishing live data.` })
      ])
    );
  }

  if (!columns.length) {
    tableWrap.replaceChildren(createEl("div", { class: "empty-state", text: "No named columns are available." }));
    return;
  }

  renderToolbar();
  render();

  function renderToolbar() {
    const search = createEl("input", {
      type: "search",
      placeholder: "Search displayed values",
      "aria-label": "Search table"
    });
    search.addEventListener("input", () => {
      state.query = search.value;
      state.page = 1;
      render();
    });

    const controls = [createEl("div", { class: "field" }, [createEl("label", { text: "Search" }), search])];
    const filters = tableConfig.filters || {};
    addFilterControl(filters.allianceColumn, "Alliance");
    addFilterControl(filters.periodColumn, "Period");

    const pageSize = createEl("select", { "aria-label": "Rows per page" }, [
      ...[10, 25, 50, 100].map((size) => createEl("option", { value: String(size), text: `${size} rows` }))
    ]);
    pageSize.value = String(state.pageSize);
    pageSize.addEventListener("change", () => {
      state.pageSize = Number(pageSize.value);
      state.page = 1;
      render();
    });
    controls.push(createEl("div", { class: "field" }, [createEl("label", { text: "Page size" }), pageSize]));

    toolbar.replaceChildren(...controls);

    function addFilterControl(column, label) {
      if (!column || !columns.includes(column)) return;
      const values = [...new Set(rows.map((row) => safeText(row[column]).trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      if (!values.length) return;
      const select = createEl("select", { "aria-label": `${label} filter` }, [
        createEl("option", { value: "", text: `All ${label.toLowerCase()}` }),
        ...values.map((value) => createEl("option", { value, text: value }))
      ]);
      select.addEventListener("change", () => {
        state.filters[column] = select.value;
        state.page = 1;
        render();
      });
      controls.push(createEl("div", { class: "field" }, [createEl("label", { text: label }), select]));
    }
  }

  function getColumnType(column) {
    if (tableConfig.types?.[column]) return tableConfig.types[column];
    if (column === tableConfig.idColumn) return "text";
    return inferColumnType(rows, column);
  }

  function filteredRows() {
    const query = state.query.trim().toLocaleLowerCase();
    let next = rows.filter((row) => {
      for (const [column, value] of Object.entries(state.filters)) {
        if (value && safeText(row[column]) !== value) return false;
      }
      if (!query) return true;
      const searchColumns = new Set([...columns, tableConfig.primaryPlayerColumn, tableConfig.idColumn].filter(Boolean));
      return [...searchColumns].some((column) => safeText(row[column]).toLocaleLowerCase().includes(query));
    });
    next = sortRows(next, state.sortColumn, state.sortDirection, getColumnType(state.sortColumn));
    return next;
  }

  function render() {
    const filtered = filteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const pageRows = filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

    meta.replaceChildren(
      ...freshnessText(snapshot).map((line) => createEl("span", { text: line })),
      snapshot.source?.trackingPeriod ? createEl("span", { text: `Tracking period: ${snapshot.source.trackingPeriod}` }) : null,
      createEl("span", { text: `${filtered.length} of ${rows.length} rows shown` })
    );

    if (!rows.length) {
      tableWrap.replaceChildren(createEl("div", { class: "empty-state", text: "No public rows are available yet." }));
      pagination.replaceChildren();
      return;
    }

    const table = createEl("table");
    const thead = createEl("thead");
    const headerRow = createEl("tr");
    for (const column of columns) {
      const label = tableConfig.labels?.[column] || column;
      const button = createEl("button", { type: "button", text: `${label}${state.sortColumn === column ? sortMark(state.sortDirection) : ""}` });
      button.addEventListener("click", () => {
        if (state.sortColumn === column) state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        else {
          state.sortColumn = column;
          state.sortDirection = getColumnType(column) === "number" ? "desc" : "asc";
        }
        render();
      });
      headerRow.append(createEl("th", { class: column === tableConfig.primaryPlayerColumn ? "identity-column" : "" }, [button]));
    }
    thead.append(headerRow);

    const tbody = createEl("tbody");
    for (const row of pageRows) {
      const tr = createEl("tr");
      for (const column of columns) {
        tr.append(createEl("td", { class: column === tableConfig.primaryPlayerColumn ? "identity-column" : "", text: safeText(row[column]) }));
      }
      tbody.append(tr);
    }
    table.append(thead, tbody);
    tableWrap.replaceChildren(table);

    pagination.replaceChildren(
      createEl("span", { text: `Page ${state.page} of ${totalPages}` }),
      createEl("div", { class: "page-buttons" }, [
        pageButton("Previous", state.page <= 1, () => {
          state.page -= 1;
          render();
        }),
        pageButton("Next", state.page >= totalPages, () => {
          state.page += 1;
          render();
        })
      ])
    );
  }
}

function collectHeaders(rows) {
  return [...new Set(rows.flatMap((row) => Object.keys(row)))];
}

function pageButton(text, disabled, onClick) {
  const button = createEl("button", { type: "button", text });
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function sortMark(direction) {
  return direction === "asc" ? " up" : " down";
}
