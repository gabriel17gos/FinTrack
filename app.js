/**
 * FinTrack - Gestão Financeira Mensal
 * Main JavaScript Controller
 */

// ==========================================================================
// 1. STATE & CONSTANTS DEFINITION
// ==========================================================================
const DEFAULT_CATEGORIES = [

    // DESPESAS
    {
        id: "cat-alimentacao",
        name: "Alimentação",
        icon: "utensils",
        color: "#10b981",
        type: "expense"
    },
    {
        id: "cat-transporte",
        name: "Transporte",
        icon: "car",
        color: "#0ea5e9",
        type: "expense"
    },
    {
        id: "cat-moradia",
        name: "Moradia",
        icon: "home",
        color: "#f59e0b",
        type: "expense"
    },
    {
        id: "cat-lazer",
        name: "Lazer",
        icon: "gamepad",
        color: "#ec4899",
        type: "expense"
    },
    {
        id: "cat-saude",
        name: "Saúde",
        icon: "heart-pulse",
        color: "#ef4444",
        type: "expense"
    },
    {
        id: "cat-outros",
        name: "Outros",
        icon: "shopping-bag",
        color: "#8b5cf6",
        type: "expense"
    },

    // RECEITAS
    {
        id: "cat-salario",
        name: "Salário",
        icon: "banknote",
        color: "#10b981",
        type: "income"
    },
    {
        id: "cat-freelance",
        name: "Freelance",
        icon: "briefcase",
        color: "#22c55e",
        type: "income"
    },
    {
        id: "cat-rendimentos",
        name: "Rendimentos",
        icon: "trending-up",
        color: "#16a34a",
        type: "income"
    },
    {
        id: "cat-receita-outros",
        name: "Outros",
        icon: "wallet",
        color: "#4ade80",
        type: "income"
    }
];

const STANDARD_COLORS = [
    "#10b981", "#0ea5e9", "#f59e0b", "#ec4899", "#ef4444", "#8b5cf6",
    "#14b8a6", "#3b82f6", "#f43f5e", "#84cc16", "#a855f7", "#6366f1"
];

const STANDARD_ICONS = [
    "utensils", "car", "home", "gamepad", "heart-pulse", "shopping-bag",
    "graduation-cap", "plug", "gift", "dumbbell", "plane", "briefcase",
    "credit-card", "wallet", "banknote", "tv", "heart", "shopping-cart",
    "bot", "wifi", "smartphone", "sparkles", "key", "receipt-text"
];

// App State
const state = {
    currentMonth: "", // Format: "YYYY-MM"
    data: {
        months: {},
        categories: []
    },
    activeTab: "dashboard",
    theme: "dark",
    donutChart: null,
    barChart: null,
    evolutionChart: null,
    searchQuery: "",
    filterCategory: "all",
    selectedCategoryColor: STANDARD_COLORS[0],
    selectedCategoryIcon: STANDARD_ICONS[0],
    editingExpenseId: null,
    editingIncomeId: null,
    editingCategoryId: null,
    editingCategoryColor: STANDARD_COLORS[0],
    editingCategoryIcon: STANDARD_ICONS[0],
    evoStartVal: "",
    evoEndVal: "",
    alertThreshold: 0,
    toastTimeout: null,
    expenseSortField: "date",
    expenseSortDir: "desc",
    dashPeriodStart: null,
    dashPeriodEnd: null
};

