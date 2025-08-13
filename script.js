// بيانات البرنامج
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || [];
let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
let reminderTime = localStorage.getItem("reminderTime") || null;

// قائمة الأيقونات المتاحة
const materialIconsList = [
    "restaurant", "directions_bus", "receipt", "celebration", "school", "local_hospital",
    "checkroom", "redeem", "category", "payments", "trending_up", "workspace_premium", "sell",
    "shopping_cart", "home", "auto_mode", "credit_card", "fitness_center", "pets",
    "electric_bolt", "wifi", "water_drop", "lightbulb", "phone_iphone", "tv", "book",
    "fastfood", "coffee", "cake", "local_taxi", "flight", "train", "two_wheeler",
    "car_rental", "luggage", "bed", "chair", "table_bar", "toys", "sports_soccer",
    "diamond", "ring_volume", "brush", "construction", "cleaning_services", "handyman",
    "palette", "camera_alt", "music_note", "theater_comedy", "attractions", "park",
    "nature", "beach_access", "umbrella", "hotel", "food_bank", "volunteer_activism",
    "child_care", "elderly", "accessible", "store", "local_florist", "bakery_dining",
    "local_gas_station", "ev_station", "medication", "vaccines", "emergency", "add_card",
    "atm", "currency_exchange", "savings", "wallet", "account_balance", "pie_chart",
    "bar_chart", "cloud_download", "person", "settings", "notifications", "security",
    "language", "translate", "light_mode", "dark_mode", "filter_list", "sort", "search",
    "add", "remove", "edit", "delete", "check_circle", "cancel", "arrow_forward",
    "chevron_left", "chevron_right", "more_vert", "refresh", "star", "favorite",
    "thumb_up", "thumb_down", "face", "sentiment_satisfied", "sentiment_dissatisfied",
    "sentiment_neutral"
].sort();

// تصنيفات افتراضية
let defaultCategories = [
    { name: "طعام وشراب", icon: "restaurant" }, { name: "مواصلات", icon: "directions_bus" },
    { name: "فواتير", icon: "receipt" }, { name: "تسلية", icon: "celebration" },
    { name: "تعليم", icon: "school" }, { name: "صحة", icon: "local_hospital" },
    { name: "ملابس", icon: "checkroom" }, { name: "هدايا", icon: "redeem" },
    { name: "متفرقات", icon: "category" }, { name: "راتب", icon: "payments" },
    { name: "استثمار", icon: "trending_up" }, { name: "مكافأة", icon: "workspace_premium" },
    { name: "بيع", icon: "sell" }
];

let categories = JSON.parse(localStorage.getItem("categories")) || [];
if (categories.length === 0) {
    categories = defaultCategories;
    localStorage.setItem("categories", JSON.stringify(categories));
} else {
    categories = categories.map(cat => (typeof cat === 'string') ? { name: cat, icon: defaultCategories.find(d => d.name === cat)?.icon || "category" } : cat);
    defaultCategories.forEach(dCat => { if (!categories.some(c => c.name === dCat.name)) categories.push(dCat); });
    categories.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    localStorage.setItem("categories", JSON.stringify(categories));
}

let selectedAccountIndex = parseInt(localStorage.getItem("selectedAccountIndex")) || 0;
if (accounts.length > 0 && selectedAccountIndex >= accounts.length) selectedAccountIndex = 0;
else if (accounts.length === 0) selectedAccountIndex = null;
localStorage.setItem("selectedAccountIndex", selectedAccountIndex);

transactions.forEach(t => {
    t.selected = t.selected === undefined ? true : t.selected;
    t.from = t.from === undefined ? "" : t.from;
    if (typeof t.category === 'string') t.category = categories.find(c => c.name === t.category) || { name: t.category, icon: "category" };
    else if (!t.category || !t.category.name) t.category = { name: "غير محدد", icon: "category" };
    else if (!t.category.icon) t.category.icon = categories.find(c => c.name === t.category.name)?.icon || "category";
});
localStorage.setItem("transactions", JSON.stringify(transactions));

// --- NEW State Variables ---
let homeBalancePeriod = 'monthly'; // 'daily', 'monthly', 'yearly'
let categoryChartPeriod = 'thisMonth'; // 'daily', 'thisMonth', 'lastMonth', 'thisYear', 'lastYear', 'custom'
let categoryChartCustomStart = null;
let categoryChartCustomEnd = null;
// ----------------------------

let filteredTransactions = [];
let isSearchActive = false;
let currentTransactionYear = new Date().getFullYear();
let transactionPeriod = 'yearly';
let transactionCurrentMonth = new Date().getMonth();
let transactionCurrentDay = new Date().getDate();
let currentSortBy = 'date-desc';
let selectedIconForCategory = "category";
let currentTheme = localStorage.getItem('theme') || 'system';

// --- Theme Management ---
function applyTheme(themeName) {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    if (themeName === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
        body.classList.add(themeName === 'dark' ? 'dark-theme' : 'light-theme');
    }
}
window.setTheme = function(themeName) {
    currentTheme = themeName;
    localStorage.setItem('theme', themeName);
    applyTheme(themeName);
    refreshAllData(); // Refresh charts with new theme colors
}
function loadTheme() {
    applyTheme(currentTheme);
    if (currentTheme === 'system') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme('system'));
    }
}

function toggleMenu() { document.getElementById('sideMenu').classList.toggle('active'); }

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    highlightNav(tabId);
    window.scrollTo({top: 0, behavior: 'smooth'});

    const fabContainer = document.querySelector('.fab-container');
    fabContainer.style.display = 'flex'; // Always show FAB now
    if (fabContainer.style.display === 'none') closeFabMenu();

    // Refresh data for the specific tab
    if (tabId === 'home') {
        updateHomeView();
    } else if (tabId === 'transactions') {
        if (!isSearchActive) {
            transactionPeriod = 'yearly';
            currentTransactionYear = new Date().getFullYear();
        }
        updateTransactionsHeader();
        loadTransactions();
    } else if (tabId === 'stats') {
        updateCharts();
    }
}

