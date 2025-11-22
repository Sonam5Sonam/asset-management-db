/**
 * Asset Management App - Single File Bundle
 * Combined to allow running without a local server (file:// protocol)
 */

// ==========================================
// STORE MODULE (API VERSION)
// ==========================================
const API_URL = '/.netlify/functions/assets';

const store = {
    // Get all assets
    async getAssets() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch');
            return await res.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    // Add a new asset
    async addAsset(asset) {
        const res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(asset)
        });
        return await res.json();
    },

    // Update an existing asset
    async updateAsset(updatedAsset) {
        const res = await fetch(API_URL, {
            method: 'PUT',
            body: JSON.stringify(updatedAsset)
        });
        return await res.json();
    },

    // Delete an asset
    async deleteAsset(id) {
        await fetch(API_URL, {
            method: 'DELETE',
            body: JSON.stringify({ id })
        });
    },

    // Get dashboard stats (Calculated client-side for simplicity after fetch)
    getStats(assets) {
        return {
            total: assets.length,
            assigned: assets.filter(a => a.status === 'assigned').length,
            available: assets.filter(a => a.status === 'available').length,
            maintenance: assets.filter(a => a.status === 'maintenance').length
        };
    }
};

// ==========================================
// UI MODULE
// ==========================================
const ui = {
    // Render Dashboard Stats
    renderDashboard(assets = []) {
        const stats = store.getStats(assets);

        document.getElementById('total-assets').textContent = stats.total;
        document.getElementById('assigned-assets').textContent = stats.assigned;
        document.getElementById('available-assets').textContent = stats.available;
        document.getElementById('maintenance-assets').textContent = stats.maintenance;
    },

    // Render Asset Table
    renderAssetTable(assets = []) {
        const tbody = document.getElementById('asset-table-body');
        tbody.innerHTML = '';

        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">No assets found.</td></tr>';
            return;
        }

        assets.forEach(asset => {
            // Map DB columns (snake_case) to UI (camelCase) if needed, or adjust DB query
            // For simplicity, assuming DB returns matching keys or we handle it here
            // DB: serial_number, assigned_to. JS: serialNumber, assignedTo

            const displayAsset = {
                ...asset,
                serialNumber: asset.serial_number || asset.serialNumber,
                assignedTo: asset.assigned_to || asset.assignedTo
            };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${displayAsset.name}</td>
                <td>${displayAsset.category}</td>
                <td>${displayAsset.serialNumber}</td>
                <td>
                    <span class="status-badge status-${displayAsset.status}">
                        ${displayAsset.status.charAt(0).toUpperCase() + displayAsset.status.slice(1)}
                    </span>
                </td>
                <td>${displayAsset.assignedTo || '-'}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="window.app.editAsset(${displayAsset.id})">Edit</button>
                    ${displayAsset.status === 'available'
                    ? `<button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="window.app.checkOut(${displayAsset.id})">Check Out</button>`
                    : displayAsset.status === 'assigned'
                        ? `<button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="window.app.checkIn(${displayAsset.id})">Check In</button>`
                        : ''
                }
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // Modal Management
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('open');
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('open');
        }
    },

    // Form Helpers
    fillForm(formId, data) {
        const form = document.getElementById(formId);
        Object.keys(data).forEach(key => {
            const input = form.elements[key];
            if (input) {
                input.value = data[key];
            }
        });
    },

    resetForm(formId) {
        document.getElementById(formId).reset();
    }
};

// ==========================================
// MAIN APP LOGIC
// ==========================================

// State to track current editing asset
let currentEditingId = null;

const CREDENTIALS = {
    username: 'Asset_Management',
    password: 'Asset.Aklera@123'
};

const app = {
    async init() {
        this.checkSession();
        this.setupEventListeners();
    },

    checkSession() {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn');
        if (isLoggedIn === 'true') {
            this.showApp();
        } else {
            this.showLogin();
        }
    },

    async showApp() {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        await this.refresh();
    },

    showLogin() {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    },

    setupEventListeners() {
        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const usernameInput = document.getElementById('username').value;
                const passwordInput = document.getElementById('password').value;
                const errorMsg = document.getElementById('login-error');

                if (usernameInput === CREDENTIALS.username && passwordInput === CREDENTIALS.password) {
                    sessionStorage.setItem('isLoggedIn', 'true');
                    errorMsg.style.display = 'none';
                    this.showApp();
                } else {
                    errorMsg.style.display = 'block';
                }
            });
        }

        // Add Asset Button
        const addBtn = document.getElementById('add-asset-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                currentEditingId = null;
                ui.resetForm('asset-form');
                document.getElementById('modal-title').textContent = 'Add New Asset';
                ui.openModal('asset-modal');
            });
        }

        // Close Modals
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('.modal-overlay').id;
                ui.closeModal(modalId);
            });
        });

        // Asset Form Submission
        const assetForm = document.getElementById('asset-form');
        if (assetForm) {
            assetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const assetData = {
                    name: formData.get('name'),
                    category: formData.get('category'),
                    serialNumber: formData.get('serialNumber'),
                    price: parseFloat(formData.get('price')),
                    purchaseDate: formData.get('purchaseDate')
                };

                if (currentEditingId) {
                    await store.updateAsset({ ...assetData, id: currentEditingId });
                } else {
                    await store.addAsset(assetData);
                }

                ui.closeModal('asset-modal');
                await this.refresh();
            });
        }

        // Check Out Form Submission
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const assignedTo = document.getElementById('assign-to').value;
                const assetId = document.getElementById('checkout-asset-id').value;

                // In DB version, we just send the update
                await store.updateAsset({ id: assetId, status: 'assigned', assignedTo });
                ui.closeModal('checkout-modal');
                await this.refresh();
            });
        }

        // Search Filter
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                const term = e.target.value.toLowerCase();
                // Ideally search should be server-side, but filtering client-side for now
                const allAssets = await store.getAssets();
                const assets = allAssets.filter(a =>
                    a.name.toLowerCase().includes(term) ||
                    (a.serial_number || a.serialNumber || '').toLowerCase().includes(term) ||
                    (a.assigned_to || a.assignedTo || '').toLowerCase().includes(term)
                );
                ui.renderAssetTable(assets);
            });
        }
    },

    async refresh() {
        const assets = await store.getAssets();
        ui.renderDashboard(assets);
        ui.renderAssetTable(assets);
    },

    // Global Actions (exposed to window)
    async editAsset(id) {
        const assets = await store.getAssets();
        const asset = assets.find(a => a.id === id);
        if (asset) {
            currentEditingId = id;
            // Map DB keys to form keys
            const formData = {
                name: asset.name,
                category: asset.category,
                serialNumber: asset.serial_number || asset.serialNumber,
                price: asset.price,
                purchaseDate: asset.purchase_date ? asset.purchase_date.split('T')[0] : asset.purchaseDate
            };
            ui.fillForm('asset-form', formData);
            document.getElementById('modal-title').textContent = 'Edit Asset';
            ui.openModal('asset-modal');
        }
    },

    checkOut(id) {
        document.getElementById('checkout-asset-id').value = id;
        ui.openModal('checkout-modal');
    },

    async checkIn(id) {
        if (confirm('Are you sure you want to check in this asset?')) {
            await store.updateAsset({ id, status: 'available', assignedTo: '' });
            await this.refresh();
        }
    }
};

// Expose app to window for inline event handlers
window.app = app;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