// Portuguese Month names helper
const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ==========================================================================
// 2. HELPER FUNCTIONS (FORMATTERS & DATES)
// ==========================================================================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function getMonthNameLabel(yearMonthStr) {
    if (!yearMonthStr) return "";
    const [year, month] = yearMonthStr.split("-");
    const monthIndex = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[monthIndex]} de ${year}`;
}

function getFormattedToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function getPreviousMonthStr(yearMonthStr) {
    const [year, month] = yearMonthStr.split("-").map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

function getNextMonthStr(yearMonthStr) {
    const [year, month] = yearMonthStr.split("-").map(Number);
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth === 13) {
        nextMonth = 1;
        nextYear += 1;
    }
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// ==========================================================================
// 3. STORAGE & INITIAL MOCK DATA CREATION
// ==========================================================================
function initLocalStorage() {
    const stored = localStorage.getItem("fintrack_data");
    const DATA_INICIAL = "2026-03";
    const todayStr = getFormattedToday();

    if (stored) {
        state.data = JSON.parse(stored);

        // MIGRAÇÃO DE CATEGORIAS ANTIGAS

        state.data.categories.forEach(category => {
            if (!category.type) {
                category.type = "expense";
            }
        });

        // Ensure default income categories exist
        const incomeCategories = DEFAULT_CATEGORIES.filter(c => c.type === "income");
        incomeCategories.forEach(newCategory => {
            const exists = state.data.categories.some(
                c => c.id === newCategory.id
            );
            if (!exists) {
                state.data.categories.push(newCategory);
            }
        });

        Object.keys(state.data.months).forEach(month => {

            if (!state.data.months[month].incomes) {
                state.data.months[month].incomes = [];
            }

            if (month < DATA_INICIAL) {
                delete state.data.months[month];
            }
        });

        saveToLocalStorage();

        // Ensure categories array is sound
        if (!state.data.categories || state.data.categories.length === 0) {
            state.data.categories = [...DEFAULT_CATEGORIES];
        }

        state.currentMonth = todayStr;

        // Ensure current month exists
        if (!state.data.months[state.currentMonth]) {
            createNewMonth(state.currentMonth);
        }
    } else {
        // Create gorgeous mock data for a clean first load experience
        state.data.categories = [...DEFAULT_CATEGORIES];
        state.currentMonth = todayStr;

        const prevMonthStr = getPreviousMonthStr(todayStr);

        // Populate previous month mock
        state.data.months[prevMonthStr] = {
            monthId: prevMonthStr,
            budget: 4500.00,
            expenses: [
                { id: "mock-1", description: "Aluguel Apartamento", amount: 1500.00, categoryId: "cat-moradia", date: `${prevMonthStr}-05` },
                { id: "mock-2", description: "Supermercado Carrefour", amount: 680.50, categoryId: "cat-alimentacao", date: `${prevMonthStr}-10` },
                { id: "mock-3", description: "Combustível Carro", amount: 220.00, categoryId: "cat-transporte", date: `${prevMonthStr}-12` },
                { id: "mock-4", description: "Jantar Especial + Cinema", amount: 180.00, categoryId: "cat-lazer", date: `${prevMonthStr}-15` },
                { id: "mock-5", description: "Consulta Pediátrica", amount: 150.00, categoryId: "cat-saude", date: `${prevMonthStr}-18` },
                { id: "mock-6", description: "Mensalidade Academia", amount: 110.00, categoryId: "cat-outros", date: `${prevMonthStr}-20` },
                { id: "mock-7", description: "Uber p/ Aeroporto", amount: 65.00, categoryId: "cat-transporte", date: `${prevMonthStr}-25` }
            ]
        };

        // Populate current month mock
        state.data.months[state.currentMonth] = {
            monthId: state.currentMonth,
            budget: 5000.00,
            expenses: [
                { id: "mock-8", description: "Aluguel Apartamento", amount: 1500.00, categoryId: "cat-moradia", date: `${state.currentMonth}-05` },
                { id: "mock-9", description: "Feira Orgânica e Sacolão", amount: 480.00, categoryId: "cat-alimentacao", date: `${state.currentMonth}-08` },
                { id: "mock-10", description: "Supermercado BH", amount: 520.40, categoryId: "cat-alimentacao", date: `${state.currentMonth}-12` },
                { id: "mock-11", description: "Gasolina Posto Shell", amount: 280.00, categoryId: "cat-transporte", date: `${state.currentMonth}-15` },
                { id: "mock-12", description: "Assinatura Netflix", amount: 55.90, categoryId: "cat-lazer", date: `${state.currentMonth}-16` },
                { id: "mock-13", description: "Remédios Farmácia Drogal", amount: 85.30, categoryId: "cat-saude", date: `${state.currentMonth}-18` },
                { id: "mock-14", description: "Presente de Aniversário Mãe", amount: 150.00, categoryId: "cat-outros", date: `${state.currentMonth}-22` },
                { id: "mock-15", description: "Jantar com Amigos Hamburgueria", amount: 120.00, categoryId: "cat-lazer", date: `${state.currentMonth}-24` }
            ],
            incomes: [
                { id: "mock-inc-1", description: "Salário Mensal", amount: 5000.00, categoryId: "cat-salario", date: `${state.currentMonth}-05` },
                { id: "mock-inc-2", description: "Freelance Design", amount: 1200.00, categoryId: "cat-freelance", date: `${state.currentMonth}-15` }
            ]
        };

        // Add incomes to previous month mock too
        state.data.months[prevMonthStr].incomes = [
            { id: "mock-inc-3", description: "Salário Mensal", amount: 4800.00, categoryId: "cat-salario", date: `${prevMonthStr}-05` },
            { id: "mock-inc-4", description: "Rendimento Investimentos", amount: 320.00, categoryId: "cat-rendimentos", date: `${prevMonthStr}-20` }
        ];

        saveToLocalStorage();
    }

    // Load alert threshold
    loadAlertThreshold();

    // Init keyboard shortcuts
    initKeyboardShortcuts();

    // Load active theme
    const activeTheme = localStorage.getItem("fintrack_theme") || "dark";
    setTheme(activeTheme);
}

function saveToLocalStorage() {
    localStorage.setItem("fintrack_data", JSON.stringify(state.data));
}

function createNewMonth(monthStr) {
    // Smart Inheritance: check previous month for settings
    const prevMonthStr = getPreviousMonthStr(monthStr);
    let inheritedBudget = 5000.00; // Default fallback
    let inheritedRecurringExpenses = [];

    if (state.data.months[prevMonthStr]) {
        inheritedBudget = state.data.months[prevMonthStr].budget;

        // Filter recurring expenses from previous month
        const prevExpenses = state.data.months[prevMonthStr].expenses || [];
        inheritedRecurringExpenses = prevExpenses
            .filter(exp => exp.isRecurring === true)
            .map(exp => {
                // Calculate new date: preserve the day if possible, or fallback to 1st
                let dayStr = "01";
                if (exp.date && exp.date.length >= 10) {
                    const parts = exp.date.split("-");
                    if (parts.length === 3) {
                        dayStr = parts[2];
                    }
                }

                // Ensure valid day for the new month (e.g. Feb 31 -> Feb 28)
                const [year, month] = monthStr.split("-").map(Number);
                const day = Math.min(Number(dayStr), new Date(year, month, 0).getDate());
                const formattedDay = String(day).padStart(2, "0");

                return {
                    id: "exp-" + Date.now() + Math.random().toString(36).substr(2, 5),
                    description: exp.description,
                    amount: exp.amount,
                    categoryId: exp.categoryId,
                    date: `${monthStr}-${formattedDay}`,
                    isRecurring: true
                };
            });
    }

    state.data.months[monthStr] = {
        monthId: monthStr,
        budget: inheritedBudget,
        expenses: inheritedRecurringExpenses,
        incomes: []
    };

    saveToLocalStorage();
}

/**
 * Propagates a recurring expense to all future months that already exist
 * in localStorage but were created before the recurrence flag was set.
 * Also adds it to months that don't yet exist (they'll get it via createNewMonth too).
 */
function propagateRecurringToFutureMonths(expense, fromMonthStr) {
    // Collect all month keys that are strictly after fromMonthStr, sorted ascending
    const futureMonths = Object.keys(state.data.months)
        .filter(m => m > fromMonthStr)
        .sort();

    futureMonths.forEach(monthKey => {
        const monthData = state.data.months[monthKey];

        // Check if this recurring expense already exists in this month
        // (matched by description + categoryId + isRecurring to avoid duplicates)
        const alreadyExists = monthData.expenses.some(
            exp => exp.isRecurring === true &&
                exp.description === expense.description &&
                exp.categoryId === expense.categoryId
        );

        if (!alreadyExists) {
            // Preserve day of the month if possible
            let dayStr = "01";
            if (expense.date && expense.date.length >= 10) {
                const parts = expense.date.split("-");
                if (parts.length === 3) dayStr = parts[2];
            }
            const [year, month] = monthKey.split("-").map(Number);
            const day = Math.min(Number(dayStr), new Date(year, month, 0).getDate());
            const formattedDay = String(day).padStart(2, "0");

            monthData.expenses.push({
                id: "exp-" + Date.now() + Math.random().toString(36).substr(2, 5),
                description: expense.description,
                amount: expense.amount,
                categoryId: expense.categoryId,
                date: `${monthKey}-${formattedDay}`,
                isRecurring: true
            });
        }
    });
}

// ==========================================================================
// 4. METRICS COMPUTATION ENGINE
// ==========================================================================
function getMonthData(monthStr) {
    if (!state.data.months[monthStr]) {
        createNewMonth(monthStr);
    }
    return state.data.months[monthStr];
}

function calculateMonthMetrics(monthStr) {
    const monthData = getMonthData(monthStr);
    const budget = monthData.budget; // mantido para compatibilidade de dados

    const totalSpent =
        monthData.expenses.reduce(
            (sum, item) => sum + item.amount,
            0
        );

    const totalIncome =
        (monthData.incomes || []).reduce(
            (sum, item) => sum + item.amount,
            0
        );

    const balance = totalIncome - totalSpent;

    // % baseado em quanto das receitas foi gasto
    let percentageUsed = 0;
    if (totalIncome > 0) {
        percentageUsed = Math.round((totalSpent / totalIncome) * 100);
    }

    return {
        budget,
        totalSpent,
        totalIncome,
        balance,
        percentageUsed,
        expensesCount: monthData.expenses.length,
        incomesCount: (monthData.incomes || []).length
    };
}

// ==========================================================================
// 5. VIEW RENDERING CONTROLLERS
// ==========================================================================

// Global DOM updater
function refreshUI() {
    const metrics = calculateMonthMetrics(state.currentMonth);

    // 1. Update Core Header Displays
    document.getElementById("currentMonthDisplay").textContent = getMonthNameLabel(state.currentMonth);

    // 2. Update Top Metric Cards
    document.getElementById("spentCardValue").textContent = formatCurrency(metrics.totalSpent);
    document.getElementById("spentCountLabel").textContent = `${metrics.expensesCount} gasto(s) cadastrado(s)`;
    document.getElementById("incomeCardValue").textContent = formatCurrency(metrics.totalIncome);
    document.getElementById("incomeCountLabel").textContent = `${metrics.incomesCount} receita(s) cadastrada(s)`;

    const balanceCardValue = document.getElementById("balanceCardValue");
    balanceCardValue.textContent = formatCurrency(metrics.balance);

    const balanceCard = document.getElementById("balanceCard");
    const balanceStatusText = document.getElementById("balanceStatusText");

    if (metrics.balance < 0) {
        balanceCard.style.setProperty("--card-accent", "var(--color-danger)");
        balanceCard.style.setProperty("--icon-color-rgb", "var(--color-danger-rgb)");
        balanceStatusText.textContent = "Gastou mais do que ganhou!";
        balanceStatusText.className = "metric-change negative";
    } else if (metrics.totalIncome === 0) {
        balanceCard.style.setProperty("--card-accent", "var(--color-warning)");
        balanceCard.style.setProperty("--icon-color-rgb", "var(--color-warning-rgb)");
        balanceStatusText.textContent = "Nenhuma receita registrada";
        balanceStatusText.className = "metric-change";
    } else {
        balanceCard.style.setProperty("--card-accent", "var(--color-success)");
        balanceCard.style.setProperty("--icon-color-rgb", "var(--color-success-rgb)");
        balanceStatusText.textContent = "Saldo positivo no mês";
        balanceStatusText.className = "metric-change positive";
    }

    // Progress Card
    document.getElementById("percentageCardValue").textContent = `${metrics.percentageUsed}%`;
    document.getElementById("progressPercentageText").textContent = `${metrics.percentageUsed}%`;

    const percentageStatusText = document.getElementById("percentageStatusText");
    const progressFill = document.getElementById("circularProgressFill");

    // SVG Circular Progress calculation
    // R = 36 -> Circumference = 2 * PI * 36 ≈ 226
    const circumference = 226;
    let offset = circumference;

    if (metrics.percentageUsed >= 100) {
        offset = 0;
        percentageStatusText.textContent = "Receita totalmente gasta!";
        percentageStatusText.className = "metric-change negative";
        progressFill.style.setProperty("--progress-color", "var(--color-danger)");
    } else if (metrics.percentageUsed > 85) {
        offset = circumference - (circumference * metrics.percentageUsed) / 100;
        percentageStatusText.textContent = "Quase no limite!";
        percentageStatusText.className = "metric-change negative";
        progressFill.style.setProperty("--progress-color", "var(--color-warning)");
    } else if (metrics.totalIncome === 0) {
        offset = circumference;
        percentageStatusText.textContent = "Sem receitas registradas";
        percentageStatusText.className = "metric-change";
        progressFill.style.setProperty("--progress-color", "var(--color-info)");
    } else {
        offset = circumference - (circumference * metrics.percentageUsed) / 100;
        percentageStatusText.textContent = "Excelente controle";
        percentageStatusText.className = "metric-change positive";
        progressFill.style.setProperty("--progress-color", "var(--color-info)");
    }

    // Apply SVG stroke-dashoffset transition
    progressFill.style.strokeDashoffset = offset;

    // 3. Tab Routing / Navigation displays
    document.querySelectorAll(".tab-content").forEach(el => el.style.display = "none");

    if (state.activeTab === "dashboard") {
        document.getElementById("dashboardTab").style.display = "block";
        document.getElementById("pageTitle").textContent = "Visão Geral das Finanças";
        document.getElementById("pageSubtitle").textContent = "Painel de controle financeiro reativo e detalhado.";
        renderDashboard();
    } else if (state.activeTab === "comparison") {
        document.getElementById("comparisonTab").style.display = "block";
        document.getElementById("pageTitle").textContent = "Comparação Mensal";
        document.getElementById("pageSubtitle").textContent = "Analise o desempenho de economia entre períodos.";
        renderComparison();
    } else if (state.activeTab === "categories") {
        document.getElementById("categoriesTab").style.display = "block";
        document.getElementById("pageTitle").textContent = "Gerenciar Categorias";
        document.getElementById("pageSubtitle").textContent = "Adicione, edite ou altere as marcações dos seus gastos.";
        renderCategoriesManager();
    } else if (state.activeTab === "evolution") {
        document.getElementById("evolutionTab").style.display = "block";
        document.getElementById("pageTitle").textContent = "Evolução Histórica";
        document.getElementById("pageSubtitle").textContent = "Monitore seu progresso de orçamento, gastos e saldo ao longo do tempo.";
        renderEvolution();
    }

    // Check spending alert
    checkSpendingAlert();

    // Refresh SVG icons rendered by Lucide
    lucide.createIcons();
}

// ==========================================================================
// DASHBOARD PERIOD FILTER
// ==========================================================================

function initDashboardPeriodFilter() {
    const monthKeys = Object.keys(state.data.months).sort((a, b) => a.localeCompare(b));
    const selectStart = document.getElementById("dashStartMonth");
    const selectEnd = document.getElementById("dashEndMonth");
    if (!selectStart || !selectEnd) return;

    // Rebuild only when month count changes to avoid resetting user selection
    if (selectStart.options.length !== monthKeys.length) {
        selectStart.innerHTML = "";
        selectEnd.innerHTML = "";

        monthKeys.forEach(mKey => {
            const label = getMonthNameLabel(mKey);
            const optS = document.createElement("option");
            optS.value = mKey;
            optS.textContent = label;
            selectStart.appendChild(optS);

            const optE = document.createElement("option");
            optE.value = mKey;
            optE.textContent = label;
            selectEnd.appendChild(optE);
        });

        selectStart.onchange = () => applyDashboardPeriod();
        selectEnd.onchange = () => applyDashboardPeriod();
    }

    // Always sync values from state
    selectStart.value = state.dashPeriodStart || state.currentMonth;
    selectEnd.value = state.dashPeriodEnd || state.currentMonth;
}

function applyDashboardPeriod() {
    const start = document.getElementById("dashStartMonth").value;
    const end = document.getElementById("dashEndMonth").value;

    if (start > end) {
        showToast("Período inválido", "O mês inicial não pode ser maior que o mês final.", "warning");
        return;
    }

    state.dashPeriodStart = start;
    state.dashPeriodEnd = end;

    const label = document.getElementById("dashPeriodActiveLabel");
    if (label) {
        label.style.display = "inline-flex";
        label.style.alignItems = "center";
        label.textContent = start === end
            ? `📅 ${getMonthNameLabel(start)}`
            : `📅 ${getMonthNameLabel(start)} → ${getMonthNameLabel(end)}`;
    }

    // Highlight active filter selects
    const selStart = document.getElementById("dashStartMonth");
    const selEnd = document.getElementById("dashEndMonth");
    if (selStart) selStart.style.borderColor = "var(--color-primary)";
    if (selEnd) selEnd.style.borderColor = "var(--color-primary)";

    // Show/hide period summary vs percentage card
    const isMultiMonth = start !== end;
    const pctCard = document.getElementById("percentageCard");
    const periodCard = document.getElementById("periodSummaryCard");

    if (isMultiMonth && pctCard && periodCard) {
        pctCard.style.display = "none";
        periodCard.style.display = "flex";

        // Calculate period totals
        const periodMonths = getDashboardPeriodMonths();
        let totalIncome = 0, totalSpent = 0;
        periodMonths.forEach(mKey => {
            const m = calculateMonthMetrics(mKey);
            totalIncome += m.totalIncome;
            totalSpent += m.totalSpent;
        });
        const balance = totalIncome - totalSpent;
        const summaryVal = document.getElementById("periodSummaryValue");
        const summaryLabel = document.getElementById("periodSummaryLabel");
        if (summaryVal) summaryVal.textContent = formatCurrency(balance);
        if (summaryLabel) {
            const months = periodMonths.length;
            summaryLabel.textContent = `em ${months} mês(es)`;
            summaryLabel.className = balance >= 0 ? "metric-change positive" : "metric-change negative";
        }
        periodCard.style.setProperty("--card-accent", balance >= 0 ? "var(--color-success)" : "var(--color-danger)");
    } else if (pctCard && periodCard) {
        pctCard.style.display = "flex";
        periodCard.style.display = "none";
    }

    renderDashboard();
}

function clearDashboardPeriod() {
    state.dashPeriodStart = null;
    state.dashPeriodEnd = null;

    const label = document.getElementById("dashPeriodActiveLabel");
    if (label) label.style.display = "none";

    // Reset select highlights
    const selStart = document.getElementById("dashStartMonth");
    const selEnd = document.getElementById("dashEndMonth");
    if (selStart) selStart.style.borderColor = "";
    if (selEnd) selEnd.style.borderColor = "";

    // Force selects to reset to current month
    if (selStart) selStart.value = state.currentMonth;
    if (selEnd) selEnd.value = state.currentMonth;

    // Reset top cards to current month values immediately
    const metrics = calculateMonthMetrics(state.currentMonth);
    document.getElementById("spentCardValue").textContent = formatCurrency(metrics.totalSpent);
    document.getElementById("spentCountLabel").textContent = `${metrics.expensesCount} gasto(s) cadastrado(s)`;
    document.getElementById("incomeCardValue").textContent = formatCurrency(metrics.totalIncome);
    document.getElementById("incomeCountLabel").textContent = `${metrics.incomesCount} receita(s) cadastrada(s)`;
    document.getElementById("balanceCardValue").textContent = formatCurrency(metrics.balance);

    // Restore percentage card
    const pctCard = document.getElementById("percentageCard");
    const periodCard = document.getElementById("periodSummaryCard");
    if (pctCard) pctCard.style.display = "flex";
    if (periodCard) periodCard.style.display = "none";

    renderDashboard();
}

function getDashboardPeriodMonths() {
    if (!state.dashPeriodStart || !state.dashPeriodEnd) {
        return [state.currentMonth];
    }
    return Object.keys(state.data.months)
        .filter(m => m >= state.dashPeriodStart && m <= state.dashPeriodEnd)
        .sort((a, b) => a.localeCompare(b));
}

// --------------------------------------------------------------------------
// RENDER: DASHBOARD VIEW
// --------------------------------------------------------------------------
function renderDashboard() {
    initDashboardPeriodFilter();
    const periodMonths = getDashboardPeriodMonths();

    // Aggregate data across all period months
    let expenses = [];
    let allIncomes = [];
    periodMonths.forEach(mKey => {
        const mData = getMonthData(mKey);
        expenses = expenses.concat((mData.expenses || []).map(e => ({ ...e, _month: mKey })));
        allIncomes = allIncomes.concat((mData.incomes || []).map(i => ({ ...i, _month: mKey })));
    });

    const monthData = getMonthData(state.currentMonth);

    // 1. Group expenses by category
    const categoryTotals = {};
    state.data.categories.forEach(cat => {
        categoryTotals[cat.id] = {
            category: cat,
            total: 0,
            count: 0
        };
    });

    let uncategorizedAmount = 0;
    expenses.forEach(exp => {
        if (categoryTotals[exp.categoryId]) {
            categoryTotals[exp.categoryId].total += exp.amount;
            categoryTotals[exp.categoryId].count++;
        } else {
            uncategorizedAmount += exp.amount;
        }
    });

    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = allIncomes.reduce((sum, item) => sum + item.amount, 0);

    // Update top cards with period totals if period is active
    if (state.dashPeriodStart && state.dashPeriodEnd && state.dashPeriodStart !== state.dashPeriodEnd) {
        document.getElementById("spentCardValue").textContent = formatCurrency(totalSpent);
        document.getElementById("spentCountLabel").textContent = `${expenses.length} gasto(s) no período`;
        document.getElementById("incomeCardValue").textContent = formatCurrency(totalIncome);
        document.getElementById("incomeCountLabel").textContent = `${allIncomes.length} receita(s) no período`;
        const balance = totalIncome - totalSpent;
        document.getElementById("balanceCardValue").textContent = formatCurrency(balance);
    }

    // 2. Render Mini Cards Grid at left side
    const miniGrid = document.getElementById("categoriesMiniGrid");
    miniGrid.innerHTML = "";

    const activeCategories = state.data.categories
        .map(cat => ({
            ...cat,
            total: categoryTotals[cat.id]?.total || 0,
            count: categoryTotals[cat.id]?.count || 0
        }))
        .filter(c => c.total > 0) // ensure at least some show up
        .slice(0, 4); // show top 4

    activeCategories.forEach(cat => {
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "99, 102, 241";
        };

        const card = document.createElement("div");
        card.className = "category-preview-card";
        card.style.setProperty("--cat-color", cat.color);
        card.style.setProperty("--cat-color-rgb", hexToRgb(cat.color));
        card.onclick = () => {
            document.getElementById("filterCategorySelect").value = cat.id;
            state.filterCategory = cat.id;
            renderExpensesListTable();
        };

        card.innerHTML = `
            <div class="category-preview-icon">
                <i data-lucide="${cat.icon}"></i>
            </div>
            <div class="category-preview-info">
                <span class="category-preview-name">${cat.name}</span>
                <span class="category-preview-value">${formatCurrency(cat.total)}</span>
            </div>
        `;
        miniGrid.appendChild(card);
    });

    // 3. Render Expenses Table List (with instant filter & search applied)
    renderExpensesListTable();

    // 4. Render Incomes Table
    renderIncomesListTable();

    // 5. Render Donut Chart & Category Breakdown Progress List
    renderDonutChart(categoryTotals, totalSpent);

    // 6. Render Savings Goal
    renderSavingsGoal();
}

function handleExpenseSort(field) {
    if (state.expenseSortField === field) {
        state.expenseSortDir = state.expenseSortDir === "asc" ? "desc" : "asc";
    } else {
        state.expenseSortField = field;
        state.expenseSortDir = field === "amount" ? "desc" : "asc";
    }
    updateSortIcons();
    renderExpensesListTable();
}

function updateSortIcons() {
    const fields = ["description", "category", "date", "amount"];
    fields.forEach(f => {
        const el = document.getElementById(`sort-icon-${f}`);
        if (!el) return;
        if (f === state.expenseSortField) {
            el.textContent = state.expenseSortDir === "asc" ? "↑" : "↓";
            el.style.color = "var(--color-primary)";
            el.style.opacity = "1";
        } else {
            el.textContent = "↕";
            el.style.color = "";
            el.style.opacity = "0.3";
        }
    });
}

function renderExpensesListTable() {
    const periodMonths = getDashboardPeriodMonths();
    let expenses = [];
    periodMonths.forEach(mKey => {
        const mData = getMonthData(mKey);
        expenses = expenses.concat([...(mData.expenses || [])]);
    });

    // Sort expenses by selected field
    expenses.sort((a, b) => {
        const dir = state.expenseSortDir === "asc" ? 1 : -1;
        if (state.expenseSortField === "amount") {
            return (a.amount - b.amount) * dir;
        } else if (state.expenseSortField === "category") {
            const catA = state.data.categories.find(c => c.id === a.categoryId)?.name || "";
            const catB = state.data.categories.find(c => c.id === b.categoryId)?.name || "";
            return catA.localeCompare(catB) * dir;
        } else if (state.expenseSortField === "description") {
            return a.description.localeCompare(b.description) * dir;
        } else {
            return (a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) * dir;
        }
    });
    updateSortIcons();

    // Apply category filter
    if (state.filterCategory !== "all") {
        expenses = expenses.filter(exp => exp.categoryId === state.filterCategory);
    }

    // Apply search query
    if (state.searchQuery.trim() !== "") {
        const query = state.searchQuery.toLowerCase().trim();
        expenses = expenses.filter(exp => exp.description.toLowerCase().includes(query));
    }

    const tbody = document.getElementById("expensesTableBody");
    const emptyState = document.getElementById("expensesEmptyState");
    const filterLabel = document.getElementById("expensesFilteredCount");

    tbody.innerHTML = "";

    if (expenses.length === 0) {
        emptyState.style.display = "flex";
        filterLabel.textContent = "Nenhum resultado";
    } else {
        emptyState.style.display = "none";
        filterLabel.textContent = `Mostrando ${expenses.length} item(ns)`;

        expenses.forEach(exp => {
            const cat = state.data.categories.find(c => c.id === exp.categoryId) || { name: "Outros", color: "#8b5cf6", icon: "shopping-bag" };
            const formattedDate = exp.date.split("-").reverse().join("/"); // YYYY-MM-DD -> DD/MM/YYYY

            const tr = document.createElement("tr");
            const recurringIcon = exp.isRecurring
                ? `<i data-lucide="repeat" style="width: 12px; height: 12px; color: var(--color-primary); margin-left: 6px; display: inline-block;" title="Despesa Recorrente Fixa"></i>`
                : '';
            tr.innerHTML = `
                <td>
                    <div class="expense-row-description" style="display: flex; align-items: center; gap: 4px;">
                        ${exp.description} ${recurringIcon}
                    </div>
                </td>
                <td>
                    <span class="expense-category-pill" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}3f;">
                        <i data-lucide="${cat.icon}" style="width: 13px; height: 13px;"></i>
                        ${cat.name}
                    </span>
                </td>
                <td>
                    <span class="expense-row-date">${formattedDate}</span>
                </td>
                <td class="expense-row-amount">
                    ${formatCurrency(exp.amount)}
                </td>
                <td class="expense-actions-cell">
                    <button class="btn-edit-expense" onclick="duplicateExpense('${exp.id}')" title="Duplicar Despesa" style="color: var(--color-info);">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="btn-edit-expense" onclick="openEditExpenseModal('${exp.id}')" title="Editar Despesa">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="btn-delete-expense" onclick="handleDeleteExpense('${exp.id}')" title="Excluir Transação">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    lucide.createIcons();
}

