const CURRENT_USER_KEY = "currentUser";

// During local development, this connects to localhost.
// After deployment, we'll replace the production URL with the actual deployed Render backend URL.
const PRODUCTION_BACKEND_URL = "https://your-backend-app.onrender.com"; // <-- UPDATE THIS AFTER RENDER DEPLOYMENT

const API_BASE =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : PRODUCTION_BACKEND_URL;

let currentUserCache = null;

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeRole(value) {
    return normalizeText(value).toLowerCase() === "admin" ? "admin" : "customer";
}

function normalizeRoomNumber(value) {
    let room = normalizeText(value).toUpperCase();
    if (!room) return "";
    if (/^R\d+$/.test(room)) return room;
    if (/^\d+$/.test(room)) return `R${room.padStart(3, "0")}`;
    return room;
}

function formatCurrency(value) {
    let amount = Number(value);
    return `Rs ${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

function uid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readSession() {
    try {
        let parsed = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null");
        return parsed && parsed.id ? parsed : null;
    } catch (error) {
        return null;
    }
}

function setCurrentUserSession(user) {
    if (!user?.id) return;
    currentUserCache = user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role
    }));
}

function clearCurrentUser() {
    currentUserCache = null;
    localStorage.removeItem(CURRENT_USER_KEY);
}

function getCurrentUser() {
    return currentUserCache;
}

async function apiRequest(path, options = {}) {
    let headers = { ...(options.headers || {}) };
    let session = readSession();
    if (session?.id) {
        headers["x-user-id"] = session.id;
    }

    let requestOptions = {
        method: options.method || "GET",
        headers
    };

    if (options.body !== undefined) {
        requestOptions.headers["Content-Type"] = "application/json";
        requestOptions.body = JSON.stringify(options.body);
    }

    let response = await fetch(`${API_BASE}${path}`, requestOptions);
    let payload = null;

    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.message || `Request failed: ${response.status}`);
    }

    return payload;
}

async function fetchCurrentUser() {
    let session = readSession();
    if (!session?.id) {
        currentUserCache = null;
        return null;
    }

    try {
        let payload = await apiRequest(`/users/${session.id}`);
        currentUserCache = payload.data || null;
        return currentUserCache;
    } catch (error) {
        clearCurrentUser();
        return null;
    }
}

function getPageName() {
    return document.body?.dataset?.page || "";
}

function getRequiredRole() {
    return document.body?.dataset?.roleGuard || "";
}

function redirectByRole(user) {
    window.location.href = user?.role === "admin" ? "dashboard.html" : "customer-dashboard.html";
}

async function requireAuthorizedPage() {
    let page = getPageName();
    let user = await fetchCurrentUser();

    if (page === "login" || page === "register") {
        if (user) {
            redirectByRole(user);
            return null;
        }
        return null;
    }

    if (!user) {
        alert("Please log in first.");
        window.location.href = "index.html";
        return null;
    }

    let requiredRole = getRequiredRole();
    if (requiredRole && requiredRole !== "any" && user.role !== requiredRole) {
        redirectByRole(user);
        return null;
    }

    return user;
}

function getSidebarLinks(role) {
    if (role === "customer") {
        return [
            { href: "customer-dashboard.html", id: "customer-dashboard", icon: "fa-house", label: "Dashboard" },
            { href: "book-room.html", id: "book-room", icon: "fa-door-open", label: "Rent Room" },
            { href: "my-payments.html", id: "my-payments", icon: "fa-credit-card", label: "Payments" },
            { href: "profile.html", id: "profile", icon: "fa-user", label: "Profile" }
        ];
    }

    return [
        { href: "dashboard.html", id: "dashboard", icon: "fa-house", label: "Dashboard" },
        { href: "rooms.html", id: "rooms", icon: "fa-door-open", label: "Rooms" },
        { href: "tenants.html", id: "tenants", icon: "fa-users", label: "Customers" },
        { href: "payments.html", id: "payments", icon: "fa-credit-card", label: "Payments" },
        { href: "reports.html", id: "reports", icon: "fa-chart-line", label: "Reports" },
        { href: "profile.html", id: "profile", icon: "fa-user", label: "Profile" }
    ];
}

function renderSidebar() {
    let sidebar = document.getElementById("appSidebar");
    let currentUser = getCurrentUser();
    if (!sidebar || !currentUser) return;

    let propertyTag = currentUser.role === "admin"
        ? normalizeText(currentUser.propertyName) || "Property Manager"
        : currentUser.bookedRoomNumber ? `Booked ${currentUser.bookedRoomNumber}` : "Customer Portal";

    let currentPage = getPageName();
    let links = getSidebarLinks(currentUser.role)
        .map(link => `
            <li class="${link.id === currentPage ? "active" : ""}">
                <a href="${link.href}"><i class="fa-solid ${link.icon}"></i> ${link.label}</a>
            </li>
        `)
        .join("");

    sidebar.innerHTML = `
        <div>
            <h2>RentHub</h2>
            <p>${propertyTag}</p>
            <ul>${links}</ul>
        </div>
        <div class="user">
            <p><b>${currentUser.name}</b></p>
            <p>${currentUser.email}</p>
            <p>${currentUser.role === "admin" ? "Administrator" : "Customer"}</p>
            <p><button onclick="logout()" class="link-button"><i class="fa-solid fa-right-from-bracket"></i> Logout</button></p>
        </div>
    `;
}

async function fillAuthDemoText() {
    let demoInfo = document.getElementById("demoCredentials");
    if (!demoInfo) return;

    try {
        let payload = await apiRequest("/auth/demo");
        let admin = payload.data?.admin;
        let customer = payload.data?.customer;
        let customerText = customer ? `${customer.email} / ${customer.password}` : "register a customer";

        demoInfo.innerHTML = `
            <i class="fa-solid fa-circle-info"></i>
            Admin: <strong>${admin.email} / ${admin.password}</strong><br>
            Customer: <strong>${customerText}</strong>
        `;
    } catch (error) {
        demoInfo.innerHTML = `
            <i class="fa-solid fa-circle-info"></i>
            Admin: <strong>admin@gmail.com / 1234</strong><br>
            Customer: <strong>register a customer</strong>
        `;
    }
}

function toggleRegisterFields() {
    let role = normalizeRole(document.getElementById("regRole")?.value);
    let adminFields = document.getElementById("adminOnlyFields");
    let customerHint = document.getElementById("customerRegisterHint");

    if (adminFields) adminFields.style.display = role === "admin" ? "grid" : "none";
    if (customerHint) customerHint.style.display = role === "customer" ? "block" : "none";
}

async function login() {
    let email = normalizeEmail(document.getElementById("username")?.value);
    let password = normalizeText(document.getElementById("password")?.value);
    let errorEl = document.getElementById("error");

    if (errorEl) errorEl.innerText = "";

    if (!email || !password) {
        if (errorEl) errorEl.innerText = "Please enter email and password.";
        return;
    }

    try {
        let payload = await apiRequest("/auth/login", {
            method: "POST",
            body: { email, password }
        });
        setCurrentUserSession(payload.data);
        redirectByRole(payload.data);
    } catch (error) {
        if (errorEl) errorEl.innerText = error.message;
    }
}

async function registerUser() {
    let name = normalizeText(document.getElementById("regName")?.value);
    let phone = normalizeText(document.getElementById("regPhone")?.value);
    let email = normalizeEmail(document.getElementById("regEmail")?.value);
    let password = normalizeText(document.getElementById("regPassword")?.value);
    let confirmPassword = normalizeText(document.getElementById("regConfirm")?.value);
    let role = normalizeRole(document.getElementById("regRole")?.value);
    let propertyName = normalizeText(document.getElementById("regProperty")?.value);
    let location = normalizeText(document.getElementById("regLocation")?.value);
    let errorNode = document.getElementById("regError");

    if (errorNode) errorNode.innerText = "";

    if (!name || !phone || !email || !password || !confirmPassword) {
        if (errorNode) errorNode.innerText = "Please fill all required fields.";
        return;
    }

    if (password !== confirmPassword) {
        if (errorNode) errorNode.innerText = "Passwords do not match.";
        return;
    }

    try {
        let payload = await apiRequest("/auth/register", {
            method: "POST",
            body: {
                id: uid("user"),
                name,
                phone,
                email,
                password,
                role,
                propertyName,
                location,
                bookedRoomNumber: ""
            }
        });

        setCurrentUserSession(payload.data);
        redirectByRole(payload.data);
    } catch (error) {
        if (errorNode) errorNode.innerText = error.message;
    }
}

function logout() {
    clearCurrentUser();
    window.location.href = "index.html";
}

function getCurrentMonthLabel() {
    return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

window.RentHubApp = {
    apiRequest,
    fetchCurrentUser,
    getCurrentUser,
    renderSidebar,
    normalizeText,
    normalizeEmail,
    normalizeRole,
    normalizeRoomNumber,
    formatCurrency,
    uid,
    getCurrentMonthLabel
};

window.onload = async function () {
    let currentUser = await requireAuthorizedPage();
    await fillAuthDemoText();
    toggleRegisterFields();

    let page = getPageName();
    if (page !== "login" && page !== "register" && currentUser) {
        renderSidebar();
    }

    window.RentHubReady = true;
    document.dispatchEvent(new CustomEvent("renthub:ready", {
        detail: {
            page,
            currentUser
        }
    }));
};