function highlightNav(tabId) {
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    const navId = `nav${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`;
    const navButton = document.getElementById(navId);
    if (navButton) navButton.classList.add('active');
}

// --- MODIFIED Open/Close Modals ---
function openTransactionModal(type = 'مصروف') {
    if (accounts.length === 0) { alert("يجب إضافة حساب واحد على الأقل."); return; }
    document.getElementById('transactionForm').reset(); // Reset first
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('type').value = type; // Set type after reset
    document.getElementById('addTransactionModal').classList.add('active');
    loadCategorySelects();
    loadAccountSelects('addTransaction');
    closeFabMenu();
}
function closeTransactionModal() { document.getElementById('addTransactionModal').classList.remove('active'); }
let editIndex = null;
function openEditModal(originalIndex) {
    editIndex = originalIndex;
    const t = transactions[originalIndex];
    if (!t) return;
    loadCategorySelects();
    loadAccountSelects('editTransaction');
    document.getElementById('editType').value = t.type;
    document.getElementById('editAmount').value = t.amount;
    document.getElementById('editCategory').value = t.category.name;
    document.getElementById('editDate').value = t.date;
    document.getElementById('editAccountSelect').value = t.account; // السطر المُعدّل
    document.getElementById('editNote').value = t.note;
    document.getElementById('editFrom').value = t.from || '';
    document.getElementById('editTransactionModal').classList.add('active');
}
function closeEditModal() { document.getElementById('editTransactionModal').classList.remove('active'); editIndex = null; }
function openSearchModal() { document.getElementById('searchModal').classList.add('active'); loadSearchCategorySelects(); loadSearchAccountSelects(); }
function closeSearchModal() { document.getElementById('searchModal').classList.remove('active'); }
function openManageAccountsModal() { document.getElementById('manageAccountsModal').classList.add('active'); loadAccounts(); updateCurrentAccountTotal(); }
function closeManageAccountsModal() { document.getElementById('manageAccountsModal').classList.remove('active'); }
function openBudgetModal() { document.getElementById('budgetModal').classList.add('active'); loadBudgetCategorySelect(); loadAccountSelects('budget'); updateBudgetTable(); }
function closeBudgetModal() { document.getElementById('budgetModal').classList.remove('active'); document.getElementById('budgetForm').reset(); }
function openProfileModal() { document.getElementById('profileModal').classList.add('active'); document.querySelector(`input[name="theme"][value="${currentTheme}"]`).checked = true; }
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
function openCategoriesModal() {
    document.getElementById('categoriesModal').classList.add('active');
    loadCategories();
    document.getElementById('categoryForm').reset();
    selectedIconForCategory = "category";
    document.getElementById('selectedCategoryIcon').textContent = selectedIconForCategory;
    document.getElementById('categoryIcon').value = selectedIconForCategory;
}
function closeCategoriesModal() { document.getElementById('categoriesModal').classList.remove('active'); }
function openStatsModal() { document.getElementById('statsModal').classList.add('active'); updateCharts(); }
function closeStatsModal() { document.getElementById('statsModal').classList.remove('active'); }
function openBackupModal() { document.getElementById('backupModal').classList.add('active'); }
function closeBackupModal() { document.getElementById('backupModal').classList.remove('active'); }
function openIconPicker() { document.getElementById('iconPickerModal').classList.add('active'); renderIconsInPicker(); }
function closeIconPickerModal() { document.getElementById('iconPickerModal').classList.remove('active'); }
// New Modal Functions
function openReminderModal() { document.getElementById('reminderModal').classList.add('active'); document.getElementById('reminderTime').value = reminderTime; }
function closeReminderModal() { document.getElementById('reminderModal').classList.remove('active'); }
function openCustomDateModal() { document.getElementById('customDateModal').classList.add('active'); }
function closeCustomDateModal() { document.getElementById('customDateModal').classList.remove('active'); }


function renderIconsInPicker() {
    const iconGrid = document.getElementById('iconGrid');
    iconGrid.innerHTML = '';
    materialIconsList.forEach(iconName => {
        const iconItem = document.createElement('div');
        iconItem.className = `icon-item ${selectedIconForCategory === iconName ? 'selected' : ''}`;
        iconItem.onclick = () => selectIcon(iconName);
        iconItem.innerHTML = `<span class="material-icons">${iconName}</span>`;
        iconGrid.appendChild(iconItem);
    });
}
window.selectIcon = function(iconName) {
    selectedIconForCategory = iconName;
    document.getElementById('categoryIcon').value = iconName;
    document.getElementById('selectedCategoryIcon').textContent = iconName;
    renderIconsInPicker(); // Re-render to show selection
};

// FAB
function toggleFabMenu() { document.querySelector('.fab-container').classList.toggle('active'); document.querySelector('.fab').classList.toggle('open'); }
function closeFabMenu() { document.querySelector('.fab-container').classList.remove('active'); document.querySelector('.fab').classList.remove('open'); }

// --- Reminder Logic ---
document.getElementById('reminderForm').onsubmit = function(e) {
    e.preventDefault();
    reminderTime = document.getElementById('reminderTime').value;
    localStorage.setItem('reminderTime', reminderTime);
    alert('تم حفظ وقت التذكير.');
    closeReminderModal();
}
window.clearReminder = function() {
    reminderTime = null;
    localStorage.removeItem('reminderTime');
    alert('تم إلغاء التذكير.');
    closeReminderModal();
}
function checkReminder() {
    if (reminderTime) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        // Check if the app was opened within 1 minute of the reminder time
        if (currentTime === reminderTime) {
            const lastNotified = localStorage.getItem('lastNotified');
            const today = now.toISOString().split('T')[0];
            if (lastNotified !== today) {
                alert('⏰ تذكير! لا تنسَ تسجيل معاملاتك اليوم.');
                localStorage.setItem('lastNotified', today);
            }
        }
    }
}