function renderIncomesListTable() {
    const periodMonths = getDashboardPeriodMonths();
    let incomes = [];
    periodMonths.forEach(mKey => {
        const mData = getMonthData(mKey);
        incomes = incomes.concat([...(mData.incomes || [])]);
    });
    incomes.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const tbody = document.getElementById("incomesTableBody");
    const emptyState = document.getElementById("incomesEmptyState");
    const filterLabel = document.getElementById("incomesFilteredCount");

    tbody.innerHTML = "";

    if (incomes.length === 0) {
        emptyState.style.display = "flex";
        filterLabel.textContent = "Nenhuma receita";
    } else {
        emptyState.style.display = "none";
        filterLabel.textContent = `${incomes.length} receita(s) no mês`;

        incomes.forEach(inc => {
            const cat = state.data.categories.find(c => c.id === inc.categoryId)
                || { name: "Outros", color: "#10b981", icon: "wallet" };
            const formattedDate = inc.date.split("-").reverse().join("/");

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div class="expense-row-description">${inc.description}</div>
                </td>
                <td>
                    <span class="expense-category-pill" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}3f;">
                        <i data-lucide="${cat.icon}" style="width: 13px; height: 13px;"></i>
                        ${cat.name}
                    </span>
                </td>
                <td>
                    <span class="expense-row-date">${formattedDate}</span>
                </td>
                <td class="expense-row-amount positive-amount">
                    +${formatCurrency(inc.amount)}
                </td>
                <td class="expense-actions-cell">
                    <button class="btn-edit-expense" onclick="openEditIncomeModal('${inc.id}')" title="Editar Receita">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="btn-delete-expense" onclick="handleDeleteIncome('${inc.id}')" title="Excluir Receita">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    lucide.createIcons();
}

function renderDonutChart(categoryTotals, totalSpent) {
    const chartPanelEmptyState = document.getElementById("chartEmptyState");
    const canvas = document.getElementById("expensesDonutChart");
    const breakdownList = document.getElementById("categoryBreakdownList");

    breakdownList.innerHTML = "";

    const chartLabels = [];
    const chartData = [];
    const chartColors = [];

    // Sort categories by expenditure (descending)
    const sortedCategories = state.data.categories
        .map(cat => ({
            ...cat,
            total: categoryTotals[cat.id]?.total || 0,
            pct: totalSpent > 0 ? Math.round((categoryTotals[cat.id]?.total || 0) / totalSpent * 100) : 0
        }))
        .sort((a, b) => b.total - a.total);

    const spenders = sortedCategories.filter(c => c.total > 0);

    if (spenders.length === 0) {
        chartPanelEmptyState.style.display = "flex";
        if (state.donutChart) {
            state.donutChart.destroy();
            state.donutChart = null;
        }
    } else {
        chartPanelEmptyState.style.display = "none";

        spenders.forEach(cat => {
            chartLabels.push(cat.name);
            chartData.push(cat.total);
            chartColors.push(cat.color);
        });

        // Chart.js rendering
        if (state.donutChart) {
            state.donutChart.destroy();
        }

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const gridColor = isDark ? "#ffffff22" : "#00000022";
        const textColor = isDark ? "#f8fafc" : "#0f172a";

        state.donutChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#111827' : '#ffffff',
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 400 },
                plugins: {
                    legend: {
                        display: false // hide default legend since we build our custom responsive interactive legend!
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const val = context.parsed;
                                const pct = Math.round((val / totalSpent) * 100);
                                return `  ${context.label}: ${formatCurrency(val)} (${pct}%)`;
                            }
                        },
                        padding: 12,
                        cornerRadius: 10,
                        usePointStyle: true,
                        font: {
                            family: 'Outfit'
                        }
                    }
                },
                cutout: '75%'
            }
        });
    }

    // Render textual detail categories list
    sortedCategories.forEach(cat => {
        // Show all categories in list, or just top ones, let's show all that have transactions or are standard
        if (cat.total > 0) {
            const item = document.createElement("div");
            item.className = "category-breakdown-item";

            item.innerHTML = `
                <div class="category-breakdown-header">
                    <span class="category-breakdown-name-pill">
                        <span class="category-dot" style="background: ${cat.color}; box-shadow: 0 0 6px ${cat.color}af;"></span>
                        ${cat.name}
                    </span>
                    <div class="category-breakdown-value-wrapper">
                        <span>${formatCurrency(cat.total)}</span>
                        <span class="category-breakdown-pct">${cat.pct}%</span>
                    </div>
                </div>
                <div class="progressbar-track">
                    <div class="progressbar-fill" style="width: ${cat.pct}%; background: ${cat.color}"></div>
                </div>
            `;
            breakdownList.appendChild(item);
        }
    });
}

