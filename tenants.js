let tenantsState = {
    tenants: []
};

function ensureTenantActionButton() {
    let topbar = document.querySelector(".topbar");
    if (!topbar || topbar.querySelector("[data-tenant-add-button]")) return;

    let button = document.createElement("button");
    button.type = "button";
    button.dataset.tenantAddButton = "true";
    button.innerHTML = `<i class="fa-solid fa-plus"></i> Add Customer`;
    button.onclick = addTenant;
    topbar.appendChild(button);
}

async function loadTenants() {
    let { apiRequest } = window.RentHubApp;
    let payload = await apiRequest("/tenants");
    tenantsState.tenants = payload.data || [];
    ensureTenantActionButton();
    renderCustomersTable();
}

function renderCustomersTable() {
    let table = document.getElementById("tenantTable");
    let total = document.getElementById("totalTenants");
    if (!table || !total) return;

    total.innerText = `${tenantsState.tenants.length} registered customers`;

    table.innerHTML = tenantsState.tenants.length === 0
        ? `<div class="empty">No customers found</div>`
        : tenantsState.tenants.map(tenant => `
            <div class="table-row">
                <div>${tenant.name || "-"}</div>
                <div>${tenant.email || "-"}</div>
                <div>${tenant.phone || "-"}</div>
                <div>${tenant.bookedRoomNumber || "Not booked"}</div>
                <div class="table-actions">
                    <button type="button" onclick="editTenant('${tenant.id}')">Edit</button>
                    <button type="button" onclick="deleteTenant('${tenant.id}')">Delete</button>
                </div>
            </div>
        `).join("");
}

async function addTenant() {
    let { apiRequest, normalizeText, normalizeEmail, normalizeRoomNumber } = window.RentHubApp;
    let name = normalizeText(prompt("Customer name"));
    let phone = normalizeText(prompt("Phone number"));
    let email = normalizeEmail(prompt("Email"));
    let password = normalizeText(prompt("Password", "1234"));
    let bookedRoomNumber = normalizeRoomNumber(prompt("Booked room number (optional)", ""));

    if (!name || !phone || !email || !password) {
        alert("Name, phone, email, and password are required.");
        return;
    }

    try {
        await apiRequest("/tenants", {
            method: "POST",
            body: {
                name,
                phone,
                email,
                password,
                bookedRoomNumber
            }
        });

        await loadTenants();
    } catch (error) {
        alert(error.message);
    }
}

async function editTenant(id) {
    let { apiRequest, normalizeText, normalizeEmail, normalizeRoomNumber } = window.RentHubApp;
    let tenant = tenantsState.tenants.find(entry => entry.id === id);
    if (!tenant) return;

    let name = normalizeText(prompt("Customer name", tenant.name));
    let phone = normalizeText(prompt("Phone number", tenant.phone));
    let email = normalizeEmail(prompt("Email", tenant.email));
    let password = normalizeText(prompt("Password", tenant.password || "1234"));
    let bookedRoomNumber = normalizeRoomNumber(prompt("Booked room number", tenant.bookedRoomNumber || ""));

    if (!name || !phone || !email || !password) {
        alert("Name, phone, email, and password are required.");
        return;
    }

    try {
        await apiRequest(`/tenants/${id}`, {
            method: "PUT",
            body: {
                ...tenant,
                name,
                phone,
                email,
                password,
                bookedRoomNumber
            }
        });

        await loadTenants();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteTenant(id) {
    let { apiRequest } = window.RentHubApp;
    let tenant = tenantsState.tenants.find(entry => entry.id === id);
    if (!tenant) return;

    let confirmed = confirm(`Delete customer ${tenant.name}?`);
    if (!confirmed) return;

    try {
        await apiRequest(`/tenants/${id}`, {
            method: "DELETE"
        });

        await loadTenants();
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "tenants") {
        await loadTenants();
    }
});