// Accounts Management
document.getElementById("accountForm").onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById("accountName").value.trim();
    if (!name || accounts.some(acc => acc.name === name)) {
        alert(!name ? "الرجاء إدخال اسم الحساب." : "يوجد حساب بنفس هذا الاسم بالفعل.");
        return;
    }
    const currency = document.getElementById("accountCurrency").value;
    accounts.push({ name, currency });
    if (accounts.length === 1) selectedAccountIndex = 0;
    localStorage.setItem("accounts", JSON.stringify(accounts));
    localStorage.setItem("selectedAccountIndex", selectedAccountIndex);
    refreshAllData();
    this.reset();
};
function loadAccounts() {
    const tbody = document.querySelector("#accountsTable tbody");
    tbody.innerHTML = "";
    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">لا توجد حسابات.</td></tr>';
        return;
    }
    accounts.forEach((acc, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${acc.name}</td><td>${acc.currency}</td>
            <td><input type="radio" name="selectAccount" ${i === selectedAccountIndex ? "checked" : ""} onclick="setSelectedAccount(${i})"></td>
            <td><button class="delete-btn" onclick="deleteAccount(${i})"><span class="material-icons">delete</span></button></td>`;
        tbody.appendChild(tr);
    });
}
window.setSelectedAccount = function(i) {
    selectedAccountIndex = i;
    localStorage.setItem("selectedAccountIndex", selectedAccountIndex);
    refreshAllData();
}
window.deleteAccount = function(i) {
    if(confirm("سيتم حذف الحساب وكل المعاملات والميزانيات المرتبطة به. هل أنت متأكد؟")){
        const accName = accounts[i].name;
        transactions = transactions.filter(t => t.account !== accName);
        budgets = budgets.filter(b => b.account !== accName);
        accounts.splice(i,1);
        if (selectedAccountIndex === i) selectedAccountIndex = accounts.length > 0 ? 0 : null;
        else if (selectedAccountIndex > i) selectedAccountIndex--;
        localStorage.setItem("transactions", JSON.stringify(transactions));
        localStorage.setItem("budgets", JSON.stringify(budgets));
        localStorage.setItem("accounts", JSON.stringify(accounts));
        localStorage.setItem("selectedAccountIndex", selectedAccountIndex);
        refreshAllData();
    }
}
function updateCurrentAccountTotal() {
    const totalSpan = document.getElementById('currentAccountTotal');
    const currencySpan = document.getElementById('currentAccountCurrency');
    if (accounts.length === 0 || selectedAccountIndex === null) {
        totalSpan.textContent = "0.00"; currencySpan.textContent = ""; return;
    }
    const acc = accounts[selectedAccountIndex];
    const balance = transactions.filter(t => t.account === acc.name && t.selected)
        .reduce((sum, t) => sum + (t.type === "دخل" ? t.amount : -t.amount), 0);
    totalSpan.textContent = balance.toFixed(2);
    currencySpan.textContent = acc.currency;
}

// Categories Management
document.getElementById("categoryForm").onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById("newCategoryName").value.trim();
    if (!name || categories.some(cat => cat.name === name)) {
        alert(!name ? "الرجاء إدخال اسم التصنيف." : "هذا التصنيف موجود بالفعل.");
        return;
    }
    categories.push({ name, icon: selectedIconForCategory });
    categories.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    localStorage.setItem("categories", JSON.stringify(categories));
    refreshAllData();
    this.reset();
    selectedIconForCategory = "category";
    document.getElementById('selectedCategoryIcon').textContent = selectedIconForCategory;
    document.getElementById('categoryIcon').value = selectedIconForCategory;
};
function loadCategories() {
    const list = document.getElementById("categoriesList");
    list.innerHTML = "";
    categories.forEach(cat => {
        list.innerHTML += `<li><span><span class="material-icons">${cat.icon || 'category'}</span> ${cat.name}</span>
            <button onclick="deleteCategory('${cat.name}')"><span class="material-icons">delete</span> حذف</button></li>`;
    });
}
window.deleteCategory = function(name) {
    if (confirm(`هل أنت متأكد من حذف التصنيف "${name}"؟`)) {
        categories = categories.filter(cat => cat.name !== name);
        transactions.forEach(t => { if (t.category.name === name) t.category = { name: "متفرقات", icon: "category" }; });
        localStorage.setItem("categories", JSON.stringify(categories));
        localStorage.setItem("transactions", JSON.stringify(transactions));
        refreshAllData();
    }
};

// Form Select Loaders
function loadAccountSelects(target = 'home') {
    const selects = [
        document.getElementById("homeAccountSelect"),
        document.getElementById("transactionsAccountSelect"),
        document.getElementById("accountSelect"),
        document.getElementById("editAccountSelect"),
        document.getElementById("budgetAccountSelect")
    ];

    selects.forEach(select => {
        select.innerHTML = "";
        select.disabled = accounts.length === 0;

        if (accounts.length === 0) {
            select.innerHTML = "<option disabled selected>أضف حساباً أولاً</option>";
            return;
        }

        accounts.forEach((acc, i) => {
            const isSelected = i === selectedAccountIndex;
            select.innerHTML += `<option value="${acc.name}" ${isSelected ? "selected" : ""}>${acc.name} (${acc.currency})</option>`;
        });
    });

    loadSearchAccountSelects();
}

window.changeHomeAccount = function(index) {
    setSelectedAccount(parseInt(index));
}
window.changeTransactionsAccount = function(index) {
    setSelectedAccount(parseInt(index));
}


function loadCategorySelects() {
    const selects = [document.getElementById("category"), document.getElementById("editCategory")];
    selects.forEach(select => {
        select.innerHTML = "<option value='' disabled selected>اختر تصنيفاً</option>";
        categories.forEach(cat => { select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`; });
    });
}
function loadBudgetCategorySelect() {
    const select = document.getElementById("budgetCategory");
    select.innerHTML = "<option value='' disabled selected>اختر تصنيفاً</option>";
    categories.forEach(cat => { select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`; });
}
function loadSearchCategorySelects() {
    const select = document.getElementById("searchCategory");
    select.innerHTML = "<option value=''>الكل</option>";
    categories.forEach(cat => { select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`; });
    select.innerHTML += "<option value='غير محدد'>غير محدد</option>";
}
function loadSearchAccountSelects() {
    const select = document.getElementById("searchAccount");
    select.innerHTML = "<option value=''>الكل</option>";
    accounts.forEach(acc => { select.innerHTML += `<option value="${acc.name}">${acc.name} (${acc.currency})</option>`; });
}


