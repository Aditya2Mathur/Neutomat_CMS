/* ===== CLINIC ERP — UTILITIES ===== */

const Utils = (() => {

    /* --- ID Generation --- */
    function generateId(prefix = 'ID') {
        const hex = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `${prefix}-${hex}`;
    }

    /* --- Date/Time Formatting --- */
    function formatDate(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatDateShort(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    function formatDateLong(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function formatTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function formatDateTime(date) {
        if (!date) return '-';
        return `${formatDate(date)} ${formatTime(date)}`;
    }

    function todayISO() {
        return new Date().toISOString().split('T')[0];
    }

    function nowISO() {
        return new Date().toISOString();
    }

    function isToday(dateStr) {
        if (!dateStr) return false;
        return new Date(dateStr).toLocaleDateString('en-GB') === new Date().toLocaleDateString('en-GB');
    }

    function isThisWeek(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
    }

    function isThisMonth(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return d >= monthAgo;
    }

    /* --- Currency --- */
    function formatCurrency(amount) {
        const num = parseFloat(amount) || 0;
        return '₹' + num.toLocaleString('en-IN');
    }

    /* --- String Helpers --- */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function truncate(str, maxLen = 40) {
        if (!str) return '';
        return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    }

    function genderShort(gender) {
        if (!gender) return '-';
        if (gender.toLowerCase().startsWith('m')) return 'M';
        if (gender.toLowerCase().startsWith('f')) return 'F';
        return 'O';
    }

    /* --- Status Badge Renderer --- */
    function statusBadge(status) {
        const map = {
            'booked': { label: 'Booked', css: 'badge-booked' },
            'assigned': { label: 'Assigned', css: 'badge-assigned' },
            'in_consultation': { label: 'In Consultation', css: 'badge-in-consultation' },
            'prescription_completed': { label: 'Rx Completed', css: 'badge-completed' },
            'sent_to_pharmacy': { label: 'At Pharmacy', css: 'badge-sent-to-pharmacy' },
            'dispensed': { label: 'Dispensed', css: 'badge-dispensed' },
            'closed': { label: 'Closed', css: 'badge-closed' },
            'draft': { label: 'Draft', css: 'badge-yellow' },
            'completed': { label: 'Completed', css: 'badge-green' },
            'active': { label: 'Active', css: 'badge-green' },
            'inactive': { label: 'Inactive', css: 'badge-gray' },
        };
        const info = map[status] || { label: capitalize(status || 'Unknown'), css: 'badge-gray' };
        return `<span class="badge ${info.css}">${info.label}</span>`;
    }

    /* --- Toast Notifications --- */
    function showToast(message, type = 'info', duration = 4000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            info: 'ph-info',
            success: 'ph-check-circle',
            warning: 'ph-warning',
            error: 'ph-x-circle'
        };

        toast.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i> ${escapeHtml(message)}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /* --- Form Validation --- */
    function validateRequired(fields) {
        const errors = [];
        fields.forEach(({ id, label }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = el.value.trim();
            if (!val) {
                errors.push(`${label} is required`);
                el.style.borderColor = 'var(--danger)';
                el.addEventListener('input', () => {
                    el.style.borderColor = '';
                }, { once: true });
            }
        });
        return errors;
    }

    function validatePhone(phone) {
        return /^[0-9]{10}$/.test(phone);
    }

    function clearForm(formEl) {
        if (!formEl) return;
        formEl.reset();
        formEl.querySelectorAll('.form-control').forEach(el => {
            el.style.borderColor = '';
        });
    }

    /* --- Debounce & Throttle --- */
    function debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function throttle(fn, limit = 300) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /* --- LocalStorage helpers --- */
    function store(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('LocalStorage write failed:', e);
        }
    }

    function retrieve(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    function removeStore(key) {
        localStorage.removeItem(key);
    }

    /* --- DOM Helpers --- */
    function $(selector) {
        return document.querySelector(selector);
    }

    function $all(selector) {
        return document.querySelectorAll(selector);
    }

    function show(el) {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.classList.remove('hidden');
    }

    function hide(el) {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.classList.add('hidden');
    }

    function toggle(el) {
        if (typeof el === 'string') el = document.getElementById(el);
        if (el) el.classList.toggle('hidden');
    }

    /* --- Clock --- */
    function startClock(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        function tick() {
            const now = new Date();
            el.textContent = now.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }) + '  •  ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        tick();
        setInterval(tick, 1000);
    }

    /* --- Public API --- */
    return {
        generateId, formatDate, formatDateShort, formatDateLong,
        formatTime, formatDateTime, todayISO, nowISO,
        isToday, isThisWeek, isThisMonth,
        formatCurrency, escapeHtml, capitalize, truncate, genderShort,
        statusBadge, showToast,
        validateRequired, validatePhone, clearForm,
        debounce, throttle,
        store, retrieve, removeStore,
        $, $all, show, hide, toggle,
        startClock
    };
})();
