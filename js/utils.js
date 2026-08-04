const utils = {
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  },

  formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  },

  formatDateShort(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  },

  formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num || 0);
  },

  getToday() {
    return new Date().toISOString().split('T')[0];
  },

  getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
  },

  getMonthName(dateStr) {
    const date = new Date(dateStr + '-01');
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  },

  getWeekDates() {
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  },

  getDayName(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  },

  getStartOfMonth(dateStr) {
    return dateStr ? dateStr.slice(0, 7) + '-01' : utils.getToday().slice(0, 7) + '-01';
  },

  getEndOfMonth(dateStr) {
    const [year, month] = (dateStr || utils.getToday().slice(0, 7)).split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  },

  getPreviousMonth(dateStr) {
    const [year, month] = (dateStr || utils.getToday().slice(0, 7)).split('-').map(Number);
    const prev = new Date(year, month - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  },

  generateId() {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportCSV() {
    const transactions = storage.getTransactions();
    if (transactions.length === 0) {
      app.toast('No transactions to export', 'warning');
      return;
    }

    const headers = ['id', 'type', 'amount', 'description', 'category', 'date', 'notes', 'createdAt'];
    const rows = transactions.map(t => [
      t.id,
      t.type,
      t.amount,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.category,
      t.date,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
      t.createdAt
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const filename = `financeos_export_${utils.getToday()}.csv`;
    utils.downloadFile(csv, filename, 'text/csv');
    app.toast('Transactions exported successfully', 'success');
  },

  importCSV(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          const row = {};
          headers.forEach((h, idx) => row[h] = values[idx]);
          
          if (row.amount && row.type && row.date) {
            imported.push({
              id: row.id && row.id.startsWith('tx_') ? row.id : utils.generateId(),
              type: row.type,
              amount: parseFloat(row.amount) || 0,
              description: row.description || '',
              category: row.category || 'other_expense',
              date: row.date,
              notes: row.notes || '',
              createdAt: row.createdAt || new Date().toISOString()
            });
          }
        }

        if (imported.length === 0) {
          app.toast('No valid transactions found in file', 'error');
          return;
        }

        const existing = storage.getTransactions();
        const merged = [...existing, ...imported];
        storage.setTransactions(merged);
        
        app.toast(`Imported ${imported.length} transactions`, 'success');
        app.refreshAll();
      } catch (err) {
        app.toast('Failed to import CSV: ' + err.message, 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  },

  confirmClearData() {
    document.getElementById('clearConfirm').value = '';
    app.openModal('clearDataModal');
  },

  executeClearData() {
    const confirm = document.getElementById('clearConfirm').value.trim();
    if (confirm !== 'DELETE') {
      app.toast('Please type DELETE to confirm', 'warning');
      return;
    }
    storage.clearAll();
    app.closeModal('clearDataModal');
    app.toast('All data cleared', 'success');
    app.refreshAll();
  },

  calculateStorageUsed() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2;
      }
    }
    const kb = (total / 1024).toFixed(2);
    return `${kb} KB`;
  },

  getCategoryById(id, categories) {
    const all = [...(categories.income || []), ...(categories.expense || [])];
    return all.find(c => c.id === id) || { name: id, icon: 'fa-circle', color: '#9ca3af' };
  },

  getCategoryColor(id, categories) {
    const cat = utils.getCategoryById(id, categories);
    return cat.color || '#9ca3af';
  },

  getCategoryIcon(id, categories) {
    const cat = utils.getCategoryById(id, categories);
    return cat.icon || 'fa-circle';
  },

  getCategoryName(id, categories) {
    const cat = utils.getCategoryById(id, categories);
    return cat.name || id;
  },

  sortTransactions(transactions, sortBy = 'date', order = 'desc') {
    const sorted = [...transactions];
    sorted.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'date') {
        valA = new Date(valA);
        valB = new Date(valB);
      } else if (sortBy === 'amount') {
        valA = parseFloat(valA);
        valB = parseFloat(valB);
      }
      if (order === 'desc') return valB > valA ? 1 : -1;
      return valA > valB ? 1 : -1;
    });
    return sorted;
  },

  filterTransactions(transactions, filters) {
    return transactions.filter(t => {
      if (filters.type && t.type !== filters.type) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.month && !t.date.startsWith(filters.month)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match = (t.description || '').toLowerCase().includes(q) ||
                      (t.notes || '').toLowerCase().includes(q) ||
                      t.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.startDate && t.date < filters.startDate) return false;
      if (filters.endDate && t.date > filters.endDate) return false;
      return true;
    });
  },

  groupByMonth(transactions) {
    const groups = {};
    transactions.forEach(t => {
      const month = t.date.slice(0, 7);
      if (!groups[month]) groups[month] = { income: 0, expense: 0 };
      groups[month][t.type] += parseFloat(t.amount) || 0;
    });
    return groups;
  },

  groupByCategory(transactions, type) {
    const groups = {};
    transactions.filter(t => t.type === type).forEach(t => {
      if (!groups[t.category]) groups[t.category] = 0;
      groups[t.category] += parseFloat(t.amount) || 0;
    });
    return groups;
  },

  groupByDay(transactions) {
    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = { income: 0, expense: 0 };
      groups[t.date][t.type] += parseFloat(t.amount) || 0;
    });
    return groups;
  },

  calculateTrend(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  },

  getChartColors(count) {
    const colors = [
      '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
      '#14b8a6', '#d946ef', '#8b5cf6', '#f43f5e', '#0ea5e9'
    ];
    return colors.slice(0, count);
  },

  destroyChart(chart) {
    if (chart && typeof chart.destroy === 'function') {
      chart.destroy();
    }
  }
};