// Transaction Logic
document.getElementById("transactionForm").onsubmit = function(e) {
    e.preventDefault();
    const type = document.getElementById("type").value;
    const amount = Number(document.getElementById("amount").value);
    const categoryName = document.getElementById("category").value;
    const date = document.getElementById("date").value;
    const account = accounts[selectedAccountIndex].name;
    const note = document.getElementById("note").value.trim();
    const from = document.getElementById("from").value.trim();
    if (!categoryName || !date || !account || amount <= 0) { alert("يرجى ملء جميع الحقول المطلوبة بشكل صحيح."); return; }
    const selectedCategory = categories.find(cat => cat.name === categoryName);
    transactions.push({type, amount, category: selectedCategory, date, account, note, from, selected: true});
    localStorage.setItem("transactions", JSON.stringify(transactions));
    refreshAllData();
    closeTransactionModal();
};
document.getElementById("editTransactionForm").onsubmit = function(e){
    e.preventDefault();
    if(editIndex === null) return;
    const t = transactions[editIndex];
    const editedCategory = categories.find(cat => cat.name === document.getElementById('editCategory').value);
    t.type = document.getElementById('editType').value;
    t.amount = Number(document.getElementById('editAmount').value);
    t.category = editedCategory;
    t.date = document.getElementById('editDate').value;
    t.account = document.getElementById('editAccountSelect').value;
    t.note = document.getElementById('editNote').value.trim();
    t.from = document.getElementById('editFrom').value.trim();
    localStorage.setItem("transactions", JSON.stringify(transactions));
    refreshAllData();
    closeEditModal();
}
window.deleteTransaction = function(originalIndex) {
    if (confirm("هل أنت متأكد من حذف هذه المعاملة؟")) {
        transactions.splice(originalIndex, 1);
        localStorage.setItem("transactions", JSON.stringify(transactions));
        refreshAllData();
    }
}
window.toggleTransactionSelection = function(originalIndex) {
    if (transactions[originalIndex]) {
        transactions[originalIndex].selected = !transactions[originalIndex].selected;
        localStorage.setItem("transactions", JSON.stringify(transactions));
        refreshAllData();
    }
};

// --- Home Page View Update ---
function updateHomeView() {
    loadAccountSelects('home');
    updateHomeBalance();
    updateCategoryBreakdownChart();
    loadRecentTransactions();
}

function updateHomeBalance() {
    const totalBalanceEl = document.getElementById('totalBalance');
    const totalCurrencyEl = document.getElementById('totalCurrency');
    const incomeEl = document.getElementById('currentPeriodIncome');
    const expenseEl = document.getElementById('currentPeriodExpense');
    const incomeLabel = document.getElementById('homeIncomeLabel');
    const expenseLabel = document.getElementById('homeExpenseLabel');

    if (accounts.length === 0 || selectedAccountIndex === null) {
        [totalBalanceEl, incomeEl, expenseEl].forEach(el => el.textContent = "0.00");
        totalCurrencyEl.textContent = "";
        incomeLabel.textContent = "الدخل";
        expenseLabel.textContent = "المصروف";
        return;
    }

    const acc = accounts[selectedAccountIndex];
    const accName = acc.name;
    const curr = acc.currency;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMonthStr = now.toISOString().slice(0, 7);
    const currentYearStr = now.getFullYear().toString();

    let totalBalance = 0, incomePeriod = 0, expensePeriod = 0;

    const accountTransactions = transactions.filter(t => t.account === accName && t.selected);
    
    totalBalance = accountTransactions.reduce((sum, t) => sum + (t.type === "دخل" ? t.amount : -t.amount), 0);
    
    let periodTransactions = [];
    if (homeBalancePeriod === 'daily') {
        periodTransactions = accountTransactions.filter(t => t.date === todayStr);
        incomeLabel.textContent = "الدخل اليومي";
        expenseLabel.textContent = "المصروف اليومي";
    } else if (homeBalancePeriod === 'monthly') {
        periodTransactions = accountTransactions.filter(t => t.date.slice(0, 7) === currentMonthStr);
        incomeLabel.textContent = "الدخل الشهري";
        expenseLabel.textContent = "المصروف الشهري";
    } else if (homeBalancePeriod === 'yearly') {
        periodTransactions = accountTransactions.filter(t => t.date.slice(0, 4) === currentYearStr);
        incomeLabel.textContent = "الدخل السنوي";
        expenseLabel.textContent = "المصروف السنوي";
    }

    periodTransactions.forEach(t => {
        if (t.type === "دخل") incomePeriod += t.amount;
        else expensePeriod += t.amount;
    });

    totalBalanceEl.textContent = totalBalance.toFixed(2);
    totalCurrencyEl.textContent = curr;
    incomeEl.textContent = incomePeriod.toFixed(2);
    expenseEl.textContent = expensePeriod.toFixed(2);
}

