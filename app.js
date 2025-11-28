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

    // Render Asset Table (Asset Stock View)
    renderAssetTable(assets = []) {
        const tbody = document.getElementById('asset-table-body');
        tbody.innerHTML = '';

        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No items found.</td></tr>';
            return;
        }

        assets.forEach(asset => {
            const displayAsset = {
                ...asset,
                serialNumber: asset.serial_number || asset.serialNumber || asset.id, // Fallback to ID if no serial
                location: asset.location || '-',
                quantity: asset.quantity || 1
            };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox"></td>
                <td>
                    <a href="#" style="color:#3498db; text-decoration:none;">${displayAsset.serialNumber}</a>
                </td>
                <td>
                    <a href="#" style="color:#3498db; font-weight:500; text-decoration:none;">${displayAsset.name}</a>
                </td>
                <td>
                    <a href="#" style="color:#3498db; text-decoration:none;">${displayAsset.location}</a>
                </td>
                <td>${displayAsset.quantity}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    // Render Locations Table
    renderLocations(assets = []) {
        const tbody = document.getElementById('locations-table-body');
        tbody.innerHTML = '';

        // Extract unique locations
        const uniqueLocations = [...new Set(assets.map(a => a.location).filter(l => l && l !== '-' && l !== 'Unassigned'))];

        if (uniqueLocations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No locations found.</td></tr>';
            return;
        }

        uniqueLocations.forEach((loc, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox"></td>
                <td>
                    <a href="#" style="color:#3498db; text-decoration:none;">${index + 1}</a>
                </td>
                <td>
                <a href="#" style="color:#3498db; font-weight:500; text-decoration:none;" onclick="app.filterByLocation('${loc}')">${loc}</a>
            </td>
                <td>
                    <div style="font-size: 0.85rem; color: #555;">
                        PODDAR INFRATECH PRIVATE LIMITED<br>
                        ${loc}, Arunachal Pradesh, 790001<br>
                        GSTIN 12AAFCPO437L1ZL
                    </div>
                </td>
                <td>${loc}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    // Render Groups Table
    renderGroups(assets = []) {
        const tbody = document.getElementById('groups-table-body');
        tbody.innerHTML = '';

        // Calculate stats per category
        const groups = {};
        assets.forEach(a => {
            const cat = a.category || 'Uncategorized';
            if (!groups[cat]) {
                groups[cat] = { total: 0, available: 0, stock: 0 };
            }
            groups[cat].total++;
            groups[cat].stock++; // Assuming 1 asset = 1 stock quantity for now
            if (a.status === 'available') {
                groups[cat].available++;
            }
        });

        Object.keys(groups).forEach(groupName => {
            const stats = groups[groupName];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <a href="#" style="color:#3498db; font-weight:600; text-decoration:none;" onclick="app.filterByGroup('${groupName}')">
                        ${groupName}
                    </a>
                </td>
                <td>-</td>
                <td>${stats.total}</td>
                <td>${stats.available}</td>
                <td>${stats.stock}</td>
                <td>-</td>
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

    // View Management
    showView(viewId) {
        // Save state
        localStorage.setItem('currentView', viewId);

        // Hide all views
        ['view-dashboard', 'view-asset-stock', 'view-groups', 'view-locations'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if (target) {
            target.classList.remove('hidden');
        } else {
            // Fallback if view doesn't exist
            document.getElementById('view-dashboard').classList.remove('hidden');
        }

        // Update Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        if (viewId === 'dashboard') {
            document.getElementById('nav-dashboard').classList.add('active');
        } else if (viewId === 'asset-stock' || viewId === 'groups') {
            document.getElementById('nav-items').classList.add('active');
            // Ensure submenu is open
            document.getElementById('submenu-items').classList.remove('hidden');
        } else if (viewId === 'locations') {
            document.getElementById('nav-locations').classList.add('active');
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

// State
let currentEditingId = null;
let allAssetsCache = [];

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

        // Restore last view or default to dashboard
        const lastView = localStorage.getItem('currentView') || 'dashboard';
        ui.showView(lastView);
    },

    showLogin() {
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    },

    // Navigation Actions
    showView(viewName) {
        ui.showView(viewName);
        if (viewName === 'asset-stock') {
            // Reset filters when entering asset stock
            this.filterAssets('all');
            document.getElementById('asset-stock-title').textContent = 'Asset Stock';
        }
    },

    toggleSubmenu(id) {
        document.getElementById(id).classList.toggle('hidden');
    },

    filterByGroup(groupName) {
        this.showView('asset-stock');
        document.getElementById('asset-stock-title').textContent = `Asset Stock: ${groupName}`;
        const filtered = allAssetsCache.filter(a => a.category === groupName);
        ui.renderAssetTable(filtered);
    },

    filterByLocation(locationName) {
        this.showView('asset-stock');
        // Update title to show location context
        const titleEl = document.getElementById('asset-stock-title');
        if (titleEl) {
            titleEl.textContent = `Assets in ${locationName}`;
        } else {
            // Fallback if title element doesn't exist (it might be static in HTML)
            // We might need to add an ID to the header in index.html if it's not there
            // For now, let's assume we can set it or just filter
        }

        const filtered = allAssetsCache.filter(a => a.location === locationName);
        ui.renderAssetTable(filtered);
    },

    filterAssets(type) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        let filtered = allAssetsCache;
        if (type === 'available') filtered = allAssetsCache.filter(a => a.status === 'available');
        if (type === 'checked_out') filtered = allAssetsCache.filter(a => a.status === 'assigned');

        ui.renderAssetTable(filtered);
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
                    purchaseDate: formData.get('purchaseDate'),
                    location: formData.get('location')
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
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const assets = allAssetsCache.filter(a =>
                    a.name.toLowerCase().includes(term) ||
                    (a.serial_number || a.serialNumber || '').toLowerCase().includes(term) ||
                    (a.assigned_to || a.assignedTo || '').toLowerCase().includes(term) ||
                    (a.location || '').toLowerCase().includes(term)
                );
                ui.renderAssetTable(assets);
            });
        }

        // Import File Handler
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.handleImport(e));
        }
    },

    async refresh() {
        allAssetsCache = await store.getAssets();
        ui.renderDashboard(allAssetsCache);
        ui.renderAssetTable(allAssetsCache);
        ui.renderGroups(allAssetsCache);
        ui.renderLocations(allAssetsCache);
    },

    // Global Actions (exposed to window)
    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split('\n').map(row => row.split(','));
            const headers = rows[0].map(h => h.trim().replace(/"/g, ''));

            let successCount = 0;
            const isGroupImport = headers.includes('Group name');

            alert('Starting import... please wait.');

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row.length < 2) continue;

                const data = {};
                headers.forEach((header, index) => {
                    data[header] = row[index] ? row[index].trim().replace(/"/g, '') : '';
                });

                // Map CSV fields to Asset fields
                let asset = {};

                if (isGroupImport) {
                    // Mapping for groups.csv
                    if (!data['Group name']) continue;
                    asset = {
                        name: data['Group name'],
                        category: data['Group name'], // Use group name as category
                        description: data['Description'],
                        quantity: parseInt(data['Asset stock quantity']) || 0,
                        type: 'stock',
                        location: 'Unassigned'
                    };
                } else {
                    // Mapping for Asset_Stock.csv
                    if (!data['Name']) continue;
                    asset = {
                        name: data['Name'],
                        serialNumber: data['Asset stock #'],
                        description: data['Description'],
                        quantity: parseInt(data['Total quantity']) || 0,
                        price: parseFloat(data['Cost price']) || 0,
                        location: 'Unassigned',
                        type: 'stock',
                        category: 'General'
                    };
                }

                if (asset.quantity > 0) {
                    try {
                        await store.addAsset(asset);
                        successCount++;
                    } catch (err) {
                        console.error('Import error:', err);
                    }
                }
            }

            alert(`Import Complete! Imported ${successCount} items.`);
            event.target.value = ''; // Reset input
            await this.refresh();
        };
        reader.readAsText(file);
    },

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
                purchaseDate: asset.purchase_date ? asset.purchase_date.split('T')[0] : asset.purchaseDate,
                location: asset.location || ''
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
