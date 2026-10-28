/* Libris — Library Management System (CRUD with localStorage) */
(() => {
  "use strict";

  const STORAGE_KEY = "libris_books_v1";

  // ---------- Data layer ----------
  const seedBooks = [
    { id: uid(), title: "Clean Code", author: "Robert C. Martin", isbn: "978-0132350884", year: 2008, category: "Programming", status: "Available", issuedTo: "", createdAt: 1 },
    { id: uid(), title: "The Pragmatic Programmer", author: "Andrew Hunt", isbn: "978-0135957059", year: 2019, category: "Programming", status: "Issued", issuedTo: "Ananya R.", createdAt: 2 },
    { id: uid(), title: "A Brief History of Time", author: "Stephen Hawking", isbn: "978-0553380163", year: 1988, category: "Science", status: "Available", issuedTo: "", createdAt: 3 },
    { id: uid(), title: "Wings of Fire", author: "A. P. J. Abdul Kalam", isbn: "978-8173711466", year: 1999, category: "Biography", status: "Available", issuedTo: "", createdAt: 4 },
    { id: uid(), title: "The Alchemist", author: "Paulo Coelho", isbn: "978-0062315007", year: 1988, category: "Fiction", status: "Issued", issuedTo: "Karthik S.", createdAt: 5 },
  ];

  let books = load();
  let deleteId = null;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore corrupt storage */ }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedBooks));
    return [...seedBooks];
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  // CREATE
  function createBook(data) {
    books.push({ id: uid(), createdAt: Date.now(), ...data });
    save();
  }

  // UPDATE
  function updateBook(id, data) {
    books = books.map((b) => (b.id === id ? { ...b, ...data } : b));
    save();
  }

  // DELETE
  function deleteBook(id) {
    books = books.filter((b) => b.id !== id);
    save();
  }

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const tableBody = $("bookTable");
  const emptyState = $("emptyState");
  const searchInput = $("searchInput");
  const categoryFilter = $("categoryFilter");
  const statusFilter = $("statusFilter");
  const sortBy = $("sortBy");
  const bookModal = $("bookModal");
  const confirmModal = $("confirmModal");
  const form = $("bookForm");
  const statusSelect = $("status");
  const issuedToField = $("issuedToField");

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Rendering (READ) ----------
  function render() {
    renderStats();
    renderCategoryFilter();

    const q = searchInput.value.trim().toLowerCase();
    let list = books.filter((b) => {
      const matchQ = !q || [b.title, b.author, b.isbn].some((v) => v.toLowerCase().includes(q));
      const matchC = categoryFilter.value === "all" || b.category === categoryFilter.value;
      const matchS = statusFilter.value === "all" || b.status === statusFilter.value;
      return matchQ && matchC && matchS;
    });

    const sorters = {
      title: (a, b) => a.title.localeCompare(b.title),
      author: (a, b) => a.author.localeCompare(b.author),
      year: (a, b) => b.year - a.year,
      recent: (a, b) => b.createdAt - a.createdAt,
    };
    list.sort(sorters[sortBy.value]);

    tableBody.innerHTML = list
      .map(
        (b, i) => `
        <tr style="animation-delay:${Math.min(i * 40, 400)}ms">
          <td>${i + 1}</td>
          <td>
            <div class="book-title">${esc(b.title)}</div>
            <div class="book-author">by ${esc(b.author)}</div>
            ${b.status === "Issued" && b.issuedTo ? `<div class="issued-to">Issued to ${esc(b.issuedTo)}</div>` : ""}
          </td>
          <td>${esc(b.isbn)}</td>
          <td><span class="cat-chip">${esc(b.category)}</span></td>
          <td>${esc(b.year)}</td>
          <td><span class="badge ${b.status.toLowerCase()}">${b.status}</span></td>
          <td>
            <div class="actions">
              <button class="icon-btn" data-action="toggle" data-id="${b.id}" title="${b.status === "Available" ? "Issue book" : "Return book"}">${b.status === "Available" ? "📤" : "📥"}</button>
              <button class="icon-btn" data-action="edit" data-id="${b.id}" title="Edit">✏️</button>
              <button class="icon-btn del" data-action="delete" data-id="${b.id}" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>`
      )
      .join("");

    emptyState.hidden = list.length > 0;
  }

  function renderStats() {
    const issued = books.filter((b) => b.status === "Issued").length;
    $("statTotal").textContent = books.length;
    $("statIssued").textContent = issued;
    $("statAvailable").textContent = books.length - issued;
    $("statCategories").textContent = new Set(books.map((b) => b.category)).size;
  }

  function renderCategoryFilter() {
    const current = categoryFilter.value || "all";
    const cats = [...new Set(books.map((b) => b.category))].sort();
    categoryFilter.innerHTML =
      `<option value="all">All Categories</option>` +
      cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    categoryFilter.value = cats.includes(current) ? current : "all";
  }

  // ---------- Modal helpers ----------
  function openModal(el) { el.classList.add("open"); el.setAttribute("aria-hidden", "false"); }
  function closeModal(el) { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); }

  function toggleIssuedField() {
    issuedToField.hidden = statusSelect.value !== "Issued";
  }

  function openForm(book) {
    form.reset();
    clearErrors();
    $("bookId").value = book ? book.id : "";
    $("modalTitle").textContent = book ? "Edit Book" : "Add Book";
    $("saveBtn").textContent = book ? "Update Book" : "Save Book";
    if (book) {
      $("title").value = book.title;
      $("author").value = book.author;
      $("isbn").value = book.isbn;
      $("year").value = book.year;
      $("category").value = book.category;
      statusSelect.value = book.status;
      $("issuedTo").value = book.issuedTo || "";
    }
    toggleIssuedField();
    openModal(bookModal);
    setTimeout(() => $("title").focus(), 150);
  }

  // ---------- Validation ----------
  function setError(name, msg) {
    const el = document.querySelector(`.error[data-for="${name}"]`);
    if (!el) return;
    el.textContent = msg;
    el.closest(".field").classList.toggle("invalid", Boolean(msg));
  }
  function clearErrors() {
    document.querySelectorAll(".error").forEach((e) => setError(e.dataset.for, ""));
  }

  function validate(data, editingId) {
    clearErrors();
    let ok = true;
    const fail = (k, m) => { setError(k, m); ok = false; };
    const thisYear = new Date().getFullYear();

    if (data.title.length < 2) fail("title", "Title must be at least 2 characters.");
    if (data.author.length < 2) fail("author", "Author name is required.");
    if (!/^[0-9Xx-]{10,17}$/.test(data.isbn)) fail("isbn", "Enter a valid ISBN (10–13 digits, hyphens allowed).");
    else if (books.some((b) => b.isbn === data.isbn && b.id !== editingId)) fail("isbn", "A book with this ISBN already exists.");
    if (!Number.isInteger(data.year) || data.year < 1000 || data.year > thisYear) fail("year", `Year must be between 1000 and ${thisYear}.`);
    if (data.status === "Issued" && data.issuedTo.length < 2) fail("issuedTo", "Enter the member name for an issued book.");
    return ok;
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg, type = "success") {
    const t = $("toast");
    t.textContent = msg;
    t.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 2600);
  }

  // ---------- Events ----------
  $("addBtn").addEventListener("click", () => openForm(null));
  $("closeModal").addEventListener("click", () => closeModal(bookModal));
  $("cancelBtn").addEventListener("click", () => closeModal(bookModal));
  statusSelect.addEventListener("change", toggleIssuedField);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = $("bookId").value;
    const status = statusSelect.value;
    const data = {
      title: $("title").value.trim(),
      author: $("author").value.trim(),
      isbn: $("isbn").value.trim(),
      year: parseInt($("year").value, 10),
      category: $("category").value,
      status,
      issuedTo: status === "Issued" ? $("issuedTo").value.trim() : "",
    };
    if (!validate(data, id)) return;

    if (id) { updateBook(id, data); toast("Book updated successfully"); }
    else { createBook(data); toast("Book added to the library"); }
    closeModal(bookModal);
    render();
  });

  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const book = books.find((b) => b.id === btn.dataset.id);
    if (!book) return;

    if (btn.dataset.action === "edit") openForm(book);

    if (btn.dataset.action === "delete") {
      deleteId = book.id;
      $("confirmText").textContent = `“${book.title}” will be permanently removed.`;
      openModal(confirmModal);
    }

    if (btn.dataset.action === "toggle") {
      if (book.status === "Available") {
        const member = prompt(`Issue "${book.title}" to which member?`);
        if (member && member.trim().length >= 2) {
          updateBook(book.id, { status: "Issued", issuedTo: member.trim() });
          toast("Book issued");
        } else if (member !== null) {
          toast("Member name is required", "error");
        }
      } else {
        updateBook(book.id, { status: "Available", issuedTo: "" });
        toast("Book returned");
      }
      render();
    }
  });

  $("confirmNo").addEventListener("click", () => closeModal(confirmModal));
  $("confirmYes").addEventListener("click", () => {
    if (deleteId) { deleteBook(deleteId); toast("Book deleted", "error"); }
    deleteId = null;
    closeModal(confirmModal);
    render();
  });

  [searchInput, categoryFilter, statusFilter, sortBy].forEach((el) => el.addEventListener("input", render));

  // Close modals on backdrop click / Escape
  [bookModal, confirmModal].forEach((m) =>
    m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); })
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(bookModal); closeModal(confirmModal); }
  });

  render();
})();