let categoryChartInstance;
function updateCategoryBreakdownChart() {
    const ctx = document.getElementById('categoryBreakdownChart').getContext('2d');
    const chartTitleEl = document.getElementById('categoryChartTitle');
    if (categoryChartInstance) categoryChartInstance.destroy();

    if (accounts.length === 0 || selectedAccountIndex === null) return;
    const accName = accounts[selectedAccountIndex].name;
    const expenseByCategory = {};

    const now = new Date();
    let startDate, endDate;
    let title = "المصروفات حسب التصنيف";

    switch(categoryChartPeriod) {
        case 'daily':
            startDate = new Date(now.setHours(0,0,0,0));
            endDate = new Date(now.setHours(23,59,59,999));
            title += " (اليوم)";
            break;
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            title += " (هذا الشهر)";
            break;
        case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            title += " (الشهر الماضي)";
            break;
        case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            title += " (هذه السنة)";
            break;
        case 'lastYear':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            title += " (السنة الماضية)";
            break;
        case 'custom':
            if (categoryChartCustomStart && categoryChartCustomEnd) {
                startDate = new Date(categoryChartCustomStart);
                endDate = new Date(categoryChartCustomEnd);
                endDate.setHours(23, 59, 59, 999); // Include the whole end day
                title += ` (${categoryChartCustomStart} - ${categoryChartCustomEnd})`;
            } else { // Default to this month if custom dates not set
                 startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                 endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            break;
    }
    
    chartTitleEl.textContent = title;

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (t.account === accName && t.type === "مصروف" && t.selected && tDate >= startDate && tDate <= endDate) {
            const categoryName = t.category.name || 'غير محدد';
            expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + t.amount;
        }
    });

    const sortedCategories = Object.entries(expenseByCategory).sort(([,a],[,b]) => b-a).slice(0, 7);
    const labels = sortedCategories.map(([name]) => name);
    const data = sortedCategories.map(([, amount]) => amount);

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color');

    categoryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'المصروفات',
                data: data,
                backgroundColor: 'rgba(56, 118, 234, 0.7)',
                borderColor: 'rgba(56, 118, 234, 1)',
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { display: false } }
            }
        }
    });
}
window.setHomeBalancePeriod = function(period) {
    homeBalancePeriod = period;
    updateHomeBalance();
}
window.setCategoryChartPeriod = function(period) {
    categoryChartPeriod = period;
    updateCategoryBreakdownChart();
}
document.getElementById('customDateForm').onsubmit = function(e) {
    e.preventDefault();
    const from = document.getElementById('customDateFrom').value;
    const to = document.getElementById('customDateTo').value;
    if (from && to && to >= from) {
        categoryChartPeriod = 'custom';
        categoryChartCustomStart = from;
        categoryChartCustomEnd = to;
        updateCategoryBreakdownChart();
        closeCustomDateModal();
    } else {
        alert("يرجى إدخال تواريخ صحيحة.");
    }
}

function loadRecentTransactions() {
    const listContainer = document.getElementById('recentTransactionsList');
    listContainer.innerHTML = "";
    if (accounts.length === 0 || selectedAccountIndex === null) {
        listContainer.innerHTML = `<p style="text-align:center; padding: 20px 0; color: #888;">لا يوجد حساب محدد.</p>`;
        return;
    }

    const accName = accounts[selectedAccountIndex].name;
    const recent = transactions
        .filter(t => t.account === accName)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    if (recent.length === 0) {
        listContainer.innerHTML = `<p style="text-align:center; padding: 20px 0; color: #888;">لا توجد معاملات حديثة.</p>`;
        return;
    }

    recent.forEach(t => {
        const originalIndex = transactions.indexOf(t);
        const typeClass = t.type === 'دخل' ? 'income' : 'expense';
        const sign = t.type === 'دخل' ? '+' : '-';
        const currency = accounts.find(acc => acc.name === t.account)?.currency || '';

        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'recent-transaction-item-wrapper';
        itemWrapper.innerHTML = `
            <div class="swipe-actions">
                <button class="edit-btn" onclick="openEditModal(${originalIndex})"><i class="material-icons">edit</i></button>
                <button class="delete-btn" onclick="deleteTransaction(${originalIndex})"><i class="material-icons">delete</i></button>
            </div>
            <div class="recent-transaction-item">
                <div class="icon ${typeClass}"><span class="material-icons">${t.category.icon || 'category'}</span></div>
                <div class="details">
                    <span class="category">${t.category.name}</span>
                    <span class="category-date">${t.date}</span>
                </div>
                <span class="amount ${typeClass}">${sign}${t.amount.toFixed(2)} ${currency}</span>
            </div>
        `;
        listContainer.appendChild(itemWrapper);
        addSwipeListeners(itemWrapper.querySelector('.recent-transaction-item'));
    });
}

function addSwipeListeners(item) {
    let startX, currentX, isSwiping = false;
    const threshold = 50;
    const maxSwipe = 140;

    item.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        isSwiping = true;
        item.style.transition = 'none';
    }, { passive: true });

    item.addEventListener('touchmove', e => {
        if (!isSwiping) return;
        currentX = e.touches[0].clientX;
        let diff = startX - currentX;
        if (diff > 0) {
           item.style.transform = `translateX(${-Math.min(diff, maxSwipe)}px)`;
        }
    }, { passive: true });

    item.addEventListener('touchend', () => {
        if (!isSwiping) return;
        isSwiping = false;
        item.style.transition = 'transform 0.3s ease-out';
        const diff = startX - (currentX || startX);
        if (diff > threshold) {
            item.style.transform = `translateX(-${maxSwipe}px)`;
        } else {
            item.style.transform = 'translateX(0)';
        }
        currentX = null;
    });

    document.addEventListener('click', (e) => {
        if (!item.parentElement.contains(e.target)) {
            item.style.transform = 'translateX(0)';
        }
    });
}


