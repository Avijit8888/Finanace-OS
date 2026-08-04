const transactionManager = {
  currentPage: 1,
  itemsPerPage: 10,
  currentFilters: {},
  editingId: null,
  currentType: 'expense',

  init() {
    this.renderCategoryOptions();
    this.populateCategoryFilter();
    document.getElementById('filterMonth').value = utils.getCurrentMonth();
    document.getElementById('transactionDate').value = utils.getToday();
    this.render();
  },

  renderCategoryOptions() {
    const categories = storage.getCategories() || { income: [], expense: [] };
    const grid = document.getElementById('categoryGrid');
    const type = this.currentType;
    const cats = categories[type] || [];
    
    grid.innerHTML = cats.map(cat => `
      <div class="category-option" data-category="${cat.id}" onclick="transactionManager.selectCategory('${cat.id}')" style="--cat-color:${cat.color}">
        <div class="category-option-icon" style="background:${cat.color}20;color:${cat.color}">
          <i class="fa-solid ${cat.icon}"></i>
        </div>
        <span class="category-option-name">${cat.name}</span>
      </div>
    `).join('');
  },

  selectCategory(id) {
    document.querySelectorAll('#categoryGrid .category-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.category === id);
    });
    document.getElementById('transactionCategory').value = id;
  },

  setType(type) {
    this.currentType = type;
    document.getElementById('transactionType').value = type;
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.type === type);
    });
    this.renderCategoryOptions();
    
    const selected = document.getElementById('transactionCategory').value;
    if (selected) {
      setTimeout(() => this.selectCategory(selected), 0);
    }
  },

  populateCategoryFilter() {
    const categories = storage.getCategories() || { income: [], expense: [] };
    const select = document.getElementById('filterCategory');
    const allCats = [...categories.income, ...categories.expense];
    
    select.innerHTML = '<option value="">All Categories</option>' +
      allCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  },

  showAdd(type) {
    this.editingId = null;
    this.setType(type || 'expense');
    document.getElementById('transactionModalTitle').textContent = type === 'income' ? 'Add Income' : 'Add Expense';
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionId').value = '';
    document.getElementById('transactionDate').value = utils.getToday();
    document.getElementById('transactionCategory').value = '';
    document.querySelectorAll('#categoryGrid .category-option').forEach(el => el.classList.remove('selected'));
    app.openModal('transactionModal');
  },

  showEdit(id) {
    const transactions = storage.getTransactions();
    const t = transactions.find(tx => tx.id === id);
    if (!t) return;

    this.editingId = id;
    this.setType(t.type);
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaction';
    document.getElementById('transactionId').value = t.id;
    document.getElementById('transactionAmount').value = t.amount;
    document.getElementById('transactionDescription').value = t.description;
    document.getElementById('transactionDate').value = t.date;
    document.getElementById('transactionNotes').value = t.notes || '';
    document.getElementById('transactionCategory').value = t.category;
    
    setTimeout(() => this.selectCategory(t.category), 0);
    app.openModal('transactionModal');
  },

  save(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const description = document.getElementById('transactionDescription').value.trim();
    const category = document.getElementById('transactionCategory').value;
    const date = document.getElementById('transactionDate').value;
    const notes = document.getElementById('transactionNotes').value.trim();
    const type = document.getElementById('transactionType').value;

    if (!amount || amount <= 0) {
      app.toast('Please enter a valid amount', 'error');
      return;
    }
    if (!description) {
      app.toast('Please enter a description', 'error');
      return;
    }
    if (!category) {
      app.toast('Please select a category', 'error');
      return;
    }

    const data = {
      type,
      amount,
      description,
      category,
      date,
      notes
    };

    if (this.editingId) {
      storage.updateTransaction(this.editingId, data);
      app.toast('Transaction updated', 'success');
    } else {
      data.id = utils.generateId();
      data.createdAt = new Date().toISOString();
      storage.addTransaction(data);
      app.toast('Transaction added', 'success');
    }

    app.closeModal('transactionModal');
    this.render();
    app.refreshAll();
  },

  delete(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    storage.deleteTransaction(id);
    app.toast('Transaction deleted', 'success');
    this.render();
    app.refreshAll();
  },

  search(query) {
    this.currentFilters.search = query;
    this.currentPage = 1;
    this.render();
  },

  applyFilters() {
    this.currentFilters.type = document.getElementById('filterType').value;
    this.currentFilters.category = document.getElementById('filterCategory').value;
    this.currentFilters.month = document.getElementById('filterMonth').value;
    this.currentPage = 1;
    this.render();
  },

  render() {
    let transactions = storage.getTransactions();
    transactions = utils.filterTransactions(transactions, this.currentFilters);
    transactions = utils.sortTransactions(transactions, 'date', 'desc');

    const totalPages = Math.ceil(transactions.length / this.itemsPerPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const pageItems = transactions.slice(start, start + this.itemsPerPage);

    const tbody = document.getElementById('transactionsTableBody');
    const categories = storage.getCategories() || { income: [], expense: [] };

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-inbox"></i><h3>No transactions found</h3><p>Try adjusting your filters or add a new transaction</p></div></td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(t => {
        const cat = utils.getCategoryById(t.category, categories);
        return `
          <tr>
            <td>${utils.formatDate(t.date)}</td>
            <td>
              <div style="font-weight:600;">${utils.escapeHtml(t.description)}</div>
              ${t.notes ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.125rem;">${utils.escapeHtml(t.notes)}</div>` : ''}
            </td>
            <td>
              <span class="category-badge" style="color:${cat.color};background:${cat.color}15;">
                <i class="fa-solid ${cat.icon}"></i> ${cat.name}
              </span>
            </td>
            <td>
              <span style="text-transform:capitalize;font-weight:600;color:var(--${t.type === 'income' ? 'accent-success' : 'accent-danger'});">
                ${t.type}
              </span>
            </td>
            <td class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${utils.formatCurrency(t.amount)}</td>
            <td>
              <div style="display:flex;gap:0.25rem;">
                <button class="btn btn-icon btn-ghost btn-sm" onclick="transactionManager.showEdit('${t.id}')" title="Edit">
                  <i class="fa-solid fa-pen" style="font-size:0.75rem;"></i>
                </button>
                <button class="btn btn-icon btn-ghost btn-sm" onclick="transactionManager.delete('${t.id}')" title="Delete" style="color:var(--accent-danger);">
                  <i class="fa-solid fa-trash" style="font-size:0.75rem;"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    this.renderPagination(totalPages);
  },

  renderPagination(totalPages) {
    const container = document.getElementById('transactionPagination');
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <button onclick="transactionManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
        html += `<button class="${i === this.currentPage ? 'active' : ''}" onclick="transactionManager.goToPage(${i})">${i}</button>`;
      } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
        html += `<span style="color:var(--text-muted);padding:0 0.5rem;">...</span>`;
      }
    }

    html += `
      <button onclick="transactionManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    container.innerHTML = html;
  },

  goToPage(page) {
    this.currentPage = page;
    this.render();
  }
};