// --------------------------------------------------------------------------
// RENDER: PERIOD COMPARISON VIEW
// --------------------------------------------------------------------------
function renderComparison() {
    const selectA = document.getElementById("compMonthASelect");
    const selectB = document.getElementById("compMonthBSelect");

    // Get all sorted available months from history
    const monthsKeys = Object.keys(state.data.months).sort((a, b) => b.localeCompare(a));

    // If we only have 1 month, create the previous one automatically so comparison works beautifully!
    if (monthsKeys.length < 2) {
        const prev = getPreviousMonthStr(state.currentMonth);
        createNewMonth(prev);
        monthsKeys.push(prev);
        monthsKeys.sort((a, b) => b.localeCompare(a));
    }

    // Repopulate select options
    const valA = selectA.value || state.currentMonth || monthsKeys[1] || monthsKeys[0];
    const valB = selectB.value || getPreviousMonthStr(state.currentMonth) || monthsKeys[0];

    selectA.innerHTML = "";
    selectB.innerHTML = "";

    monthsKeys.forEach(mKey => {
        const optionText = getMonthNameLabel(mKey);

        const optA = document.createElement("option");
        optA.value = mKey;
        optA.textContent = optionText;
        if (mKey === valA) optA.selected = true;
        selectA.appendChild(optA);

        const optB = document.createElement("option");
        optB.value = mKey;
        optB.textContent = optionText;
        if (mKey === valB) optB.selected = true;
        selectB.appendChild(optB);
    });

    // Read selections
    const selectedA = valA;
    const selectedB = valB;

    // Labels
    document.getElementById("compLabelMonthA1").textContent = getMonthNameLabel(selectedA);
    document.getElementById("compLabelMonthB1").textContent = getMonthNameLabel(selectedB);
    document.getElementById("compLabelMonthA2").textContent = getMonthNameLabel(selectedA);
    document.getElementById("compLabelMonthB2").textContent = getMonthNameLabel(selectedB);
    document.getElementById("compLabelMonthA3").textContent = getMonthNameLabel(selectedA);
    document.getElementById("compLabelMonthB3").textContent = getMonthNameLabel(selectedB);

    // Update chart panel title with real month names
    document.getElementById("compChartTitle").textContent =
        `Gasto por Categoria: ${getMonthNameLabel(selectedA)} vs ${getMonthNameLabel(selectedB)}`;

    // Calculate metrics
    const metricsA = calculateMonthMetrics(selectedA);
    const metricsB = calculateMonthMetrics(selectedB);

    // 1. Budget Card
    document.getElementById("compValMonthABudget").textContent = formatCurrency(metricsA.budget);
    document.getElementById("compValMonthBBudget").textContent = formatCurrency(metricsB.budget);

    const budgetDiff = metricsB.budget - metricsA.budget;
    const budgetDiffBadge = document.getElementById("compBudgetDiffBadge");

    if (budgetDiff > 0) {
        const pct = metricsA.budget > 0 ? Math.round((budgetDiff / metricsA.budget) * 100) : 100;
        budgetDiffBadge.innerHTML = `<i data-lucide="trending-up" style="width: 14px; height: 14px;"></i> +${pct}% (+${formatCurrency(budgetDiff)})`;
        budgetDiffBadge.className = "comp-diff-val-badge decrease"; // greener in light/dark
    } else if (budgetDiff < 0) {
        const pct = metricsA.budget > 0 ? Math.round((Math.abs(budgetDiff) / metricsA.budget) * 100) : 100;
        budgetDiffBadge.innerHTML = `<i data-lucide="trending-down" style="width: 14px; height: 14px;"></i> -${pct}% (-${formatCurrency(Math.abs(budgetDiff))})`;
        budgetDiffBadge.className = "comp-diff-val-badge increase"; // red-ish
    } else {
        budgetDiffBadge.innerHTML = `Sem alteração`;
        budgetDiffBadge.className = "comp-diff-val-badge neutral";
    }

    // 2. Spent Card (Economy analysis)
    document.getElementById("compValMonthASpent").textContent = formatCurrency(metricsA.totalSpent);
    document.getElementById("compValMonthBSpent").textContent = formatCurrency(metricsB.totalSpent);

    const spentDiff = metricsB.totalSpent - metricsA.totalSpent;
    const spentDiffBadge = document.getElementById("compSpentDiffBadge");

    if (spentDiff < 0) { // Spent less in Month B (Economy!)
        const pct = metricsA.totalSpent > 0 ? Math.round((Math.abs(spentDiff) / metricsA.totalSpent) * 100) : 100;
        spentDiffBadge.innerHTML = `<i data-lucide="shield-check" style="width: 14px; height: 14px;"></i> Economia de ${pct}% (-${formatCurrency(Math.abs(spentDiff))})`;
        spentDiffBadge.className = "comp-diff-val-badge decrease"; // Positive / Green economy
    } else if (spentDiff > 0) { // Spent more
        const pct = metricsA.totalSpent > 0 ? Math.round((spentDiff / metricsA.totalSpent) * 100) : 100;
        spentDiffBadge.innerHTML = `<i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i> Gasto +${pct}% (+${formatCurrency(spentDiff)})`;
        spentDiffBadge.className = "comp-diff-val-badge increase"; // Negative / Danger
    } else {
        spentDiffBadge.innerHTML = `Mesmo consumo`;
        spentDiffBadge.className = "comp-diff-val-badge neutral";
    }

    // 3. Savings / Remaining Balance Card
    document.getElementById("compValMonthASavings").textContent = formatCurrency(metricsA.balance);
    document.getElementById("compValMonthBSavings").textContent = formatCurrency(metricsB.balance);

    const savingsDiff = metricsB.balance - metricsA.balance;
    const savingsDiffBadge = document.getElementById("compSavingsDiffBadge");

    if (savingsDiff > 0) { // More savings in Month B
        savingsDiffBadge.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> +${formatCurrency(savingsDiff)}`;
        savingsDiffBadge.className = "comp-diff-val-badge decrease"; // Positive
    } else if (savingsDiff < 0) { // Less savings
        savingsDiffBadge.innerHTML = `<i data-lucide="trending-down" style="width: 14px; height: 14px;"></i> -${formatCurrency(Math.abs(savingsDiff))}`;
        savingsDiffBadge.className = "comp-diff-val-badge increase"; // Danger
    } else {
        savingsDiffBadge.innerHTML = `Igual`;
        savingsDiffBadge.className = "comp-diff-val-badge neutral";
    }

    // 4. Render Double Bar Chart comparing each category
    renderDoubleBarChart(selectedA, selectedB);
    lucide.createIcons();
}

function renderDoubleBarChart(monthA, monthB) {
    const canvas = document.getElementById("comparisonBarChart");

    const dataA = getMonthData(monthA);
    const dataB = getMonthData(monthB);

    // Group totals by category
    const catTotalsA = {};
    const catTotalsB = {};

    state.data.categories.forEach(cat => {
        catTotalsA[cat.id] = 0;
        catTotalsB[cat.id] = 0;
    });

    dataA.expenses.forEach(exp => {
        if (catTotalsA[exp.categoryId] !== undefined) {
            catTotalsA[exp.categoryId] += exp.amount;
        }
    });

    dataB.expenses.forEach(exp => {
        if (catTotalsB[exp.categoryId] !== undefined) {
            catTotalsB[exp.categoryId] += exp.amount;
        }
    });

    // Filters: only include categories that have at least some expenses in month A or month B
    const activeCats = state.data.categories.filter(cat => catTotalsA[cat.id] > 0 || catTotalsB[cat.id] > 0);

    const labels = activeCats.map(c => c.name);
    const valuesA = activeCats.map(c => catTotalsA[c.id]);
    const valuesB = activeCats.map(c => catTotalsB[c.id]);

    if (state.barChart) {
        state.barChart.destroy();
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94a3b8" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    state.barChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: getMonthNameLabel(monthA),
                    data: valuesA,
                    backgroundColor: 'rgba(99, 102, 241, 0.65)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1.5,
                    borderRadius: 6
                },
                {
                    label: getMonthNameLabel(monthB),
                    data: valuesB,
                    backgroundColor: 'rgba(16, 185, 129, 0.65)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1.5,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: isDark ? '#f8fafc' : '#0f172a',
                        font: {
                            family: 'Outfit',
                            size: 13,
                            weight: '500'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    font: {
                        family: 'Outfit'
                    },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Outfit',
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Outfit',
                            size: 11
                        },
                        callback: function (value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

// --------------------------------------------------------------------------
// RENDER: HISTORICAL EVOLUTION VIEW
// --------------------------------------------------------------------------
function renderEvolution() {
    const canvas = document.getElementById("evolutionLineChart");
    if (!canvas) return;

    // 1. Get all months sorted chronologically ascending
    // Filter out empty future months (created by navigation arrows but never used)
    const todayMonth = getFormattedToday();
    const allMonthKeys = Object.keys(state.data.months).sort((a, b) => a.localeCompare(b));
    const monthKeys = allMonthKeys.filter(mKey => {
        if (mKey <= todayMonth) return true; // always show past and current months
        const m = state.data.months[mKey];
        const hasExpenses = m.expenses && m.expenses.length > 0;
        return hasExpenses; // only show future months if they have real data
    });
    if (monthKeys.length === 0) return;

    const selectStart = document.getElementById("evoStartMonthSelect");
    const selectEnd = document.getElementById("evoEndMonthSelect");

    let startVal = state.evoStartVal || selectStart.value;
    let endVal = state.evoEndVal || selectEnd.value;

    if (!startVal || !monthKeys.includes(startVal)) {
        startVal = monthKeys[0];
    }
    if (!endVal || !monthKeys.includes(endVal)) {
        endVal = monthKeys[monthKeys.length - 1];
    }

    if (startVal > endVal) {
        const temp = startVal;
        startVal = endVal;
        endVal = temp;
        selectStart.value = startVal;
        selectEnd.value = endVal;
    }

    // Populate dropdowns dynamically if count has changed or they are empty
    selectStart.innerHTML = "";
    selectEnd.innerHTML = "";

    monthKeys.forEach(mKey => {
        const label = getMonthNameLabel(mKey);

        const optS = document.createElement("option");
        optS.value = mKey;
        optS.textContent = label;
        if (mKey === startVal) optS.selected = true;
        selectStart.appendChild(optS);

        const optE = document.createElement("option");
        optE.value = mKey;
        optE.textContent = label;
        if (mKey === endVal) optE.selected = true;
        selectEnd.appendChild(optE);
    });

    // Re-attach listeners after rebuilding selects
    selectStart.onchange = () => {
        const start = selectStart.value;
        const end = selectEnd.value;
        if (start > end) {
            selectEnd.value = start;
            state.evoEndVal = start;
        }
        state.evoStartVal = start;
        renderEvolution();
    };
    selectEnd.onchange = () => {
        const start = selectStart.value;
        const end = selectEnd.value;
        if (start > end) {
            selectStart.value = end;
            state.evoStartVal = end;
        }
        state.evoEndVal = end;
        renderEvolution();
    };

    // Filter range
    const rangeKeys = monthKeys.filter(m => m >= startVal && m <= endVal);

    const labels = [];
    const incomes = [];
    const spent = [];
    const savings = [];

    let totalIncomeSum = 0;
    let totalSpentSum = 0;
    let totalSavingsSum = 0;
    let monthCount = rangeKeys.length;

    rangeKeys.forEach(mKey => {
        const metrics = calculateMonthMetrics(mKey);
        labels.push(getMonthNameLabel(mKey).split(" de ")[0] + "/" + mKey.split("-")[0].substring(2)); // e.g. "Maio/26"
        incomes.push(metrics.totalIncome);
        spent.push(metrics.totalSpent);
        savings.push(metrics.balance);

        totalIncomeSum += metrics.totalIncome;
        totalSpentSum += metrics.totalSpent;
        totalSavingsSum += metrics.balance;
    });

    // 2. Compute averages for metrics cards
    const avgIncome = monthCount > 0 ? totalIncomeSum / monthCount : 0;
    const avgSpent = monthCount > 0 ? totalSpentSum / monthCount : 0;

    document.getElementById("evoAvgBudget").textContent = formatCurrency(avgIncome);
    document.getElementById("evoAvgSpent").textContent = formatCurrency(avgSpent);
    document.getElementById("evoTotalSavings").textContent = formatCurrency(totalSavingsSum);

    // Style the savings card border and color depending on positive or negative total saved
    const savingsCard = document.getElementById("evoTotalSavings").closest(".comp-metric-card");
    if (totalSavingsSum < 0) {
        savingsCard.style.borderLeftColor = "var(--color-danger)";
    } else {
        savingsCard.style.borderLeftColor = "var(--color-success)";
    }

    // 3. Render Line Chart using Chart.js
    if (state.evolutionChart) {
        state.evolutionChart.destroy();
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94a3b8" : "#475569";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    state.evolutionChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: incomes,
                    borderColor: 'rgb(16, 185, 129)', // Green
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    borderWidth: 3,
                    tension: 0.35,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Gastos Reais',
                    data: spent,
                    borderColor: 'rgb(244, 63, 94)', // Rose
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    fill: true,
                    borderWidth: 3,
                    tension: 0.35,
                    pointBackgroundColor: 'rgb(244, 63, 94)',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: isDark ? '#f8fafc' : '#0f172a',
                        font: {
                            family: 'Outfit',
                            size: 13,
                            weight: '500'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    font: {
                        family: 'Outfit'
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            return `  ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Outfit',
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Outfit',
                            size: 11
                        },
                        callback: function (value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                        }
                    }
                }
            }
        }
    });
}