// --- Generic Dropdown Logic ---
window.toggleDropdown = function(btn) {
    const dropdown = btn.nextElementSibling;
    dropdown.classList.toggle('show');
}
window.toggleSortDropdown = function() { document.getElementById("transactionsSortDropdown").classList.toggle("show"); };

document.addEventListener('click', function(event) {
    // Close sort dropdown
    const sortBtn = document.querySelector('.sort-btn');
    const sortDropdown = document.getElementById('transactionsSortDropdown');
    if (sortBtn && sortDropdown && !sortBtn.contains(event.target) && !sortDropdown.contains(event.target)) {
        sortDropdown.classList.remove('show');
    }
    // Close all card options dropdowns
    document.querySelectorAll('.options-btn').forEach(btn => {
        const dropdown = btn.nextElementSibling;
        if (dropdown && !btn.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
});


// --- Transactions Page Logic ---
document.querySelectorAll('#transactionsSortDropdown button').forEach(button => {
    button.addEventListener('click', function() {
        currentSortBy = this.dataset.sortValue;
        loadTransactions();
        toggleSortDropdown();
    });
});

function loadTransactions() {
    const container = document.getElementById("transactionsListContainer");
    container.innerHTML = "";
    const source = isSearchActive ? filteredTransactions : transactions;

    if (accounts.length === 0 || selectedAccountIndex === null) {
        container.innerHTML = '<p class="empty-state">لا يوجد حساب محدد.</p>';
        updateTransactionsHeader();
        return;
    }

    const filtered = source.filter(t => {
        if (t.account !== accounts[selectedAccountIndex].name) return false;
        const date = new Date(t.date + 'T00:00:00');
        if (transactionPeriod === 'yearly') return date.getFullYear() === currentTransactionYear;
        if (transactionPeriod === 'monthly') return date.getFullYear() === currentTransactionYear && date.getMonth() === transactionCurrentMonth;
        if (transactionPeriod === 'daily') return date.getFullYear() === currentTransactionYear && date.getMonth() === transactionCurrentMonth && date.getDate() === transactionCurrentDay;
        return false;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">لا توجد معاملات لهذه الفترة.</p>';
        updateTransactionsHeader();
        return;
    }
    
    // Sorting logic here (as before)
    const sorted = filtered.map(t => ({ t, originalIndex: transactions.indexOf(t) })).sort((a,b) => {
        switch(currentSortBy) {
            case 'date-desc': return new Date(b.t.date) - new Date(a.t.date);
            case 'date-asc': return new Date(a.t.date) - new Date(b.t.date);
            case 'amount-desc': return b.t.amount - a.t.amount;
            case 'amount-asc': return a.t.amount - b.t.amount;
            case 'category-asc': return a.t.category.name.localeCompare(b.t.category.name, 'ar');
            case 'type-asc': return a.t.type.localeCompare(b.t.type, 'ar');
            case 'selected-desc': return a.t.selected === b.t.selected ? 0 : a.t.selected ? 1 : -1;
            default: return 0;
        }
    });

    let transactionsByMonth = {};
    sorted.forEach(({t, originalIndex}) => {
        const monthYear = t.date.slice(0, 7);
        if (!transactionsByMonth[monthYear]) {
            transactionsByMonth[monthYear] = {
                transactions: [],
                income: 0,
                expense: 0,
                net: 0
            };
        }
        transactionsByMonth[monthYear].transactions.push({t, originalIndex});
        if (t.selected) {
            if (t.type === 'دخل') {
                transactionsByMonth[monthYear].income += t.amount;
                transactionsByMonth[monthYear].net += t.amount;
            } else {
                transactionsByMonth[monthYear].expense += t.amount;
                transactionsByMonth[monthYear].net -= t.amount;
            }
        }
    });

    const sortedMonths = Object.keys(transactionsByMonth).sort().reverse();
    sortedMonths.forEach(month => {
        const monthlyData = transactionsByMonth[month];
        const monthName = new Date(month).toLocaleString('ar', { month: 'long', year: 'numeric' });
        const net = monthlyData.income - monthlyData.expense;
        const currency = accounts.find(acc => acc.name === accounts[selectedAccountIndex].name)?.currency || '';

        const summaryCard = document.createElement('div');
        summaryCard.className = 'monthly-summary-card';
        summaryCard.innerHTML = `
            <div class="month-title">${monthName}</div>
            <div><span>الدخل:</span><span class="income-total">+${monthlyData.income.toFixed(2)} ${currency}</span></div>
            <div><span>المصروف:</span><span class="expense-total">-${monthlyData.expense.toFixed(2)} ${currency}</span></div>
            <div><span>الصافي:</span><span class="net-total">${monthlyData.net.toFixed(2)} ${currency}</span></div>
        `;
        container.appendChild(summaryCard);

        monthlyData.transactions.forEach(({t, originalIndex}) => {
            const itemWrapper = document.createElement('div');
            itemWrapper.className = 'transaction-item-wrapper';
            itemWrapper.innerHTML = `
                <div class="swipe-actions">
                    <button class="edit-btn" onclick="openEditModal(${originalIndex})"><i class="material-icons">edit</i></button>
                    <button class="delete-btn" onclick="deleteTransaction(${originalIndex})"><i class="material-icons">delete</i></button>
                </div>
                <div class="transaction-item ${t.type === 'دخل' ? 'income' : 'expense'}">
                    <div class="transaction-checkbox-wrapper"><input type="checkbox" ${t.selected ? 'checked' : ''} onchange="toggleTransactionSelection(${originalIndex})"></div>
                    <div class="category-name"><span class="material-icons">${t.category.icon}</span>${t.category.name}</div>
                    <div class="amount">${t.type === 'مصروف' ? '-' : '+'}${t.amount.toFixed(2)} ${currency}</div>
                    <div class="date-account">${t.date} | ${t.account}</div>
                    ${t.from ? `<div class="from-info">من: ${t.from}</div>` : ''}
                    ${t.note ? `<div class="note-info">ملاحظة: ${t.note}</div>` : ''}
                </div>
            `;
            container.appendChild(itemWrapper);
            addSwipeListeners(itemWrapper.querySelector('.transaction-item'));
        });
    });
    updateTransactionsHeader();
}

function updateTransactionsHeader() {
    const accSelect = document.getElementById('transactionsAccountSelect');
    const periodDisplay = document.getElementById('currentTransactionPeriodDisplay');
    const balanceSpan = document.getElementById('transactionsBalance');
    const netSpan = document.getElementById('transactionsPeriodTotal');

    if (accounts.length === 0 || selectedAccountIndex === null) {
        accSelect.style.display = 'none';
        periodDisplay.textContent = "";
        balanceSpan.textContent = "0.00";
        netSpan.textContent = "0.00";
        return;
    }

    accSelect.style.display = 'inline-block';
    const acc = accounts[selectedAccountIndex];
    let displayDate;
    if (transactionPeriod === 'yearly') periodDisplay.textContent = currentTransactionYear;
    else if (transactionPeriod === 'monthly') {
        displayDate = new Date(currentTransactionYear, transactionCurrentMonth);
        periodDisplay.textContent = displayDate.toLocaleString('ar', { year: 'numeric', month: 'long' });
    } else if (transactionPeriod === 'daily') {
        displayDate = new Date(currentTransactionYear, transactionCurrentMonth, transactionCurrentDay);
        periodDisplay.textContent = displayDate.toLocaleString('ar', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    let totalBalance = 0, periodNet = 0;
    transactions.forEach(t => {
        if(t.account === acc.name && t.selected) {
            totalBalance += t.type === 'دخل' ? t.amount : -t.amount;
            const date = new Date(t.date + 'T00:00:00');
            let inPeriod = false;
            if (transactionPeriod === 'yearly' && date.getFullYear() === currentTransactionYear) inPeriod = true;
            if (transactionPeriod === 'monthly' && date.getFullYear() === currentTransactionYear && date.getMonth() === transactionCurrentMonth) inPeriod = true;
            if (transactionPeriod === 'daily' && date.getFullYear() === currentTransactionYear && date.getMonth() === transactionCurrentMonth && date.getDate() === transactionCurrentDay) inPeriod = true;
            if(inPeriod) periodNet += t.type === 'دخل' ? t.amount : -t.amount;
        }
    });

    balanceSpan.textContent = `${totalBalance.toFixed(2)} ${acc.currency}`;
    netSpan.textContent = `${periodNet.toFixed(2)} ${acc.currency}`;
}
window.changeTransactionPeriod = function(offset) {
    if (transactionPeriod === 'yearly') currentTransactionYear += offset;
    else if (transactionPeriod === 'monthly') {
        let d = new Date(currentTransactionYear, transactionCurrentMonth);
        d.setMonth(d.getMonth() + offset);
        currentTransactionYear = d.getFullYear();
        transactionCurrentMonth = d.getMonth();
    } else if (transactionPeriod === 'daily') {
        let d = new Date(currentTransactionYear, transactionCurrentMonth, transactionCurrentDay);
        d.setDate(d.getDate() + offset);
        currentTransactionYear = d.getFullYear();
        transactionCurrentMonth = d.getMonth();
        transactionCurrentDay = d.getDate();
    }
    loadTransactions();
}
window.toggleTransactionPeriodSelector = function() {
    const selector = document.getElementById('transactionPeriodSelector');
    selector.style.display = selector.style.display === 'none' ? 'flex' : 'none';
}
window.setTransactionsPeriod = function(period) {
    transactionPeriod = period;
    const today = new Date();
    currentTransactionYear = today.getFullYear();
    transactionCurrentMonth = today.getMonth();
    transactionCurrentDay = today.getDate();
    toggleTransactionPeriodSelector();
    loadTransactions();
}

// SEARCH
document.getElementById('searchForm').onsubmit = function(e) {
    e.preventDefault(); performSearch(); closeSearchModal();
};
function performSearch() {
    const type = document.getElementById('searchType').value, cat = document.getElementById('searchCategory').value, acc = document.getElementById('searchAccount').value,
          dateFrom = document.getElementById('searchDateFrom').value, dateTo = document.getElementById('searchDateTo').value, from = document.getElementById('searchFrom').value.toLowerCase().trim(),
          amountFrom = parseFloat(document.getElementById('searchAmountFrom').value), amountTo = parseFloat(document.getElementById('searchAmountTo').value),
          note = document.getElementById('searchNote').value.toLowerCase().trim();
    if (!type && !cat && !acc && !dateFrom && !dateTo && !from && isNaN(amountFrom) && isNaN(amountTo) && !note) {
        isSearchActive = false; filteredTransactions = [];
    } else {
        isSearchActive = true;
        filteredTransactions = transactions.filter(t => 
            (!type || t.type === type) && 
            (!cat || (cat === 'غير محدد' ? !t.category.name || t.category.name === 'غير محدد' : t.category.name === cat)) &&
            (!acc || t.account === acc) &&
            (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo) &&
            (!from || (t.from || '').toLowerCase().includes(from)) &&
            (isNaN(amountFrom) || t.amount >= amountFrom) && (isNaN(amountTo) || t.amount <= amountTo) &&
            (!note || (t.note || '').toLowerCase().includes(note))
        );
    }
    loadTransactions(); updateSearchActiveIndicator();
}
window.resetSearch = function() {
    document.getElementById('searchForm').reset(); isSearchActive = false; filteredTransactions = [];
    loadTransactions(); updateSearchActiveIndicator(); closeSearchModal();
}
function updateSearchActiveIndicator() { document.getElementById('searchActiveIndicator').style.display = isSearchActive ? 'flex' : 'none'; }
// BUDGET
document.getElementById("budgetForm").onsubmit = function(e) {
    e.preventDefault();
    const category = document.getElementById("budgetCategory").value, limit = Number(document.getElementById("budgetLimit").value), account = document.getElementById("budgetAccountSelect").value;
    if(!category || !account || limit <= 0) { alert("يرجى ملء الحقول بشكل صحيح."); return; }
    budgets = budgets.filter(b => !(b.category === category && b.account === account));
    budgets.push({ category, limit, account });
    localStorage.setItem("budgets", JSON.stringify(budgets));
    updateBudgetTable(); this.reset();
};
function updateBudgetTable() {
    const tbody = document.querySelector("#budgetTable tbody"); tbody.innerHTML = "";
    if (selectedAccountIndex === null) { tbody.innerHTML = `<tr><td colspan="6">لا يوجد حساب محدد.</td></tr>`; return; }
    const acc = accounts[selectedAccountIndex];
    const accBudgets = budgets.filter(b => b.account === acc.name);
    if(accBudgets.length === 0) { tbody.innerHTML = `<tr><td colspan="6">لا توجد ميزانيات لهذا الحساب.</td></tr>`; return; }
    accBudgets.forEach(b => {
        const spent = transactions.filter(t => t.selected && t.type === "مصروف" && t.category.name === b.category && t.account === acc.name && new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear()).reduce((sum,t)=>sum+t.amount,0);
        const alertClass = spent > b.limit ? "budget-alert" : "";
        tbody.innerHTML += `<tr><td>${b.category}</td><td>${b.limit.toFixed(2)} ${acc.currency}</td><td>${spent.toFixed(2)} ${acc.currency}</td><td class="account-cell">${b.account}</td><td class="${alertClass}">${spent > b.limit ? "تجاوز!" : ""}</td><td><button class="delete-btn" onclick="deleteBudget('${b.category}','${b.account}')"><span class="material-icons">delete</span></button></td></tr>`;
    });
}
window.deleteBudget = function(category, account) {
    if(confirm("هل أنت متأكد؟")) {
        budgets = budgets.filter(b => !(b.category === category && b.account === account));
        localStorage.setItem("budgets", JSON.stringify(budgets));
        updateBudgetTable();
    }
}
// STATS
let pieChartInstance, barChartInstance;
function updateCharts() {
    const pieCtx = document.getElementById('pieChart').getContext('2d'), barCtx = document.getElementById('barChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy(); if (barChartInstance) barChartInstance.destroy();
    if (selectedAccountIndex === null) return;
    const accName = accounts[selectedAccountIndex].name;
    const expenseByCategory = {}, monthlyExpense = {};
    transactions.forEach(t => {
        if(t.account === accName && t.type === "مصروف" && t.selected) {
            expenseByCategory[t.category.name] = (expenseByCategory[t.category.name] || 0) + t.amount;
            const month = t.date.slice(0, 7);
            monthlyExpense[month] = (monthlyExpense[month] || 0) + t.amount;
        }
    });
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
    pieChartInstance = new Chart(pieCtx, {type:'pie', data:{labels:Object.keys(expenseByCategory), datasets:[{data:Object.values(expenseByCategory), backgroundColor:['#3876ea','#ffd600','#e74c3c','#27ae60','#8e44ad']}]}, options:{responsive:true, plugins:{legend:{labels:{color:textColor}}}}});
    const sortedMonths = Object.keys(monthlyExpense).sort();
    barChartInstance = new Chart(barCtx, {type:'bar', data:{labels:sortedMonths, datasets:[{label:'المصروف الشهري', data:sortedMonths.map(m=>monthlyExpense[m]), backgroundColor: getComputedStyle(document.body).getPropertyValue('--primary-color')}]}, options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{ticks:{color:textColor}}, x:{ticks:{color:textColor}}}}});
}
// BACKUP
window.downloadBackup = function() {
    const data = {accounts, transactions, budgets, categories, selectedAccountIndex, currentTheme, reminderTime};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "wallet_backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
}
window.restoreBackup = function() {
    const fileInput = document.getElementById("restoreFile");
    if(!fileInput.files.length) { alert("اختر ملفاً أولاً."); return; }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if(!data.accounts || !data.transactions || !data.budgets || !data.categories) { alert("ملف غير صالح."); return; }
            accounts = data.accounts; budgets = data.budgets; categories = data.categories;
            transactions = data.transactions; selectedAccountIndex = data.selectedAccountIndex; 
            currentTheme = data.currentTheme || 'system';
            reminderTime = data.reminderTime || null;
            localStorage.setItem("accounts", JSON.stringify(accounts)); localStorage.setItem("transactions", JSON.stringify(transactions));
            localStorage.setItem("budgets", JSON.stringify(budgets)); localStorage.setItem("categories", JSON.stringify(categories));
            localStorage.setItem("selectedAccountIndex", selectedAccountIndex); localStorage.setItem('theme', currentTheme);
            localStorage.setItem('reminderTime', reminderTime);
            refreshAllData(); loadTheme();
            alert("تمت الاستعادة بنجاح!");
        } catch(err) { alert("خطأ في قراءة الملف."); console.error(err); }
    };
    reader.readAsText(fileInput.files[0]);
}

// Global Refresh
function refreshAllData() {
    loadAccounts();
    updateCurrentAccountTotal();
    loadAccountSelects();
    loadCategories();
    loadCategorySelects();
    loadBudgetCategorySelect();
    if(document.getElementById('home').style.display === 'block' || document.getElementById('home').classList.contains('active')) updateHomeView();
    if(document.getElementById('transactions').style.display === 'block') loadTransactions();
    updateBudgetTable();
    updateCharts();
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    refreshAllData();
    showTab('home');
    checkReminder();
});

