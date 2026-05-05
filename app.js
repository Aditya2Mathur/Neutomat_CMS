/* ===== CLINIC ERP — CORE APPLICATION ===== */

const App = (() => {
    /* --- Auth Configuration --- */
    const AUTH_KEY = 'clinic_erp_session';

    /* 
     * Static users for offline/demo mode
     * In production, these are validated against the Users sheet
     */
    const STATIC_USERS = [
        { username: 'reception', password: 'rec123', role: 'reception', name: 'Reception Staff', specialty: null },
        { username: 'neuro', password: 'neuro123', role: 'doctor', name: 'Dr. Mohd. Shakir', specialty: 'neuro' },
        { username: 'gynec', password: 'gynec123', role: 'doctor', name: 'Dr. Afifa', specialty: 'gynecologist' },
        { username: 'pharmacy', password: 'pharm123', role: 'pharmacy', name: 'Pharmacy Staff', specialty: null },
        { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator', specialty: null },
    ];

    /* Hash function for password comparison */
    function _hash(str) {
        let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
    }

    /* --- Session State --- */
    let currentUser = null;

    function getSession() {
        return Utils.retrieve(AUTH_KEY);
    }

    function setSession(user) {
        Utils.store(AUTH_KEY, user);
        currentUser = user;
    }

    function clearSession() {
        Utils.removeStore(AUTH_KEY);
        currentUser = null;
    }

    function getCurrentUser() {
        if (!currentUser) currentUser = getSession();
        return currentUser;
    }

    /* --- Role-Based Navigation Config --- */
    const NAV_CONFIG = {
        reception: [
            { id: 'dashboard', icon: 'ph-squares-four', label: 'Dashboard' },
            { id: 'booking', icon: 'ph-calendar-plus', label: 'New Booking' },
            { id: 'appointments', icon: 'ph-list-checks', label: 'Appointments' },
            { id: 'patient-search', icon: 'ph-magnifying-glass', label: 'Search Patients' },
        ],
        doctor: [
            { id: 'dashboard', icon: 'ph-squares-four', label: 'Dashboard' },
            { id: 'doctor-queue', icon: 'ph-queue', label: 'Patient Queue' },
            { id: 'prescription-editor', icon: 'ph-prescription', label: 'Write Prescription' },
            { id: 'patient-search', icon: 'ph-magnifying-glass', label: 'Search Patients' },
        ],
        pharmacy: [
            { id: 'dashboard', icon: 'ph-squares-four', label: 'Dashboard' },
            { id: 'pharmacy-queue', icon: 'ph-prescription', label: 'Rx Queue' },
            { id: 'patient-search', icon: 'ph-magnifying-glass', label: 'Search Patients' },
        ],
        admin: [
            { id: 'dashboard', icon: 'ph-squares-four', label: 'Dashboard' },
            { id: 'booking', icon: 'ph-calendar-plus', label: 'New Booking' },
            { id: 'appointments', icon: 'ph-list-checks', label: 'All Appointments' },
            { id: 'doctor-queue', icon: 'ph-queue', label: 'Doctor Queue' },
            { id: 'pharmacy-queue', icon: 'ph-prescription', label: 'Pharmacy Queue' },
            { id: 'inventory', icon: 'ph-package', label: 'Inventory' },
            { id: 'users', icon: 'ph-users-three', label: 'Users' },
            { id: 'settings', icon: 'ph-gear', label: 'Settings' },
            { id: 'patient-search', icon: 'ph-magnifying-glass', label: 'Search' },
        ]
    };

    /* --- Initialize Application --- */
    function init() {
        // Check for existing session
        const session = getSession();
        if (session) {
            currentUser = session;
            showApp();
        } else {
            showLogin();
        }

        // Setup login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Setup logout
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Start clock
        Utils.startClock('topbar-clock');

        // Process any offline queue
        API.processOfflineQueue();
    }

    /* --- Login Handler --- */
    function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim().toLowerCase();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (!username || !password) {
            errorEl.textContent = 'Please enter both username and password.';
            errorEl.classList.add('visible');
            return;
        }

        // Check static users
        const user = STATIC_USERS.find(u => u.username === username && u.password === password);

        if (user) {
            const session = {
                username: user.username,
                name: user.name,
                role: user.role,
                specialty: user.specialty,
                loginTime: Utils.nowISO()
            };
            setSession(session);
            errorEl.classList.remove('visible');
            showApp();
            Utils.showToast(`Welcome, ${user.name}!`, 'success');
        } else {
            errorEl.textContent = 'Invalid username or password.';
            errorEl.classList.add('visible');
        }
    }

    /* --- Logout Handler --- */
    function handleLogout() {
        clearSession();
        showLogin();
        Utils.showToast('Logged out successfully.', 'info');
    }

    /* --- Show Login Screen --- */
    function showLogin() {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';

        // Clear form
        const form = document.getElementById('login-form');
        if (form) form.reset();
        const err = document.getElementById('login-error');
        if (err) err.classList.remove('visible');
    }

    /* --- Show Main Application --- */
    function showApp() {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';

        const user = getCurrentUser();
        if (!user) return showLogin();

        // Update UI with user info
        updateUserInfo(user);

        // Build sidebar navigation
        buildNavigation(user.role);

        // Set role-specific accent color
        setRoleTheme(user.role);

        // Navigate to dashboard
        navigateTo('dashboard');

        // Load initial data
        loadInitialData();
    }

    /* --- Update User Info in UI --- */
    function updateUserInfo(user) {
        const nameEl = document.getElementById('user-display-name');
        const roleEl = document.getElementById('user-display-role');
        const avatarEl = document.getElementById('user-avatar');
        const topbarRole = document.getElementById('topbar-role-label');

        if (nameEl) nameEl.textContent = user.name;
        if (roleEl) {
            roleEl.textContent = Utils.capitalize(user.role);
            roleEl.style.color = `var(--${user.role})`;
        }
        if (avatarEl) {
            avatarEl.textContent = user.name.charAt(0).toUpperCase();
        }
        if (topbarRole) {
            topbarRole.textContent = getRoleDashboardTitle(user.role);
        }
    }

    function getRoleDashboardTitle(role) {
        const titles = {
            reception: 'Reception Panel',
            doctor: 'Doctor Panel',
            pharmacy: 'Pharmacy Panel',
            admin: 'Admin Panel'
        };
        return titles[role] || 'Dashboard';
    }

    /* --- Build Sidebar Navigation --- */
    function buildNavigation(role) {
        const navEl = document.getElementById('sidebar-nav');
        if (!navEl) return;

        const items = NAV_CONFIG[role] || NAV_CONFIG.reception;
        navEl.innerHTML = '';

        items.forEach((item, index) => {
            const btn = document.createElement('button');
            btn.className = `nav-item ${index === 0 ? 'active' : ''}`;
            btn.setAttribute('data-target', item.id);
            btn.innerHTML = `<i class="ph ${item.icon}"></i> ${item.label}`;
            btn.addEventListener('click', () => navigateTo(item.id));
            navEl.appendChild(btn);
        });
    }

    /* --- Set Role Theme --- */
    function setRoleTheme(role) {
        const root = document.documentElement;
        const colors = {
            reception: { accent: '#16a34a', light: '#dcfce7' },
            doctor: { accent: '#7c3aed', light: '#ede9fe' },
            pharmacy: { accent: '#ea580c', light: '#ffedd5' },
            admin: { accent: '#64748b', light: '#f1f5f9' }
        };
        const c = colors[role] || colors.admin;
        root.style.setProperty('--role-accent', c.accent);
        root.style.setProperty('--role-light', c.light);
    }

    /* --- Page Navigation --- */
    function navigateTo(pageId) {
        // Update nav items
        Utils.$all('.nav-item').forEach(n => n.classList.remove('active'));
        const activeNav = Utils.$(`.nav-item[data-target="${pageId}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update sections
        Utils.$all('.page-section').forEach(s => s.classList.add('hidden'));
        const section = document.getElementById(pageId);
        if (section) section.classList.remove('hidden');

        // Update topbar title
        updateTopbarTitle(pageId);

        // Trigger page-specific load
        onPageLoad(pageId);
    }

    function updateTopbarTitle(pageId) {
        const titles = {
            'dashboard': { title: 'Dashboard', desc: 'Overview of today\'s activity' },
            'booking': { title: 'New Booking', desc: 'Book a patient appointment' },
            'appointments': { title: 'Appointments', desc: 'View and manage all appointments' },
            'doctor-queue': { title: 'Patient Queue', desc: 'Your assigned patients for today' },
            'prescription-editor': { title: 'Prescription', desc: 'Write and manage prescriptions' },
            'pharmacy-queue': { title: 'Pharmacy Queue', desc: 'Prescriptions ready for dispensing' },
            'inventory': { title: 'Inventory Management', desc: 'Manage medicines and stock' },
            'users': { title: 'User Management', desc: 'Manage system users and roles' },
            'settings': { title: 'Settings', desc: 'System configuration' },
            'patient-search': { title: 'Search Patients', desc: 'Find patient records' },
            'print-view': { title: 'Prescription Preview', desc: 'Review and print prescription' }
        };
        const info = titles[pageId] || { title: 'Dashboard', desc: '' };
        const titleEl = document.getElementById('topbar-page-title');
        const descEl = document.getElementById('topbar-page-desc');
        if (titleEl) titleEl.textContent = info.title;
        if (descEl) descEl.textContent = info.desc;
    }

    /* --- Page Load Handlers --- */
    function onPageLoad(pageId) {
        switch (pageId) {
            case 'dashboard':
                if (typeof Dashboard !== 'undefined') Dashboard.load();
                break;
            case 'booking':
                if (typeof Reception !== 'undefined') Reception.initBookingForm();
                break;
            case 'appointments':
                if (typeof Reception !== 'undefined') Reception.loadAppointments();
                break;
            case 'doctor-queue':
                if (typeof Doctor !== 'undefined') Doctor.loadQueue();
                break;
            case 'prescription-editor':
                // Only load if called with data
                break;
            case 'pharmacy-queue':
                if (typeof Pharmacy !== 'undefined') Pharmacy.loadQueue();
                break;
            case 'inventory':
                if (typeof Pharmacy !== 'undefined') Pharmacy.loadInventory();
                break;
            case 'patient-search':
                // Search page ready
                break;
        }
    }

    /* --- Load Initial Data --- */
    async function loadInitialData() {
        try {
            await API.appointments.list();
            await API.prescriptions.list();
            await API.inventory.list(); // Ensure medicine auto-complete is populated

            // Trigger dashboard if it's the active section
            const dashboard = document.getElementById('dashboard');
            if (dashboard && !dashboard.classList.contains('hidden')) {
                if (typeof Dashboard !== 'undefined') Dashboard.load();
            }
        } catch (err) {
            console.warn('Initial data load failed:', err);
        }
    }

    /* --- Mobile Sidebar Toggle --- */
    function toggleSidebar() {
        const sidebar = Utils.$('.sidebar');
        if (sidebar) sidebar.classList.toggle('open');
    }

    /* --- Public API --- */
    return {
        init,
        getCurrentUser,
        navigateTo,
        toggleSidebar,
        handleLogout,
        STATIC_USERS
    };
})();

/* ===== DASHBOARD MODULE ===== */
const Dashboard = (() => {
    let chartInstance = null;

    async function load() {
        const user = App.getCurrentUser();
        if (!user) return;

        const stats = await API.dashboard.getStats(user.role, user.username);
        updateCards(stats);
        await loadChart();
        loadRecentActivity();
    }

    function updateCards(stats) {
        const el = (id) => document.getElementById(id);
        if (el('stat-today')) el('stat-today').textContent = stats.daily;
        if (el('stat-weekly')) el('stat-weekly').textContent = stats.weekly;
        if (el('stat-monthly')) el('stat-monthly').textContent = stats.monthly;
        if (el('stat-revenue')) el('stat-revenue').textContent = Utils.formatCurrency(stats.totalFee);
    }

    async function loadChart() {
        const ctx = document.getElementById('dashboard-chart');
        if (!ctx) return;

        const chartData = await API.dashboard.getChartData();

        if (chartInstance) chartInstance.destroy();

        let labels = chartData.labels;
        let data = chartData.data;

        if (labels.length === 0) {
            labels = [];
            const d = new Date();
            for (let i = 6; i >= 0; i--) {
                const temp = new Date();
                temp.setDate(d.getDate() - i);
                labels.push(temp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
            }
            data = [0, 0, 0, 0, 0, 0, 0];
        }

        chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Patient Visits',
                    data,
                    backgroundColor: 'rgba(2, 132, 199, 0.65)',
                    borderColor: 'rgba(2, 132, 199, 1)',
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
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: '#f1f5f9' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    async function loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        const allRecords = API.getCache('allRecords') || [];
        const recent = allRecords
            .filter(r => r.Timestamp || r.createdAt)
            .sort((a, b) => new Date(b.Timestamp || b.createdAt) - new Date(a.Timestamp || a.createdAt))
            .slice(0, 8);

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-clipboard-text"></i>
                    <h3>No recent activity</h3>
                    <p>Activities will appear here once appointments are booked.</p>
                </div>`;
            return;
        }

        container.innerHTML = recent.map((r, i) => {
            const name = r.name || r.Name || 'Unknown';
            const phone = r.phone || r.Phone || '-';
            const status = r.status || r.Status || 'booked';
            const time = Utils.formatTime(r.Timestamp || r.createdAt);
            const aptId = r.appointmentId || r.AppointmentID || r['Appointment ID'] || '-';

            return `
                <div class="queue-item">
                    <div class="q-number">${i + 1}</div>
                    <div class="q-info">
                        <div class="q-name">${Utils.escapeHtml(name)}</div>
                        <div class="q-meta">${phone} • ${aptId} • ${time}</div>
                    </div>
                    <div>${Utils.statusBadge(status)}</div>
                </div>`;
        }).join('');
    }

    return { load };
})();

