const goals = {
  savingsChart: null,
  selectedIcon: 'fa-piggy-bank',

  init() {
    this.renderGoals();
    this.renderBudget();
    this.renderSavingsChart();
  },

  showAddGoalModal() {
    document.getElementById('goalForm').reset();
    document.getElementById('goalId').value = '';
    document.getElementById('goalModalTitle').textContent = 'Add Goal';
    document.getElementById('goalIcon').value = 'fa-piggy-bank';
    this.selectIcon(document.querySelector('#goalIconGrid [data-icon="fa-piggy-bank"]'));
    app.openModal('goalModal');
  },

  showEditGoalModal(id) {
    const goal = storage.getGoals().find(g => g.id === id);
    if (!goal) return;

    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalTarget').value = goal.target;
    document.getElementById('goalCurrent').value = goal.current;
    document.getElementById('goalDate').value = goal.date || '';
    document.getElementById('goalIcon').value = goal.icon;
    document.getElementById('goalModalTitle').textContent = 'Edit Goal';

    const iconEl = document.querySelector(`#goalIconGrid [data-icon="${goal.icon}"]`);
    if (iconEl) this.selectIcon(iconEl);
    app.openModal('goalModal');
  },

  selectIcon(el) {
    document.querySelectorAll('#goalIconGrid .category-option').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
    this.selectedIcon = el.dataset.icon;
    document.getElementById('goalIcon').value = this.selectedIcon;
  },

  saveGoal(e) {
    e.preventDefault();
    const id = document.getElementById('goalId').value;
    const name = document.getElementById('goalName').value.trim();
    const target = parseFloat(document.getElementById('goalTarget').value);
    const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
    const date = document.getElementById('goalDate').value;
    const icon = document.getElementById('goalIcon').value;

    if (!name || !target || target <= 0) {
      app.toast('Please fill in all required fields', 'error');
      return;
    }

    const data = { name, target, current, icon, date };

    if (id) {
      storage.updateGoal(id, data);
      app.toast('Goal updated', 'success');
    } else {
      data.id = 'goal_' + Date.now();
      data.createdAt = new Date().toISOString();
      storage.addGoal(data);
      app.toast('Goal created', 'success');
    }

    app.closeModal('goalModal');
    this.renderGoals();
    this.renderSavingsChart();
  },

  deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    storage.deleteGoal(id);
    app.toast('Goal deleted', 'success');
    this.renderGoals();
    this.renderSavingsChart();
  },

  renderGoals() {
    const goalsList = storage.getGoals();
    const container = document.getElementById('goalsContainer');

    if (goalsList.length === 0) {
      container.innerHTML = `<div class="glass-card empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-bullseye"></i><h3>No goals yet</h3><p>Create a savings goal to track your progress</p></div>`;
      return;
    }

    container.innerHTML = goalsList.map(g => {
      const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
      const remaining = Math.max(g.target - g.current, 0);
      let status = 'success';
      if (pct < 30) status = 'danger';
      else if (pct < 70) status = 'warning';

      return `
        <div class="glass-card goal-card">
          <div class="goal-header">
            <div style="display:flex;align-items:center;gap:0.75rem;">
              <div style="width:44px;height:44px;border-radius:var(--radius-md);background:linear-gradient(135deg,var(--accent-primary),var(--accent-secondary));display:flex;align-items:center;justify-content:center;color:white;font-size:1.1rem;">
                <i class="fa-solid ${g.icon}"></i>
              </div>
              <div>
                <div class="goal-title">${app.escapeHtml(g.name)}</div>
                <div style="font-size:0.8rem;color:var(--text-muted);">${g.date ? 'Target: ' + utils.formatDate(g.date) : 'No target date'}</div>
              </div>
            </div>
            <div style="display:flex;gap:0.25rem;">
              <button class="btn btn-icon btn-ghost btn-sm" onclick="goals.showEditGoalModal('${g.id}')" title="Edit">
                <i class="fa-solid fa-pen" style="font-size:0.75rem;"></i>
              </button>
              <button class="btn btn-icon btn-ghost btn-sm" onclick="goals.deleteGoal('${g.id}')" title="Delete" style="color:var(--accent-danger);">
                <i class="fa-solid fa-trash" style="font-size:0.75rem;"></i>
              </button>
            </div>
          </div>
          <div>
            <div class="progress-bar">
              <div class="progress-fill ${status}" style="width:${pct}%"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.875rem;">
              <span style="color:var(--text-secondary);">${pct.toFixed(1)}% complete</span>
              <span style="color:var(--text-muted);">${utils.formatCurrency(remaining)} remaining</span>
            </div>
          </div>
          <div class="goal-amount">
            <span>${utils.formatCurrency(g.current)}</span> <span style="color:var(--text-muted);">/ ${utils.formatCurrency(g.target)}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  showBudgetModal() {
    const budget = storage.getBudget();
    const categories = storage.getCategories() || { expense: [] };
    const container = document.getElementById('budgetFormContainer');
    
    container.innerHTML = (categories.expense || []).map(cat => `
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:0.5rem;">
          <div style="width:24px;height:24px;border-radius:var(--radius-sm);background:${cat.color}20;color:${cat.color};display:flex;align-items:center;justify-content:center;font-size:0.75rem;">
            <i class="fa-solid ${cat.icon}"></i>
          </div>
          ${cat.name}
        </label>
        <input type="number" class="form-input budget-input" data-category="${cat.id}" step="0.01" min="0" placeholder="0.00" value="${budget[cat.id] || ''}">
      </div>
    `).join('');

    app.openModal('budgetModal');
  },

  saveBudget(e) {
    e.preventDefault();
    const inputs = document.querySelectorAll('.budget-input');
    const budget = {};

    inputs.forEach(input => {
      const val = parseFloat(input.value);
      if (val > 0) {
        budget[input.dataset.category] = val;
      }
    });

    storage.setBudget(budget);
    app.toast('Budget saved', 'success');
    app.closeModal('budgetModal');
    this.renderBudget();
    dashboard.renderBudgetOverview();
  },

  renderBudget() {
    const transactions = storage.getTransactions();
    const budget = storage.getBudget();
    const categories = storage.getCategories() || { expense: [] };
    const currentMonth = utils.getCurrentMonth();

    const container = document.getElementById('budgetContainer');
    const expenseCats = categories.expense || [];
    
    const spentByCategory = {};
    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .forEach(t => {
        if (!spentByCategory[t.category]) spentByCategory[t.category] = 0;
        spentByCategory[t.category] += parseFloat(t.amount);
      });

    const items = expenseCats
      .filter(cat => budget[cat.id] > 0)
      .map(cat => {
        const spent = spentByCategory[cat.id] || 0;
        const limit = budget[cat.id] || 0;
        const pct = limit > 0 ? (spent / limit * 100) : 0;
        let status = 'success';
        if (pct > 100) status = 'danger';
        else if (pct > 80) status = 'warning';

        return { ...cat, spent, limit, pct, status };
      })
      .sort((a, b) => b.pct - a.pct);

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wallet"></i><h3>No budget set</h3><p>Click Edit to set your monthly spending limits</p></div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="budget-item" style="margin-bottom:1rem;">
        <div class="budget-item-header">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <div style="width:28px;height:28px;border-radius:var(--radius-sm);background:${item.color}20;color:${item.color};display:flex;align-items:center;justify-content:center;font-size:0.8rem;">
              <i class="fa-solid ${item.icon}"></i>
            </div>
            <span class="budget-item-name">${item.name}</span>
          </div>
          <span class="budget-item-meta">${utils.formatCurrency(item.spent)} / ${utils.formatCurrency(item.limit)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${item.status}" style="width:${Math.min(item.pct, 100)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:0.25rem;font-size:0.75rem;color:var(--text-muted);">
          <span>${item.pct.toFixed(1)}% used</span>
          <span>${item.pct > 100 ? 'Over budget!' : utils.formatCurrency(Math.max(item.limit - item.spent, 0)) + ' left'}</span>
        </div>
      </div>
    `).join('');
  },

  renderSavingsChart() {
    const transactions = storage.getTransactions();
    const months = [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().slice(-6);

    const savingsData = months.map(m => {
      const monthTx = transactions.filter(t => t.date.startsWith(m));
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
      return Math.max(income - expense, 0);
    });

    const labels = months.map(m => {
      const [y, month] = m.split('-');
      return new Date(y, month - 1).toLocaleDateString('en-US', { month: 'short' });
    });

    const ctx = document.getElementById('savingsChart');
    if (!ctx) return;

    utils.destroyChart(this.savingsChart);

    this.savingsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Monthly Savings',
          data: savingsData,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter' } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter' },
              callback: (v) => '$' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v)
            }
          }
        }
      }
    });
  }
};