// --------------------------------------------------------------------------
// RENDER: CATEGORIES MANAGER VIEW
// --------------------------------------------------------------------------
function renderCategoriesManager() {
    // 1. Render static choices in creation form
    const colorsRow = document.getElementById("colorsSelectorRow");
    colorsRow.innerHTML = "";

    STANDARD_COLORS.forEach(color => {
        const option = document.createElement("div");
        option.className = `color-dot-option ${state.selectedCategoryColor === color ? 'selected' : ''}`;
        option.style.backgroundColor = color;
        option.onclick = () => {
            state.selectedCategoryColor = color;
            renderCategoriesManager(); // refresh selections
        };
        colorsRow.appendChild(option);
    });

    const iconsGrid = document.getElementById("iconsGridSelector");
    iconsGrid.innerHTML = "";

    STANDARD_ICONS.forEach(icon => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `icon-option-btn ${state.selectedCategoryIcon === icon ? 'selected' : ''}`;
        btn.innerHTML = `<i data-lucide="${icon}"></i>`;
        btn.onclick = () => {
            state.selectedCategoryIcon = icon;
            renderCategoriesManager(); // refresh selections
        };
        iconsGrid.appendChild(btn);
    });

    // 2. Render categories list with items count
    const listContainer = document.getElementById("categoryManagerList");
    listContainer.innerHTML = "";

    // Calculate total expenses per category globally across ALL history
    const globalUsage = {};
    Object.values(state.data.months).forEach(m => {
        m.expenses.forEach(exp => {
            globalUsage[exp.categoryId] = (globalUsage[exp.categoryId] || 0) + 1;
        });
    });

    state.data.categories.forEach(cat => {
        const usageCount = globalUsage[cat.id] || 0;
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "99, 102, 241";
        };

        const card = document.createElement("div");
        card.className = "category-manager-item-card glass-panel";

        // Prevent deleting core system categories if they are in use, 
        // and add some premium details.
        const typeLabel = cat.type === "income" ? "💰 Receita" : "💸 Despesa";
        const typeBadgeColor = cat.type === "income" ? "var(--color-success)" : "var(--color-danger)";
        card.innerHTML = `
            <div class="category-item-main">
                <div class="category-item-icon" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}4f;">
                    <i data-lucide="${cat.icon}"></i>
                </div>
                <div class="category-item-details">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="category-item-name">${cat.name}</span>
                        <span style="font-size:11px; color:${typeBadgeColor}; font-weight:500;">${typeLabel}</span>
                    </div>
                    <span class="category-item-count">${usageCount} transaçõ(es) vinculada(s)</span>
                </div>
            </div>
            <div class="category-item-actions">
                <button class="btn-edit-category" onclick="openEditCategoryModal('${cat.id}')" title="Editar Categoria">
                    <i data-lucide="pencil"></i>
                </button>
                <button class="btn-delete-category" onclick="handleDeleteCategory('${cat.id}')" title="Remover Categoria">
                    <i data-lucide="x-circle"></i>
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });

    lucide.createIcons();
}

// ==========================================================================
// 6. ACTION HANDLERS & MODAL MANAGEMENT
// ==========================================================================

// Global Tab Manager
function switchTab(tabId) {
    state.activeTab = tabId;

    // Update sidebar navigation active item CSS
    document.querySelectorAll("#navMenu li").forEach(li => {
        if (li.getAttribute("data-tab") === tabId) {
            li.classList.add("active");
        } else {
            li.classList.remove("active");
        }
    });

    refreshUI();
}

// Month Quick selector
function handlePrevMonth() {
    const prev = getPreviousMonthStr(state.currentMonth);
    state.currentMonth = prev;

    // Auto-create month if not exists
    if (!state.data.months[state.currentMonth]) {
        createNewMonth(state.currentMonth);
    }

    refreshUI();
}

function handleNextMonth() {
    const next = getNextMonthStr(state.currentMonth);
    const prevMonth = state.currentMonth; // capture BEFORE changing
    state.currentMonth = next;

    if (!state.data.months[state.currentMonth]) {
        // Month does not exist yet: createNewMonth handles recurring inheritance
        createNewMonth(state.currentMonth);
    } else {
        // Month already exists: check if any recurring expense from prev month
        // is missing here (e.g. recurrence was added after this month was created)
        const prevExpenses = (state.data.months[prevMonth]?.expenses || []).filter(e => e.isRecurring === true);
        prevExpenses.forEach(exp => {
            propagateRecurringToFutureMonths(exp, prevMonth);
        });
        saveToLocalStorage();
    }

    refreshUI();
}

// Theme Switcher
function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fintrack_theme", theme);

    const themeText = document.getElementById("themeToggleText");
    const themeIcon = document.getElementById("themeToggleIcon");

    if (theme === "light") {
        themeText.textContent = "Tema Escuro";
        themeIcon.setAttribute("data-lucide", "moon");
    } else {
        themeText.textContent = "Tema Claro";
        themeIcon.setAttribute("data-lucide", "sun");
    }

    lucide.createIcons();

    // Recreate charts to pick up the updated system grid-colors/font-colors
    if (state.activeTab === "dashboard" && state.donutChart) {
        renderDashboard();
    } else if (state.activeTab === "comparison" && state.barChart) {
        renderComparison();
    } else if (state.activeTab === "evolution" && state.evolutionChart) {
        renderEvolution();
    }
}

// Modals display toggle
function toggleModal(modalId, forceOpen = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const isOpen = modal.classList.contains("active");
    const shouldOpen = forceOpen !== null ? forceOpen : !isOpen;

    if (shouldOpen) {
        modal.classList.add("active");
    } else {
        modal.classList.remove("active");
    }
}

// Generic Confirm Modal
function showConfirm(title, message, onConfirm, confirmLabel = "Confirmar", danger = true) {
    document.getElementById("genericConfirmTitle").textContent = title;
    document.getElementById("genericConfirmMessage").textContent = message;

    const okBtn = document.getElementById("genericConfirmOkBtn");
    okBtn.textContent = confirmLabel;
    okBtn.className = danger ? "btn btn-danger" : "btn btn-primary";

    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.onclick = () => {
        toggleModal("genericConfirmModal", false);
        onConfirm();
    };

    toggleModal("genericConfirmModal", true);
}

// Expense Add/Save Actions
function openAddExpenseModal() {
    // Populate categories select dropdown inside modal
    const select = document.getElementById("expenseCategorySelect");
    select.innerHTML = "";

    state.data.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });

    // Autofill date: if current selected month is today's month, use exact today. 
    // Otherwise use first day of that month.
    const today = new Date();
    const todayStr = getFormattedToday();
    const expenseDateInput = document.getElementById("expenseDate");

    if (state.currentMonth === todayStr) {
        const day = String(today.getDate()).padStart(2, '0');
        expenseDateInput.value = `${state.currentMonth}-${day}`;
    } else {
        expenseDateInput.value = `${state.currentMonth}-01`;
    }

    // Clear description & amount & checkbox
    document.getElementById("expenseDescription").value = "";
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseRecurring").checked = false;

    toggleModal("expenseModal", true);
}

function handleSaveExpense(e) {
    const description = document.getElementById("expenseDescription").value.trim();
    let amount = parseFloat(document.getElementById("expenseAmount").value); // Use 'let' aqui
    const categoryId = document.getElementById("expenseCategorySelect").value;
    const date = document.getElementById("expenseDate").value; // YYYY-MM-DD
    const isRecurring = document.getElementById("expenseRecurring").checked;

    // Validação reforçada para o 'amount'
    if (isNaN(amount) || amount <= 0) {
        alert("Por favor, insira um valor numérico positivo para a despesa.");
        return;
    }

    // Validação para os outros campos obrigatórios
    if (!description || !categoryId || !date) {
        alert("Por favor, preencha todos os campos obrigatórios (descrição, categoria, data).");
        return;
    }

    const targetMonth = date.substring(0, 7); // "YYYY-MM"

    // --- EDIT MODE ---
    if (state.editingExpenseId) {
        // Find the original expense to check if recurrence changed
        let originalExpense = null;
        let originalMonth = null;
        Object.values(state.data.months).forEach(m => {
            const found = m.expenses.find(exp => exp.id === state.editingExpenseId);
            if (found) {
                originalExpense = found;
                originalMonth = m.monthId;
            }
        });

        // If recurrence was turned OFF, remove all future recurring instances
        if (originalExpense && originalExpense.isRecurring === true && isRecurring === false) {
            const dateMonthStr = originalExpense.date ? originalExpense.date.substring(0, 7) : originalMonth;

            Object.keys(state.data.months).forEach(monthKey => {
                if (monthKey > dateMonthStr) {
                    state.data.months[monthKey].expenses =
                        state.data.months[monthKey].expenses
                            .filter(exp => {
                                if (exp.isRecurring &&
                                    exp.description === originalExpense.description &&
                                    exp.categoryId === originalExpense.categoryId) {
                                    return false;
                                }
                                return true;
                            });
                }
            });
        }

        // If recurrence was turned ON, propagate to all future months immediately
        if (originalExpense && originalExpense.isRecurring !== true && isRecurring === true) {
            const tempExpense = { description, amount, categoryId, date, isRecurring: true };
            propagateRecurringToFutureMonths(tempExpense, targetMonth);
        }

        // Find the expense across all months and update it
        let found = false;
        Object.values(state.data.months).forEach(m => {
            const idx = m.expenses.findIndex(exp => exp.id === state.editingExpenseId);
            if (idx !== -1) {
                // If date changed to another month, move the expense
                if (m.monthId !== targetMonth) {
                    m.expenses.splice(idx, 1);
                    const targetMonthData = getMonthData(targetMonth);
                    targetMonthData.expenses.push({ id: state.editingExpenseId, description, amount, categoryId, date, isRecurring });
                } else {
                    m.expenses[idx] = { ...m.expenses[idx], description, amount, categoryId, date, isRecurring };
                }
                found = true;
            }
        });
        if (!found) {
            alert("Despesa não encontrada.");
            return;
        }
        state.editingExpenseId = null;
        document.getElementById("expenseModalTitle").textContent = "Cadastrar Gasto";
        document.getElementById("saveExpenseBtn").textContent = "Salvar Despesa";
        saveToLocalStorage();
        toggleModal("expenseModal", false);
        if (state.currentMonth !== targetMonth) state.currentMonth = targetMonth;
        refreshUI();
        return;
    }

    // --- CREATE MODE ---
    const targetMonthData = getMonthData(targetMonth);
    const newExpense = {
        id: "exp-" + Date.now() + Math.random().toString(36).substr(2, 5),
        description,
        amount,
        categoryId,
        date,
        isRecurring
    };

    targetMonthData.expenses.push(newExpense);

    // If the expense is recurring, immediately propagate it to all future
    // months that already exist in localStorage (so the user sees it right away)
    if (isRecurring) {
        propagateRecurringToFutureMonths(newExpense, targetMonth);
    }

    saveToLocalStorage();

    // Close modal
    toggleModal("expenseModal", false);

    // If they saved inside the active month, refresh. Otherwise jump to the month they added the expense to!
    if (state.currentMonth !== targetMonth) {
        state.currentMonth = targetMonth;
    }

    refreshUI();
}

function openEditExpenseModal(expenseId) {
    // Find expense across all months
    let expense = null;
    Object.values(state.data.months).forEach(m => {
        const found = m.expenses.find(exp => exp.id === expenseId);
        if (found) expense = found;
    });
    if (!expense) return;

    state.editingExpenseId = expenseId;

    // Populate categories dropdown
    const select = document.getElementById("expenseCategorySelect");
    select.innerHTML = "";
    state.data.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });

    // Fill fields with existing data
    document.getElementById("expenseDescription").value = expense.description;
    document.getElementById("expenseCategorySelect").value = expense.categoryId;
    document.getElementById("expenseDate").value = expense.date;

    const amountValue = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount) || 0;
    document.getElementById("expenseAmount").value = amountValue > 0 ? amountValue : "";
    document.getElementById("expenseRecurring").checked = expense.isRecurring === true;

    // Update modal title and button
    document.getElementById("expenseModalTitle").textContent = "Editar Despesa";
    document.getElementById("saveExpenseBtn").textContent = "Atualizar Despesa";

    toggleModal("expenseModal", true);
}

function duplicateExpense(expenseId) {
    let expense = null;
    Object.values(state.data.months).forEach(m => {
        const found = m.expenses.find(exp => exp.id === expenseId);
        if (found) expense = found;
    });
    if (!expense) return;

    openAddExpenseModal();

    setTimeout(() => {
        document.getElementById("expenseDescription").value = expense.description;
        document.getElementById("expenseCategorySelect").value = expense.categoryId;
        document.getElementById("expenseAmount").value = expense.amount;
        document.getElementById("expenseRecurring").checked = false;

        const today = new Date();
        const todayStr = getFormattedToday();
        if (state.currentMonth === todayStr) {
            const day = String(today.getDate()).padStart(2, "0");
            document.getElementById("expenseDate").value = `${state.currentMonth}-${day}`;
        } else {
            document.getElementById("expenseDate").value = `${state.currentMonth}-01`;
        }

        document.getElementById("expenseModalTitle").textContent = "Duplicar Despesa";
    }, 50);
}

function handleDeleteExpense(expenseId) {
    showConfirm(
        "Excluir Despesa",
        "Deseja realmente excluir esta transação? Esta ação não pode ser desfeita.",
        () => {
            const monthData = getMonthData(state.currentMonth);
            monthData.expenses = monthData.expenses.filter(exp => exp.id !== expenseId);
            saveToLocalStorage();
            refreshUI();
        },
        "Excluir"
    );
}

// Budget Edit Actions
function openEditBudgetModal() {
    if (!document.getElementById("budgetModal")) return;
    const metrics = calculateMonthMetrics(state.currentMonth);
    document.getElementById("budgetModalMonthDisplay").textContent = getMonthNameLabel(state.currentMonth);
    document.getElementById("budgetInput").value = metrics.budget;

    toggleModal("budgetModal", true);
}

function handleSaveBudget() {
    const input = document.getElementById("budgetInput");
    if (!input) return;
    const newBudget = parseFloat(input.value);

    if (isNaN(newBudget) || newBudget < 0) {
        alert("Por favor, digite um valor de orçamento válido.");
        return;
    }

    const monthData = getMonthData(state.currentMonth);
    monthData.budget = newBudget;
    saveToLocalStorage();

    toggleModal("budgetModal", false);
    refreshUI();
}

// Categories Management Actions
function handleSaveCategory() {
    const nameInput = document.getElementById("newCatNameInput");
    const name = nameInput.value.trim();

    if (!name) {
        alert("Escreva o nome da categoria!");
        return;
    }

    // Check duplication
    const duplicate = state.data.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
        alert("Esta categoria já existe!");
        return;
    }

    // Generate unique ID
    const catId = "cat-" + Date.now();
    const typeRadio = document.querySelector('input[name="newCatType"]:checked');
    const catType = typeRadio ? typeRadio.value : "expense";
    const newCat = {
        id: catId,
        name,
        color: state.selectedCategoryColor,
        icon: state.selectedCategoryIcon,
        type: catType
    };

    state.data.categories.push(newCat);
    saveToLocalStorage();

    // Reset Form
    nameInput.value = "";
    state.selectedCategoryColor = STANDARD_COLORS[0];
    state.selectedCategoryIcon = STANDARD_ICONS[0];
    const expenseRadio = document.getElementById("newCatTypeExpense");
    if (expenseRadio) expenseRadio.checked = true;

    // Redraw
    renderCategoriesManager();

    // Add dynamically to filter selections & add expense choices instantly
    const filterSelect = document.getElementById("filterCategorySelect");
    const opt = document.createElement("option");
    opt.value = catId;
    opt.textContent = name;
    filterSelect.appendChild(opt);
}

function handleDeleteCategory(catId) {
    // 1. Prevent deleting core categories if too basic, or if they have transaction dependencies
    const hasExpenses = Object.values(state.data.months).some(m =>
        m.expenses.some(exp => exp.categoryId === catId)
    );

    if (hasExpenses) {
        alert("Esta categoria não pode ser excluída pois existem transações cadastradas nela! Remova ou altere as despesas dessa categoria antes de prosseguir.");
        return;
    }

    if (state.data.categories.length <= 1) {
        alert("Você deve manter pelo menos uma categoria ativa no aplicativo.");
        return;
    }

    showConfirm(
        "Excluir Categoria",
        "Confirmar exclusão da categoria? Esta ação não pode ser desfeita.",
        () => {
            state.data.categories = state.data.categories.filter(c => c.id !== catId);
            saveToLocalStorage();

            const filterSelect = document.getElementById("filterCategorySelect");
            for (let i = 0; i < filterSelect.options.length; i++) {
                if (filterSelect.options[i].value === catId) {
                    filterSelect.remove(i);
                    break;
                }
            }

            renderCategoriesManager();
        },
        "Excluir"
    );
}

// --- Edit Category ---
function openEditCategoryModal(catId) {
    const cat = state.data.categories.find(c => c.id === catId);
    if (!cat) return;

    state.editingCategoryId = catId;
    state.editingCategoryColor = cat.color;
    state.editingCategoryIcon = cat.icon;

    document.getElementById("editCatIdInput").value = catId;
    document.getElementById("editCatNameInput").value = cat.name;

    const editTypeRadio = document.querySelector(`input[name="editCatType"][value="${cat.type || 'expense'}"]`);
    if (editTypeRadio) editTypeRadio.checked = true;

    renderEditCategoryModalSelectors();
    toggleModal("editCategoryModal", true);
}

function renderEditCategoryModalSelectors() {
    // Colors
    const colorsRow = document.getElementById("editColorsSelectorRow");
    colorsRow.innerHTML = "";
    STANDARD_COLORS.forEach(color => {
        const dot = document.createElement("div");
        dot.className = `color-dot-option ${state.editingCategoryColor === color ? 'selected' : ''}`;
        dot.style.backgroundColor = color;
        dot.onclick = () => { state.editingCategoryColor = color; renderEditCategoryModalSelectors(); };
        colorsRow.appendChild(dot);
    });

    // Icons
    const iconsGrid = document.getElementById("editIconsGridSelector");
    iconsGrid.innerHTML = "";
    STANDARD_ICONS.forEach(icon => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `icon-option-btn ${state.editingCategoryIcon === icon ? 'selected' : ''}`;
        btn.innerHTML = `<i data-lucide="${icon}"></i>`;
        btn.onclick = () => { state.editingCategoryIcon = icon; renderEditCategoryModalSelectors(); };
        iconsGrid.appendChild(btn);
    });

    lucide.createIcons();
}

function handleUpdateCategory() {
    const catId = document.getElementById("editCatIdInput").value;
    const name = document.getElementById("editCatNameInput").value.trim();

    if (!name) { alert("Escreva o nome da categoria!"); return; }

    // Check duplication against OTHER categories (allow keeping same name)
    const duplicate = state.data.categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== catId);
    if (duplicate) { alert("Já existe outra categoria com este nome!"); return; }

    const idx = state.data.categories.findIndex(c => c.id === catId);
    if (idx === -1) return;

    const editTypeRadio = document.querySelector('input[name="editCatType"]:checked');
    const updatedType = editTypeRadio ? editTypeRadio.value : (state.data.categories[idx].type || "expense");
    state.data.categories[idx] = {
        ...state.data.categories[idx],
        name,
        color: state.editingCategoryColor,
        icon: state.editingCategoryIcon,
        type: updatedType
    };

    state.editingCategoryId = null;
    saveToLocalStorage();
    toggleModal("editCategoryModal", false);

    // Refresh filter dropdown label if it changed
    const filterSelect = document.getElementById("filterCategorySelect");
    for (let i = 0; i < filterSelect.options.length; i++) {
        if (filterSelect.options[i].value === catId) {
            filterSelect.options[i].textContent = name;
            break;
        }
    }

    refreshUI();
}

function handleResetApplication() {
    toggleModal(
        "resetConfirmModal", true
    );
}

// ==========================================================================
// INCOME CRUD FUNCTIONS
// ==========================================================================

function openAddIncomeModal() {
    // Populate income categories select (only type === 'income')
    const select = document.getElementById("incomeCategorySelect");
    select.innerHTML = "";
    const incomeCategories = state.data.categories.filter(c => c.type === "income");
    if (incomeCategories.length === 0) {
        // Fallback: show all categories
        state.data.categories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });
    } else {
        incomeCategories.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });
    }

    // Autofill date
    const today = new Date();
    const todayStr = getFormattedToday();
    const incomeDateInput = document.getElementById("incomeDate");
    if (state.currentMonth === todayStr) {
        const day = String(today.getDate()).padStart(2, '0');
        incomeDateInput.value = `${state.currentMonth}-${day}`;
    } else {
        incomeDateInput.value = `${state.currentMonth}-01`;
    }

    // Reset form fields
    document.getElementById("incomeDescription").value = "";
    document.getElementById("incomeAmount").value = "";
    state.editingIncomeId = null;
    document.getElementById("incomeModalTitle").textContent = "Cadastrar Receita";
    document.getElementById("saveIncomeBtn").innerHTML = '<i data-lucide="check-circle-2"></i> Salvar Receita';

    toggleModal("incomeModal", true);
    lucide.createIcons();
}

function handleSaveIncome() {
    const description = document.getElementById("incomeDescription").value.trim();
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    const categoryId = document.getElementById("incomeCategorySelect").value;
    const date = document.getElementById("incomeDate").value;

    if (!description) {
        alert("Por favor, preencha a descrição da receita.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert("Por favor, insira um valor numérico positivo para a receita.");
        return;
    }
    if (!categoryId || !date) {
        alert("Por favor, selecione a categoria e a data do recebimento.");
        return;
    }

    const targetMonth = date.substring(0, 7); // "YYYY-MM"
    const targetMonthData = getMonthData(targetMonth);
    if (!targetMonthData.incomes) targetMonthData.incomes = [];

    // --- EDIT MODE ---
    if (state.editingIncomeId) {
        let found = false;
        Object.values(state.data.months).forEach(m => {
            if (!m.incomes) m.incomes = [];
            const idx = m.incomes.findIndex(inc => inc.id === state.editingIncomeId);
            if (idx !== -1) {
                if (m.monthId !== targetMonth) {
                    // Move to new month
                    m.incomes.splice(idx, 1);
                    targetMonthData.incomes.push({ id: state.editingIncomeId, description, amount, categoryId, date });
                } else {
                    m.incomes[idx] = { ...m.incomes[idx], description, amount, categoryId, date };
                }
                found = true;
            }
        });
        if (!found) {
            alert("Receita não encontrada.");
            return;
        }
        state.editingIncomeId = null;
        document.getElementById("incomeModalTitle").textContent = "Cadastrar Receita";
    } else {
        // --- CREATE MODE ---
        const newIncome = {
            id: "inc-" + Date.now() + Math.random().toString(36).substr(2, 5),
            description,
            amount,
            categoryId,
            date
        };
        targetMonthData.incomes.push(newIncome);
    }

    saveToLocalStorage();
    toggleModal("incomeModal", false);

    if (state.currentMonth !== targetMonth) {
        state.currentMonth = targetMonth;
    }

    refreshUI();
}

function openEditIncomeModal(incomeId) {
    // Find income across all months
    let income = null;
    Object.values(state.data.months).forEach(m => {
        const found = (m.incomes || []).find(inc => inc.id === incomeId);
        if (found) income = found;
    });
    if (!income) return;

    state.editingIncomeId = incomeId;

    // Populate income categories
    const select = document.getElementById("incomeCategorySelect");
    select.innerHTML = "";
    const incomeCategories = state.data.categories.filter(c => c.type === "income");
    const categoriesToShow = incomeCategories.length > 0 ? incomeCategories : state.data.categories;
    categoriesToShow.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
    });

    // Fill form with existing data
    document.getElementById("incomeDescription").value = income.description;
    document.getElementById("incomeCategorySelect").value = income.categoryId;
    document.getElementById("incomeDate").value = income.date;
    const amountValue = typeof income.amount === 'number' ? income.amount : parseFloat(income.amount) || 0;
    document.getElementById("incomeAmount").value = amountValue > 0 ? amountValue : "";

    // Update modal title and button
    document.getElementById("incomeModalTitle").textContent = "Editar Receita";
    document.getElementById("saveIncomeBtn").innerHTML = '<i data-lucide="check-circle-2"></i> Atualizar Receita';

    toggleModal("incomeModal", true);
    lucide.createIcons();
}

function handleDeleteIncome(incomeId) {
    showConfirm(
        "Excluir Receita",
        "Deseja realmente excluir esta receita? Esta ação não pode ser desfeita.",
        () => {
            const monthData = getMonthData(state.currentMonth);
            if (monthData.incomes) {
                monthData.incomes = monthData.incomes.filter(inc => inc.id !== incomeId);
            }
            saveToLocalStorage();
            refreshUI();
        },
        "Excluir"
    );
}

function executeResetCurrentMonth() {
    const monthData = state.data.months[state.currentMonth];
    if (monthData && monthData.expenses) {
        const recurringIds = monthData.expenses
            .filter(exp => exp.isRecurring === true)
            .map(exp => exp.id);

        const currentMonthNum = parseInt(state.currentMonth.split("-")[1]);
        const currentYear = parseInt(state.currentMonth.split("-")[0]);

        Object.keys(state.data.months).forEach(monthKey => {
            const monthNum = parseInt(monthKey.split("-")[1]);
            const yearNum = parseInt(monthKey.split("-")[0]);

            if (yearNum > currentYear || (yearNum === currentYear && monthNum >= currentMonthNum)) {
                if (state.data.months[monthKey].expenses) {
                    state.data.months[monthKey].expenses =
                        state.data.months[monthKey].expenses
                            .filter(exp => !recurringIds.includes(exp.id));
                }
            }
        });
    }

    const currentBudget = state.data.months[state.currentMonth].budget;
    const currentIncomes = state.data.months[state.currentMonth].incomes || [];
    state.data.months[state.currentMonth] = {
        monthId: state.currentMonth,
        budget: currentBudget,
        expenses: [],
        incomes: currentIncomes
    };

    toggleModal("resetConfirmModal", false);
    saveToLocalStorage();
    refreshUI();
}

// ==========================================================================
// KEYBOARD SHORTCUTS
// ==========================================================================
function initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
        // Ignore if typing in an input, textarea or select
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;

        // Ignore if any modal is open
        const anyModalOpen = document.querySelector(".modal-overlay.active");
        if (anyModalOpen) return;

        if (e.key === "n" || e.key === "N") {
            e.preventDefault();
            openAddExpenseModal();
        } else if (e.key === "r" || e.key === "R") {
            e.preventDefault();
            openAddIncomeModal();
        }
    });
}

// ==========================================================================
// SPENDING ALERT & TOAST NOTIFICATION
// ==========================================================================

function loadAlertThreshold() {
    const saved = localStorage.getItem("fintrack_alert_threshold");
    state.alertThreshold = saved !== null ? parseFloat(saved) : 0;
    updateAlertBtnLabel();
}

function updateAlertBtnLabel() {
    const btn = document.getElementById("alertThresholdBtnLabel");
    if (!btn) return;
    if (state.alertThreshold > 0) {
        btn.textContent = `Alerta: ${state.alertThreshold}%`;
    } else {
        btn.textContent = "Alerta de Gastos";
    }
}

function openAlertThresholdModal() {
    document.getElementById("alertThresholdInput").value = state.alertThreshold > 0 ? state.alertThreshold : "";
    toggleModal("alertThresholdModal", true);
}

function handleSaveAlertThreshold() {
    const val = parseFloat(document.getElementById("alertThresholdInput").value);
    if (isNaN(val) || val < 0 || val > 100) {
        alert("Por favor, insira um valor entre 0 e 100.");
        return;
    }
    state.alertThreshold = val;
    localStorage.setItem("fintrack_alert_threshold", val);
    updateAlertBtnLabel();
    toggleModal("alertThresholdModal", false);
    checkSpendingAlert();
}

function showToast(title, message, type = "warning") {
    const toast = document.getElementById("spendingToast");
    const toastTitle = document.getElementById("toastTitle");
    const toastMsg = document.getElementById("toastMessage");

    toastTitle.textContent = title;
    toastMsg.textContent = message;

    const colors = {
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        success: "var(--color-success)"
    };
    toast.querySelector(".glass-panel").style.borderLeftColor = colors[type] || colors.warning;

    toast.style.display = "block";
    toast.style.animation = "none";
    toast.offsetHeight;
    toast.style.animation = "toastSlideIn 0.3s ease";

    if (state.toastTimeout) clearTimeout(state.toastTimeout);
    state.toastTimeout = setTimeout(() => closeToast(), 6000);

    lucide.createIcons();
}

function closeToast() {
    const toast = document.getElementById("spendingToast");
    toast.style.display = "none";
    if (state.toastTimeout) clearTimeout(state.toastTimeout);
}

function checkSpendingAlert() {
    if (state.alertThreshold <= 0) return;
    const metrics = calculateMonthMetrics(state.currentMonth);
    if (metrics.totalIncome === 0) return;

    const pct = metrics.percentageUsed;

    if (pct >= 100) {
        showToast(
            "⚠️ Receita totalmente gasta!",
            `Você gastou 100% da sua receita em ${getMonthNameLabel(state.currentMonth)}.`,
            "danger"
        );
    } else if (pct >= state.alertThreshold) {
        showToast(
            `⚠️ Alerta: ${pct}% da receita gasta`,
            `Você atingiu o limite de ${state.alertThreshold}% definido para ${getMonthNameLabel(state.currentMonth)}.`,
            "warning"
        );
    }
}

// ==========================================================================
// CSV IMPORT FUNCTIONS
// ==========================================================================

let importCsvData = [];
let importCsvHeaders = [];

function openImportModal() {
    document.getElementById("importStep1").style.display = "block";
    document.getElementById("importStep2").style.display = "none";
    document.getElementById("importStep3").style.display = "none";
    document.getElementById("csvFileInput").value = "";
    importCsvData = [];
    importCsvHeaders = [];

    const catSelect = document.getElementById("importDefaultCategory");
    catSelect.innerHTML = "";
    state.data.categories.filter(c => c.type === "expense").forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        catSelect.appendChild(opt);
    });

    toggleModal("importCsvModal", true);
}

function parseCsvFile() {
    const file = document.getElementById("csvFileInput").files[0];
    if (!file) { alert("Selecione um arquivo CSV."); return; }

    const separator = document.getElementById("csvSeparatorInput").value;
    const reader = new FileReader();

    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split("\n").filter(l => l.trim() !== "");
        if (lines.length < 2) { alert("O arquivo CSV parece estar vazio ou inválido."); return; }

        importCsvHeaders = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ""));
        importCsvData = lines.slice(1).map(line => {
            const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ""));
            const row = {};
            importCsvHeaders.forEach((h, i) => row[h] = cols[i] || "");
            return row;
        }).filter(row => Object.values(row).some(v => v !== ""));

        if (importCsvData.length === 0) { alert("Nenhum dado encontrado no CSV."); return; }

        ["importColDate", "importColDesc", "importColAmount", "importColType"].forEach(id => {
            const sel = document.getElementById(id);
            const isOptional = id === "importColType";
            sel.innerHTML = isOptional ? '<option value="">Não usar</option>' : "";
            importCsvHeaders.forEach(h => {
                const opt = document.createElement("option");
                opt.value = h;
                opt.textContent = h;
                sel.appendChild(opt);
            });
        });

        const lower = importCsvHeaders.map(h => h.toLowerCase());
        const guess = (keywords) => {
            const idx = lower.findIndex(h => keywords.some(k => h.includes(k)));
            return idx >= 0 ? importCsvHeaders[idx] : importCsvHeaders[0];
        };
        document.getElementById("importColDate").value = guess(["data", "date", "dt"]);
        document.getElementById("importColDesc").value = guess(["descri", "desc", "histor", "memo", "lancamento"]);
        document.getElementById("importColAmount").value = guess(["valor", "value", "amount", "quantia", "debito", "credito"]);

        document.getElementById("importStep1").style.display = "none";
        document.getElementById("importStep2").style.display = "block";

        lucide.createIcons();
    };

    reader.readAsText(file, "UTF-8");
}

function previewImport() {
    const colDate = document.getElementById("importColDate").value;
    const colDesc = document.getElementById("importColDesc").value;
    const colAmount = document.getElementById("importColAmount").value;
    const colType = document.getElementById("importColType").value;
    const defaultCatId = document.getElementById("importDefaultCategory").value;

    if (!colDate || !colDesc || !colAmount) {
        alert("Por favor, mapeie as colunas de data, descrição e valor.");
        return;
    }

    const list = document.getElementById("importPreviewList");
    list.innerHTML = "";

    importCsvData.forEach((row, idx) => {
        const rawDate = row[colDate] || "";
        const desc = row[colDesc] || "Sem descrição";
        const rawAmount = row[colAmount] || "0";
        const tipo = colType ? (row[colType] || "") : "";

        let amount = parseFloat(rawAmount.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", "."));
        if (isNaN(amount)) amount = 0;
        const absAmount = Math.abs(amount);

        const isIncome = amount > 0 && (tipo.toLowerCase().includes("cred") || tipo.toLowerCase().includes("entrada"));

        let parsedDate = rawDate;
        const dmyMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        const ymdMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dmyMatch) parsedDate = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        else if (ymdMatch) parsedDate = rawDate.substring(0, 10);

        const cat = state.data.categories.find(c => c.id === defaultCatId) || state.data.categories[0];

        const item = document.createElement("div");
        item.className = "glass-panel";
        item.style.cssText = "padding: 10px 14px; display:flex; align-items:center; gap:12px; border-radius:10px;";
        item.innerHTML = `
            <input type="checkbox" id="import-check-${idx}" checked style="width:16px; height:16px; accent-color: var(--color-primary); flex-shrink:0;">
            <div style="flex:1; min-width:0;">
                <div style="font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${desc}</div>
                <div style="font-size:12px; color:var(--color-text-secondary);">${parsedDate}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0;">
                <span style="font-size:13px; font-weight:600; color:${isIncome ? 'var(--color-success)' : 'var(--color-danger)'};">
                    ${isIncome ? '+' : '-'}${formatCurrency(absAmount)}
                </span>
                <span style="font-size:11px; color:var(--color-text-secondary);">${isIncome ? 'Receita' : cat.name}</span>
            </div>
        `;

        item.dataset.date = parsedDate;
        item.dataset.desc = desc;
        item.dataset.amount = absAmount;
        item.dataset.isIncome = isIncome;
        item.dataset.catId = defaultCatId;

        list.appendChild(item);
    });

    document.getElementById("importStep2").style.display = "none";
    document.getElementById("importStep3").style.display = "block";
    lucide.createIcons();
}

function confirmImport() {
    const items = document.querySelectorAll("#importPreviewList > div");
    let imported = 0;
    let skipped = 0;

    items.forEach((item, idx) => {
        const checkbox = document.getElementById(`import-check-${idx}`);
        if (!checkbox || !checkbox.checked) { skipped++; return; }

        const date = item.dataset.date;
        const desc = item.dataset.desc;
        const amount = parseFloat(item.dataset.amount);
        const isIncome = item.dataset.isIncome === "true";
        const catId = item.dataset.catId;

        if (!date || isNaN(amount) || amount <= 0) { skipped++; return; }

        const targetMonth = date.substring(0, 7);
        const monthData = getMonthData(targetMonth);

        if (isIncome) {
            if (!monthData.incomes) monthData.incomes = [];
            monthData.incomes.push({
                id: "inc-" + Date.now() + Math.random().toString(36).substr(2, 5),
                description: desc,
                amount,
                categoryId: "cat-receita-outros",
                date
            });
        } else {
            monthData.expenses.push({
                id: "exp-" + Date.now() + Math.random().toString(36).substr(2, 5),
                description: desc,
                amount,
                categoryId: catId,
                date,
                isRecurring: false
            });
        }
        imported++;
    });

    saveToLocalStorage();
    toggleModal("importCsvModal", false);
    refreshUI();

    showToast(
        "✅ Importação concluída!",
        `${imported} item(s) importado(s)${skipped > 0 ? `, ${skipped} ignorado(s)` : ''}.`,
        "success"
    );
}

// ==========================================================================
// SAVINGS GOAL FUNCTIONS
// ==========================================================================

function openSavingsGoalModal() {
    const monthData = getMonthData(state.currentMonth);
    const currentGoal = monthData.savingsGoal || 0;
    document.getElementById("savingsGoalInput").value = currentGoal > 0 ? currentGoal : "";
    toggleModal("savingsGoalModal", true);
}

function handleSaveSavingsGoal() {
    const input = parseFloat(document.getElementById("savingsGoalInput").value);
    if (isNaN(input) || input < 0) {
        alert("Por favor, insira um valor válido para a meta.");
        return;
    }
    const monthData = getMonthData(state.currentMonth);
    monthData.savingsGoal = input;
    saveToLocalStorage();
    toggleModal("savingsGoalModal", false);
    refreshUI();
}

function renderSavingsGoal() {
    const monthData = getMonthData(state.currentMonth);
    const goal = monthData.savingsGoal || 0;
    const metrics = calculateMonthMetrics(state.currentMonth);
    const saved = metrics.balance;

    const panel = document.getElementById("savingsGoalPanel");
    const subtitle = document.getElementById("savingsGoalSubtitle");
    const bar = document.getElementById("savingsGoalBar");
    const fill = document.getElementById("savingsGoalFill");
    const pct = document.getElementById("savingsGoalPct");
    const status = document.getElementById("savingsGoalStatus");
    const currentLabel = document.getElementById("savingsGoalCurrentLabel");
    const targetLabel = document.getElementById("savingsGoalTargetLabel");

    if (!panel) return;

    if (goal <= 0) {
        subtitle.textContent = "Nenhuma meta definida para este mês. Clique no lápis para definir!";
        bar.style.display = "none";
        panel.style.borderColor = "";
        return;
    }

    bar.style.display = "block";
    subtitle.textContent = "";

    const percentage = Math.min(Math.round((saved / goal) * 100), 100);
    const reached = saved >= goal;

    currentLabel.textContent = `Economizado: ${formatCurrency(Math.max(saved, 0))}`;
    targetLabel.textContent = `Meta: ${formatCurrency(goal)}`;
    fill.style.width = `${Math.max(percentage, 0)}%`;
    pct.textContent = `${Math.max(percentage, 0)}%`;

    if (reached) {
        fill.style.background = "var(--color-success)";
        pct.style.color = "var(--color-success)";
        status.textContent = "🎉 Meta atingida!";
        panel.style.border = "1.5px solid var(--color-success)";
    } else if (saved < 0) {
        fill.style.background = "var(--color-danger)";
        pct.style.color = "var(--color-danger)";
        pct.textContent = "0%";
        fill.style.width = "0%";
        status.textContent = "Saldo negativo — revise seus gastos";
        panel.style.border = "1.5px solid var(--color-danger)";
    } else {
        fill.style.background = "var(--color-info)";
        pct.style.color = "var(--color-info)";
        const missing = goal - saved;
        status.textContent = `Faltam ${formatCurrency(missing)} para atingir a meta`;
        panel.style.border = "";
    }
}

// ==========================================================================
// EXPORT FUNCTIONS (PDF & EXCEL)
// ==========================================================================

function openExportModal() {
    const monthKeys = Object.keys(state.data.months).sort((a, b) => a.localeCompare(b));

    const selectStart = document.getElementById("exportStartMonth");
    const selectEnd = document.getElementById("exportEndMonth");
    selectStart.innerHTML = "";
    selectEnd.innerHTML = "";

    monthKeys.forEach(mKey => {
        const label = getMonthNameLabel(mKey);

        const optS = document.createElement("option");
        optS.value = mKey;
        optS.textContent = label;
        selectStart.appendChild(optS);

        const optE = document.createElement("option");
        optE.value = mKey;
        optE.textContent = label;
        selectEnd.appendChild(optE);
    });

    selectStart.value = state.currentMonth;
    selectEnd.value = state.currentMonth;

    toggleModal("exportModal", true);
}

function getExportData() {
    const startMonth = document.getElementById("exportStartMonth").value;
    const endMonth = document.getElementById("exportEndMonth").value;

    const start = startMonth <= endMonth ? startMonth : endMonth;
    const end = startMonth <= endMonth ? endMonth : startMonth;

    const monthKeys = Object.keys(state.data.months)
        .filter(m => m >= start && m <= end)
        .sort((a, b) => a.localeCompare(b));

    const rows = [];
    monthKeys.forEach(mKey => {
        const monthData = state.data.months[mKey];
        const monthLabel = getMonthNameLabel(mKey);

        (monthData.expenses || []).forEach(exp => {
            const cat = state.data.categories.find(c => c.id === exp.categoryId) || { name: "Outros" };
            rows.push({
                mes: monthLabel,
                tipo: "Despesa",
                descricao: exp.description,
                categoria: cat.name,
                data: exp.date.split("-").reverse().join("/"),
                valor: -exp.amount
            });
        });

        (monthData.incomes || []).forEach(inc => {
            const cat = state.data.categories.find(c => c.id === inc.categoryId) || { name: "Outros" };
            rows.push({
                mes: monthLabel,
                tipo: "Receita",
                descricao: inc.description,
                categoria: cat.name,
                data: inc.date.split("-").reverse().join("/"),
                valor: inc.amount
            });
        });
    });

    return { rows, start, end, monthKeys };
}

function exportToExcel() {
    const { rows, start, end } = getExportData();

    if (rows.length === 0) {
        alert("Nenhum dado encontrado no período selecionado.");
        return;
    }

    const wsData = [
        ["Mês", "Tipo", "Descrição", "Categoria", "Data", "Valor (R$)"],
        ...rows.map(r => [r.mes, r.tipo, r.descricao, r.categoria, r.data, r.valor])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
        { wch: 18 }, { wch: 10 }, { wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Relatório");

    const startLabel = getMonthNameLabel(start).replace(" de ", "-");
    const endLabel = getMonthNameLabel(end).replace(" de ", "-");
    const filename = start === end
        ? `FinTrack_${startLabel}.xlsx`
        : `FinTrack_${startLabel}_ate_${endLabel}.xlsx`;

    XLSX.writeFile(wb, filename);
    toggleModal("exportModal", false);
}

function exportToPDF() {
    const { rows, start, end, monthKeys } = getExportData();

    if (rows.length === 0) {
        alert("Nenhum dado encontrado no período selecionado.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const primaryColor = [99, 102, 241];
    const successColor = [16, 185, 129];
    const dangerColor = [244, 63, 94];

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("FinTrack", 14, 13);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório Financeiro", 14, 21);

    const startLabel = getMonthNameLabel(start);
    const endLabel = getMonthNameLabel(end);
    const periodText = start === end ? startLabel : `${startLabel} até ${endLabel}`;
    doc.setFontSize(10);
    doc.text(`Período: ${periodText}`, 210 - 14, 21, { align: "right" });

    let yPos = 36;

    monthKeys.forEach(mKey => {
        const metrics = calculateMonthMetrics(mKey);
        const monthLabel = getMonthNameLabel(mKey);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(monthLabel, 14, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        doc.setFillColor(240, 253, 244);
        doc.roundedRect(14, yPos, 55, 12, 2, 2, "F");
        doc.setTextColor(...successColor);
        doc.text("RECEITAS", 16, yPos + 4.5);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(metrics.totalIncome), 16, yPos + 9.5);

        doc.setFillColor(255, 241, 242);
        doc.roundedRect(74, yPos, 55, 12, 2, 2, "F");
        doc.setTextColor(...dangerColor);
        doc.setFont("helvetica", "normal");
        doc.text("DESPESAS", 76, yPos + 4.5);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(metrics.totalSpent), 76, yPos + 9.5);

        const balColor = metrics.balance >= 0 ? successColor : dangerColor;
        doc.setFillColor(248, 248, 255);
        doc.roundedRect(134, yPos, 62, 12, 2, 2, "F");
        doc.setTextColor(...balColor);
        doc.setFont("helvetica", "normal");
        doc.text("SALDO", 136, yPos + 4.5);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(metrics.balance), 136, yPos + 9.5);

        yPos += 18;

        const monthRows = rows.filter(r => r.mes === monthLabel);
        if (monthRows.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [["Tipo", "Descrição", "Categoria", "Data", "Valor (R$)"]],
                body: monthRows.map(r => [
                    r.tipo,
                    r.descricao,
                    r.categoria,
                    r.data,
                    (r.valor >= 0 ? "+" : "") + formatCurrency(Math.abs(r.valor))
                ]),
                styles: { fontSize: 8.5, cellPadding: 2.5 },
                headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold" },
                columnStyles: {
                    0: { cellWidth: 18 },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 22 },
                    4: { cellWidth: 28, halign: "right" }
                },
                didParseCell: (data) => {
                    if (data.section === "body" && data.column.index === 4) {
                        const val = monthRows[data.row.index]?.valor;
                        if (val !== undefined) {
                            data.cell.styles.textColor = val >= 0 ? successColor : dangerColor;
                            data.cell.styles.fontStyle = "bold";
                        }
                    }
                    if (data.section === "body" && data.column.index === 0) {
                        const tipo = data.cell.raw;
                        data.cell.styles.textColor = tipo === "Receita" ? successColor : dangerColor;
                        data.cell.styles.fontStyle = "bold";
                    }
                },
                margin: { left: 14, right: 14 },
                theme: "grid"
            });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        if (yPos > 260 && monthKeys.indexOf(mKey) < monthKeys.length - 1) {
            doc.addPage();
            yPos = 14;
        }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(`FinTrack • Gerado em ${new Date().toLocaleDateString("pt-BR")} • Página ${i} de ${pageCount}`, 105, 292, { align: "center" });
    }

    const startL = getMonthNameLabel(start).replace(" de ", "-");
    const endL = getMonthNameLabel(end).replace(" de ", "-");
    const filename = start === end
        ? `FinTrack_${startL}.pdf`
        : `FinTrack_${startL}_ate_${endL}.pdf`;

    doc.save(filename);
    toggleModal("exportModal", false);
}

// ==========================================================================
// 7. EVENT LISTENERS ATTACHMENT & INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Load LocalStorage & state setup
    initLocalStorage();

    // 2. Attach Sidebar navigation buttons click listeners
    document.querySelectorAll("#navMenu li").forEach(li => {
        li.onclick = () => switchTab(li.getAttribute("data-tab"));
    });

    // 3. Attach Month Quick Selector listeners
    document.getElementById("prevMonthBtn").onclick = handlePrevMonth;
    document.getElementById("nextMonthBtn").onclick = handleNextMonth;

    // 4. Attach Theme Switch button listener
    document.getElementById("themeToggleBtn").onclick = () => {
        setTheme(state.theme === "dark" ? "light" : "dark");
    };

    document.getElementById("resetDataBtn").onclick = handleResetApplication;
    document.getElementById("genericConfirmCancelBtn").onclick = () => toggleModal("genericConfirmModal", false);
    document.getElementById("cancelResetBtn").onclick = () => toggleModal("resetConfirmModal", false);
    document.getElementById("confirmResetBtn").onclick = executeResetCurrentMonth;

    // 5. Setup modals opening & close triggers
    document.getElementById("openAddExpenseModalBtn").onclick = openAddExpenseModal;
    document.getElementById("closeExpenseModalBtn").onclick = () => {
        state.editingExpenseId = null;
        document.getElementById("expenseModalTitle").textContent = "Cadastrar Gasto";
        document.getElementById("saveExpenseBtn").textContent = "Salvar Despesa";
        toggleModal("expenseModal", false);
    };
    document.getElementById("cancelExpenseBtn").onclick = () => {
        state.editingExpenseId = null;
        document.getElementById("expenseModalTitle").textContent = "Cadastrar Gasto";
        document.getElementById("saveExpenseBtn").textContent = "Salvar Despesa";
        toggleModal("expenseModal", false);
    };

    // Income Modal events
    document.getElementById("openAddIncomeModalBtn").onclick = openAddIncomeModal;
    document.getElementById("closeIncomeModalBtn").onclick = () => {
        state.editingIncomeId = null;
        document.getElementById("incomeModalTitle").textContent = "Cadastrar Receita";
        toggleModal("incomeModal", false);
    };
    document.getElementById("cancelIncomeBtn").onclick = () => {
        state.editingIncomeId = null;
        document.getElementById("incomeModalTitle").textContent = "Cadastrar Receita";
        toggleModal("incomeModal", false);
    };
    document.getElementById("incomeForm").onsubmit = (e) => {
        e.preventDefault();
        handleSaveIncome();
    };

    if (document.getElementById("editBudgetQuickBtn")) {
        document.getElementById("editBudgetQuickBtn").onclick = openEditBudgetModal;
        document.getElementById("closeBudgetModalBtn").onclick = () => toggleModal("budgetModal", false);
        document.getElementById("cancelBudgetBtn").onclick = () => toggleModal("budgetModal", false);
    }

    // Edit Category Modal
    document.getElementById("closeEditCategoryModalBtn").onclick = () => {
        state.editingCategoryId = null;
        toggleModal("editCategoryModal", false);
    };
    document.getElementById("cancelEditCategoryBtn").onclick = () => {
        state.editingCategoryId = null;
        toggleModal("editCategoryModal", false);
    };
    document.getElementById("editCategoryForm").onsubmit = (e) => {
        e.preventDefault();
        handleUpdateCategory();
    };

    // 6. Setup Modal Form Submissions
    document.getElementById("expenseForm").onsubmit = (e) => {
        e.preventDefault();
        handleSaveExpense();
    };

    if (document.getElementById("budgetForm")) {
        document.getElementById("budgetForm").onsubmit = (e) => {
            e.preventDefault();
            handleSaveBudget();
        };
    }

    document.getElementById("createCategoryForm").onsubmit = (e) => {
        e.preventDefault();
        handleSaveCategory();
    };

    // 7. Reactive Search & Category filters on Dashboard Expenses table
    document.getElementById("searchExpenseInput").oninput = (e) => {
        state.searchQuery = e.target.value;
        renderExpensesListTable();
    };

    document.getElementById("filterCategorySelect").onchange = (e) => {
        state.filterCategory = e.target.value;
        renderExpensesListTable();
    };

    // 8. Period selectors change event in Comparison Screen
    document.getElementById("compMonthASelect").onchange = renderComparison;
    document.getElementById("compMonthBSelect").onchange = renderComparison;

    document.getElementById("swapComparisonMonthsBtn").onclick = () => {
        const selectA = document.getElementById("compMonthASelect");
        const selectB = document.getElementById("compMonthBSelect");
        const temp = selectA.value;
        selectA.value = selectB.value;
        selectB.value = temp;
        renderComparison();
    };

    // Dynamic load of category filter selectors
    const filterSelect = document.getElementById("filterCategorySelect");
    state.data.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        filterSelect.appendChild(opt);
    });

    // Alert threshold modal
    document.getElementById("openAlertThresholdModalBtn").onclick = openAlertThresholdModal;
    document.getElementById("closeAlertThresholdModalBtn").onclick = () => toggleModal("alertThresholdModal", false);
    document.getElementById("cancelAlertThresholdBtn").onclick = () => toggleModal("alertThresholdModal", false);
    document.getElementById("saveAlertThresholdBtn").onclick = handleSaveAlertThreshold;

    // Dashboard period filter
    if (document.getElementById("clearDashPeriodBtn")) {
        document.getElementById("clearDashPeriodBtn").onclick = clearDashboardPeriod;
    }

    // CSV Import modal
    document.getElementById("openImportModalBtn").onclick = openImportModal;
    document.getElementById("closeImportModalBtn").onclick = () => toggleModal("importCsvModal", false);
    document.getElementById("cancelImportBtn").onclick = () => toggleModal("importCsvModal", false);
    document.getElementById("parseImportCsvBtn").onclick = parseCsvFile;
    document.getElementById("backImportBtn").onclick = () => {
        document.getElementById("importStep2").style.display = "none";
        document.getElementById("importStep1").style.display = "block";
    };
    document.getElementById("previewImportBtn").onclick = previewImport;
    document.getElementById("backImportStep3Btn").onclick = () => {
        document.getElementById("importStep3").style.display = "none";
        document.getElementById("importStep2").style.display = "block";
    };
    document.getElementById("confirmImportBtn").onclick = confirmImport;

    // Savings Goal modal
    document.getElementById("openSavingsGoalModalBtn").onclick = openSavingsGoalModal;
    document.getElementById("closeSavingsGoalModalBtn").onclick = () => toggleModal("savingsGoalModal", false);
    document.getElementById("cancelSavingsGoalBtn").onclick = () => toggleModal("savingsGoalModal", false);
    document.getElementById("saveSavingsGoalBtn").onclick = handleSaveSavingsGoal;

    // Export modal
    document.getElementById("openExportModalBtn").onclick = openExportModal;
    document.getElementById("closeExportModalBtn").onclick = () => toggleModal("exportModal", false);
    document.getElementById("cancelExportBtn").onclick = () => toggleModal("exportModal", false);
    document.getElementById("exportExcelBtn").onclick = exportToExcel;
    document.getElementById("exportPdfBtn").onclick = exportToPDF;

    // 9. Close overlays when clicking outside the box
    window.onclick = (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            toggleModal(e.target.id, false);
        }
    };

    // Render initial viewport
    refreshUI();
});