/* ===== PATIENT SEARCH MODULE ===== */
const PatientSearch = (() => {

    function init() {
        const searchInput = document.getElementById('global-search-input');
        const searchBtn = document.getElementById('btn-global-search');

        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') search();
            });
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', search);
        }
    }

    function search() {
        const query = document.getElementById('global-search-input').value.toLowerCase().trim();
        const tbody = document.querySelector('#search-results-table tbody');
        if (!tbody) return;

        if (!query) {
            tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><i class="ph ph-magnifying-glass"></i>Enter a name, phone, or appointment ID to search.</td></tr>`;
            return;
        }

        const allRecords = API.getCache('allRecords') || [];
        const results = allRecords.filter(r => {
            const name = (r.name || r.Name || '').toLowerCase();
            const phone = (r.phone || r.Phone || '').toString();
            const aptId = (r.appointmentId || r.AppointmentID || r['Appointment ID'] || '').toLowerCase();
            const pid = (r.patientId || r.PatientID || r['Patient ID'] || '').toLowerCase();
            return name.includes(query) || phone.includes(query) || aptId.includes(query) || pid.includes(query);
        });

        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><i class="ph ph-magnifying-glass"></i>No records found for "${Utils.escapeHtml(query)}"</td></tr>`;
            return;
        }

        results.sort((a, b) => new Date(b.Timestamp || b.createdAt || 0) - new Date(a.Timestamp || a.createdAt || 0));

        tbody.innerHTML = results.map(r => {
            const aptId = r.appointmentId || r.AppointmentID || r['Appointment ID'] || '-';
            const pid = r.patientId || r.PatientID || r['Patient ID'] || '-';
            const name = r.name || r.Name || '-';
            const phone = r.phone || r.Phone || '-';
            const age = r.age || r.Age || '-';
            const gender = Utils.genderShort(r.gender || r.Gender);
            const status = r.status || r.Status || 'booked';
            const date = Utils.formatDate(r.Timestamp || r.createdAt);

            return `
                <tr>
                    <td><strong>${Utils.escapeHtml(aptId)}</strong></td>
                    <td>${Utils.escapeHtml(pid)}</td>
                    <td>${Utils.escapeHtml(name)}</td>
                    <td>${phone}</td>
                    <td>${age}/${gender}</td>
                    <td>${Utils.statusBadge(status)}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="PrintModule.printFromRecord('${aptId}')">
                            <i class="ph ph-printer"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    return { init, search };
})();

/* --- Initialize on DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    PatientSearch.init();
});
