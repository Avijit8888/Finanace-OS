const analytics = {
  expensePieChart: null,
  incomeExpenseChart: null,
  categoryTrendChart: null,

  init() {
    document.getElementById('analyticsMonth').value = utils.getCurrentMonth();
    this.render();
  },

  render() {
    this.renderStats();
    this.renderExpensePie();
    this.renderIncomeExpense();
    this.renderCategoryTrend();
    this.renderInsights();
  },

  renderStats() {
    const month = document.getElementById('analyticsMonth').value || utils.getCurrentMonth();
    const transactions = storage.getTransactions().filter(t => t.date.startsWith(month));
    
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const balance = income - expense;
    const count = transactions.length;

    const prevMonth = utils.getPreviousMonth(month);
    const prevTransactions = storage.getTransactions().filter(t => t.date.startsWith(prevMonth));
    const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
    const prevExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

    const container = document.getElementById('analyticsStats');
    container.innerHTML = `
      <div class="glass-card stat-card income">
        <div class="stat-icon income"><i class="fa-solid fa-arrow-down"></i></div>
        <div class="stat-label">Income</div>
        <div class="stat-value">${utils.formatCurrency(income)}</div>
        <div class="stat-change ${income >= prevIncome ? 'positive' : 'negative'}">
          <i class="fa-solid fa-arrow-${income >= prevIncome ? 'up' : 'down'}"></i> 
          ${prevIncome > 0 ? Math.abs(((income - prevIncome) / prevIncome * 100)).toFixed(1) : 0}% vs last month
        </div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon expense"><i class="fa-solid fa-arrow-up"></i></div>
        <div class="stat-label">Expenses</div>
        <div class="stat-value">${utils.formatCurrency(expense)}</div>
        <div class="stat-change ${expense <= prevExpense ? 'positive' : 'negative'}">
          <i class="fa-solid fa-arrow-${expense <= prevExpense ? 'down' : 'up'}"></i> 
          ${prevExpense > 0 ? Math.abs(((expense - prevExpense) / prevExpense * 100)).toFixed(1) : 0}% vs last month
        </div>
      </div>
      <div class="glass-card stat-card">
        <div class="stat-icon balance"><i class="fa-solid fa-scale-balanced"></i></div>
        <div class="stat-label">Balance</div>
        <div class="stat-value">${utils.formatCurrency(balance)}</div>
        <div class="stat-change ${balance >= 0 ? 'positive' : 'negative'}">
          ${balance >= 0 ? 'Surplus' : 'Deficit'}
        </div>
      </div>
      <div class="glass-card stat-card savings">
        <div class="stat-icon savings"><i class="fa-solid fa-list-check"></i></div>
        <div class="stat-label">Transactions</div>
        <div class="stat-value">${count}</div>
        <div class="stat-change">this month</div>
      </div>
    `;
  },

  renderExpensePie() {
    const month = document.getElementById('analyticsMonth').value || utils.getCurrentMonth();
    const transactions = storage.getTransactions().filter(t => t.type === 'expense' && t.date.startsWith(month));
    const categories = storage.getCategories() || { expense: [] };
    const grouped = utils.groupByCategory(transactions, 'expense');

    const labels = [];
    const data = [];
    const bgColors = [];

    Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .forEach(([catId, amount]) => {
        const cat = utils.getCategoryById(catId, categories);
        labels.push(cat.name);
        data.push(amount);
        bgColors.push(cat.color);
      });

    const ctx = document.getElementById('expensePieChart');
    if (!ctx) return;

    utils.destroyChart(this.expensePieChart);

    this.expensePieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors.length > 0 ? bgColors : ['#3b82f6'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 12 }
          }
        }
      }
    });
  },

  renderIncomeExpense() {
    const month = document.getElementById('analyticsMonth').value || utils.getCurrentMonth();
    const transactions = storage.getTransactions().filter(t => t.date.startsWith(month));
    
    const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const incomeData = new Array(daysInMonth).fill(0);
    const expenseData = new Array(daysInMonth).fill(0);

    transactions.forEach(t => {
      const day = parseInt(t.date.split('-')[2]) - 1;
      if (day >= 0 && day < daysInMonth) {
        if (t.type === 'income') incomeData[day] += parseFloat(t.amount);
        else expenseData[day] += parseFloat(t.amount);
      }
    });

    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    utils.destroyChart(this.incomeExpenseChart);

    this.incomeExpenseChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5
          },
          {
            label: 'Expense',
            data: expenseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter' }, callback: (v) => '$' + v } }
        }
      }
    });
  },

  renderCategoryTrend() {
    const transactions = storage.getTransactions();
    const months = [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().slice(-6);
    const categories = storage.getCategories() || { expense: [] };
    const expenseCats = categories.expense.slice(0, 5);

    const datasets = expenseCats.map((cat, idx) => {
      const data = months.map(m => {
        return transactions
          .filter(t => t.type === 'expense' && t.category === cat.id && t.date.startsWith(m))
          .reduce((s, t) => s + parseFloat(t.amount), 0);
      });

      return {
        label: cat.name,
        data,
        borderColor: cat.color,
        backgroundColor: cat.color + '20',
        fill: false,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2
      };
    });

    const labels = months.map(m => {
      const [y, month] = m.split('-');
      return new Date(y, month - 1).toLocaleDateString('en-US', { month: 'short' });
    });

    const ctx = document.getElementById('categoryTrendChart');
    if (!ctx) return;

    utils.destroyChart(this.categoryTrendChart);

    this.categoryTrendChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter' }, callback: (v) => '$' + v } }
        }
      }
    });
  },

  renderInsights() {
    const month = document.getElementById('analyticsMonth').value || utils.getCurrentMonth();
    const transactions = storage.getTransactions().filter(t => t.date.startsWith(month));
    const categories = storage.getCategories() || { expense: [] };
    const budget = storage.getBudget();

    const insights = [];
    const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
    const incomeTotal = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);

    if (expenseTotal > incomeTotal) {
      insights.push({
        icon: 'fa-triangle-exclamation',
        color: '#ef4444',
        title: 'Spending Alert',
        text: `Your expenses (${utils.formatCurrency(expenseTotal)}) exceed your income (${utils.formatCurrency(incomeTotal)}) this month. Consider reviewing your spending.`
      });
    }

    const grouped = utils.groupByCategory(transactions, 'expense');
    const topCategory = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      const cat = utils.getCategoryById(topCategory[0], categories);
      const pct = expenseTotal > 0 ? (topCategory[1] / expenseTotal * 100).toFixed(1) : 0;
      insights.push({
        icon: 'fa-chart-pie',
        color: cat.color,
        title: `Top Spending: ${cat.name}`,
        text: `You spent ${utils.formatCurrency(topCategory[1])} on ${cat.name}, which is ${pct}% of your total expenses this month.`
      });
    }

    const overspent = Object.entries(budget).filter(([catId, limit]) => {
      const spent = transactions.filter(t => t.type === 'expense' && t.category === catId).reduce((s, t) => s + parseFloat(t.amount), 0);
      return spent > limit && limit > 0;
    });

    if (overspent.length > 0) {
      const cat = utils.getCategoryById(overspent[0][0], categories);
      insights.push({
        icon: 'fa-circle-exclamation',
        color: '#f59e0b',
        title: 'Budget Exceeded',
        text: `You've exceeded your ${cat.name} budget. Consider adjusting your spending in this category.`
      });
    }

    if (incomeTotal > 0 && expenseTotal / incomeTotal < 0.5) {
      insights.push({
        icon: 'fa-trophy',
        color: '#10b981',
        title: 'Great Savings!',
        text: `You're saving ${((1 - expenseTotal / incomeTotal) * 100).toFixed(1)}% of your income this month. Keep it up!`
      });
    }

    if (insights.length === 0) {
      insights.push({
        icon: 'fa-lightbulb',
        color: '#3b82f6',
        title: 'Getting Started',
        text: 'Add more transactions to get personalized insights about your spending habits.'
      });
    }

    document.getElementById('insightsContainer').innerHTML = insights.map(i => `
      <div class="insight-card">
        <div class="insight-icon" style="background:${i.color}20;color:${i.color};">
          <i class="fa-solid ${i.icon}"></i>
        </div>
        <div class="insight-content">
          <h4>${i.title}</h4>
          <p>${i.text}</p>
        </div>
      </div>
    `).join('');
  }
};
