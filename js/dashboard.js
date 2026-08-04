const dashboard = {
  monthlyTrendChart: null,

  init() {
    document.getElementById('dashboardDate').textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.render();
  },

  render() {
    this.renderStats();
    this.renderWeeklyOverview();
    this.renderRecentTransactions();
    this.renderMonthlyTrend();
    this.renderBudgetOverview();
  },

  renderStats() {
    const transactions = storage.getTransactions();
    const currentMonth = utils.getCurrentMonth();
    const prevMonth = utils.getPreviousMonth(currentMonth);

    const currentIncome = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const currentExpense = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const prevIncome = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(prevMonth))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const prevExpense = transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(prevMonth))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const balance = currentIncome - currentExpense;
    const prevBalance = prevIncome - prevExpense;
    const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome * 100) : 0;

    document.getElementById('statIncome').textContent = utils.formatCurrency(currentIncome);
    document.getElementById('statExpense').textContent = utils.formatCurrency(currentExpense);
    document.getElementById('statBalance').textContent = utils.formatCurrency(balance);
    document.getElementById('statSavings').textContent = Math.max(0, savingsRate).toFixed(1) + '%';

    const incomeChange = utils.calculateTrend(currentIncome, prevIncome);
    const expenseChange = utils.calculateTrend(currentExpense, prevExpense);
    const balanceChange = utils.calculateTrend(balance, prevBalance);

    document.getElementById('statIncomeChange').innerHTML = 
      `<i class="fa-solid fa-arrow-${incomeChange >= 0 ? 'up' : 'down'}"></i> ${Math.abs(incomeChange)}% vs last month`;
    document.getElementById('statIncomeChange').className = `stat-change ${incomeChange >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('statExpenseChange').innerHTML = 
      `<i class="fa-solid fa-arrow-${expenseChange >= 0 ? 'up' : 'down'}"></i> ${Math.abs(expenseChange)}% vs last month`;
    document.getElementById('statExpenseChange').className = `stat-change ${expenseChange >= 0 ? 'negative' : 'positive'}`;

    document.getElementById('statBalanceChange').innerHTML = 
      `<i class="fa-solid fa-arrow-${balanceChange >= 0 ? 'up' : 'down'}"></i> ${Math.abs(balanceChange)}% vs last month`;
    document.getElementById('statBalanceChange').className = `stat-change ${balanceChange >= 0 ? 'positive' : 'negative'}`;
  },

  renderWeeklyOverview() {
    const transactions = storage.getTransactions();
    const weekDates = utils.getWeekDates();
    const dayGroups = utils.groupByDay(transactions);

    const container = document.getElementById('weeklyOverview');
    const maxVal = Math.max(...weekDates.map(d => {
      const g = dayGroups[d] || { income: 0, expense: 0 };
      return Math.max(g.income, g.expense);
    }), 1);

    container.innerHTML = weekDates.map(date => {
      const day = dayGroups[date] || { income: 0, expense: 0 };
      const dayName = utils.getDayName(date);
      const incomeHeight = maxVal > 0 ? (day.income / maxVal * 100) : 0;
      const expenseHeight = maxVal > 0 ? (day.expense / maxVal * 100) : 0;

      return `
        <div class="weekly-day">
          <div class="weekly-day-name">${dayName}</div>
          <div class="weekly-day-bar">
            ${day.income > 0 ? `<div class="weekly-day-bar-inner income" style="height:${incomeHeight}%" title="Income: ${utils.formatCurrency(day.income)}"></div>` : ''}
            ${day.expense > 0 ? `<div class="weekly-day-bar-inner expense" style="height:${expenseHeight}%" title="Expense: ${utils.formatCurrency(day.expense)}"></div>` : ''}
          </div>
          <div class="weekly-day-amount">${day.income > 0 || day.expense > 0 ? utils.formatCurrency(day.income - day.expense) : '-'}</div>
        </div>
      `;
    }).join('');
  },

  renderRecentTransactions() {
    const transactions = storage.getTransactions();
    const recent = utils.sortTransactions(transactions, 'date', 'desc').slice(0, 8);
    const categories = storage.getCategories() || { income: [], expense: [] };
    const container = document.getElementById('recentTransactions');

    if (recent.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><h3>No transactions yet</h3><p>Add your first transaction to get started</p></div>`;
      return;
    }

    container.innerHTML = recent.map(t => {
      const cat = utils.getCategoryById(t.category, categories);
      return `
        <div class="transaction-item" onclick="transactionManager.showEdit('${t.id}')" style="cursor:pointer;">
          <div class="transaction-icon" style="background:${cat.color}20;color:${cat.color};">
            <i class="fa-solid ${cat.icon}"></i>
          </div>
          <div class="transaction-info">
            <div class="transaction-title">${app.escapeHtml(t.description)}</div>
            <div class="transaction-meta">${cat.name} &bull; ${utils.formatDateShort(t.date)}</div>
          </div>
          <div class="transaction-amount ${t.type}">
            ${t.type === 'income' ? '+' : '-'}${utils.formatCurrency(t.amount)}
          </div>
        </div>
      `;
    }).join('');
  },

  renderMonthlyTrend() {
    const transactions = storage.getTransactions();
    const monthly = utils.groupByMonth(transactions);
    const months = Object.keys(monthly).sort().slice(-6);

    const labels = months.map(m => {
      const [y, month] = m.split('-');
      return new Date(y, month - 1).toLocaleDateString('en-US', { month: 'short' });
    });
    
    const incomeData = months.map(m => monthly[m].income);
    const expenseData = months.map(m => monthly[m].expense);

    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;

    utils.destroyChart(this.monthlyTrendChart);

    this.monthlyTrendChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          },
          {
            label: 'Expense',
            data: expenseData,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter' } }
          }
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
  },

  renderBudgetOverview() {
    const transactions = storage.getTransactions();
    const budget = storage.getBudget();
    const categories = storage.getCategories() || { expense: [] };
    const currentMonth = utils.getCurrentMonth();

    const container = document.getElementById('budgetOverview');
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
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-chart-pie"></i><h3>No budget set</h3><p>Set up your monthly budget in Goals & Budget</p></div>`;
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="budget-item">
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
      </div>
    `).join('');
  }
};
