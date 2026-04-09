// ==========================
// LOGIN FUNCTION
// ==========================

function getAdminCredentials() {
    let stored = JSON.parse(localStorage.getItem("adminUser"));
    if (stored && stored.email && stored.password) {
        return stored;
    }
    let defaultCred = { email: "admin@gmail.com", password: "1234" };
    localStorage.setItem("adminUser", JSON.stringify(defaultCred));
    return defaultCred;
}

function setAdminCredentials(email, password) {
    if (!email || !password) return false;
    localStorage.setItem("adminUser", JSON.stringify({ email, password }));
    return true;
}

function setCurrentUser(email) {
    if (!email) return false;
    localStorage.setItem("currentUser", JSON.stringify({ email: String(email).trim() }));
    return true;
}

function getCurrentUser() {
    try {
        let stored = JSON.parse(localStorage.getItem("currentUser"));
        if (stored && stored.email) return stored;
    } catch (e) {
        // ignore parse errors
    }
    return null;
}

function clearCurrentUser() {
    localStorage.removeItem("currentUser");
}

function logout() {
    if (confirm("Are you sure you want to log out?")) {
        clearCurrentUser();
        console.log("User logged out successfully. Redirecting to login.");
        localStorage.removeItem("currentUser");
        window.location.href = "index.html";
    }
}

function requireLogin() {
    let path = window.location.pathname.toLowerCase();
    if (
        path.endsWith("index.html") ||
        path.endsWith("/") ||
        path.endsWith("login.html") ||
        path.endsWith("register.html")
    ) return;
    let current = getCurrentUser();
    if (!current) {
        alert("Please log in first.");
        window.location.href = "index.html";
    }
}

function updateUserUI() {
    let current = getCurrentUser();
    if (!current) return;

    let nameNode = document.getElementById("currentUserName");
    let emailNode = document.getElementById("currentUserEmail");
    if (emailNode) emailNode.textContent = current.email;
    if (nameNode) {
        let displayName = current.email.split("@")[0];
        nameNode.textContent = displayName || current.email;
    }
}

function login() {
    console.log("Login button clicked");
    let userInput = document.getElementById("username");
    let passInput = document.getElementById("password");
    let errorEl = document.getElementById("error");
    
    if (!userInput || !passInput || !errorEl) {
        console.error("Login elements not found");
        alert("Login form error - reload page");
        return;
    }
    
    let user = userInput.value?.trim();
    let pass = passInput.value;

    if (!user || !pass) {
        errorEl.innerText = "Please fill email and password";
        return;
    }

    let admin = getAdminCredentials();
    console.log("Admin creds:", admin.email, "Input:", user);

    if (user === admin.email && pass === admin.password) {
        if (setCurrentUser(user)) {
            alert("Login successful! Welcome back!");
            window.location.href = "dashboard.html";
        } else {
            errorEl.innerText = "Login failed - try again";
        }
    } else {
        errorEl.innerText = "Invalid credentials. Try demo details or create an account.";
        console.log("Login failed - wrong creds");
    }
}

function registerUser() {
    let regName = document.getElementById("regName")?.value?.trim();
    let regPhone = document.getElementById("regPhone")?.value?.trim();
    let regEmail = document.getElementById("regEmail")?.value?.trim();
    let regPassword = document.getElementById("regPassword")?.value;
    let regConfirm = document.getElementById("regConfirm")?.value;
    let errorNode = document.getElementById("regError");

    if (!errorNode) return;
    errorNode.innerText = "";

    if (!regName || !regPhone || !regEmail || !regPassword || !regConfirm) {
        errorNode.innerText = "Please fill all required fields.";
        return;
    }

    if (regPassword !== regConfirm) {
        errorNode.innerText = "Password and confirm password do not match.";
        return;
    }

    if (regPassword.length < 4) {
        errorNode.innerText = "Password must be at least 4 characters.";
        return;
    }

    setAdminCredentials(regEmail, regPassword);
    setCurrentUser(regEmail);
    localStorage.setItem(
        "ownerProfile",
        JSON.stringify({
            name: regName,
            phone: regPhone,
            email: regEmail
        })
    );

    alert("Account created successfully. Redirecting to dashboard.");
    window.location.href = "dashboard.html";
}

function changeAdminPassword() {
    let admin = getAdminCredentials();
    let email = prompt("Admin Email:", admin.email);
    let password = prompt("New Password:", admin.password);
    if (!email || !password) {
        alert("Email and password are required");
        return;
    }
    setAdminCredentials(email.trim(), password.trim());
    alert("Admin credentials updated. Please log in with new values.");
}



// ==========================
// LOAD DATA FROM STORAGE
// ==========================

function normalizeRoom(value) {
    return value ? String(value).trim() : "";
}

function normalizeTenant(tenant) {
    if (!tenant || !tenant.room) return null;
    return {
        name: tenant.name ? String(tenant.name).trim() : "",
        room: normalizeRoom(tenant.room),
        phone: tenant.phone ? String(tenant.phone).trim() : ""
    };
}

function safeParseStorage(key, fallback) {
    try {
        let value = localStorage.getItem(key);
        if (!value) return fallback;
        let parsed = JSON.parse(value);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
        return fallback;
    }
}

function getLocalSnapshot() {
    return {
        adminUser: safeParseStorage("adminUser", null),
        currentUser: safeParseStorage("currentUser", null),
        rooms: safeParseStorage("rooms", []),
        tenants: safeParseStorage("tenants", []),
        payments: safeParseStorage("payments", []),
        ownerProfile: safeParseStorage("ownerProfile", null),
        customScannerImage: localStorage.getItem("customScannerImage") || "",
        flags: {
            renthubSeed50Done: localStorage.getItem("renthubSeed50Done") === "true",
            renthubSeed30PaytmDone: localStorage.getItem("renthubSeed30PaytmDone") === "true",
            renthubSeedPendingOverdueDone: localStorage.getItem("renthubSeedPendingOverdueDone") === "true"
        }
    };
}

function applySnapshotToLocal(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;

    if (snapshot.adminUser) localStorage.setItem("adminUser", JSON.stringify(snapshot.adminUser));
    else localStorage.removeItem("adminUser");

    if (snapshot.currentUser) localStorage.setItem("currentUser", JSON.stringify(snapshot.currentUser));
    else localStorage.removeItem("currentUser");

    if (snapshot.ownerProfile) localStorage.setItem("ownerProfile", JSON.stringify(snapshot.ownerProfile));
    else localStorage.removeItem("ownerProfile");

    localStorage.setItem("rooms", JSON.stringify(snapshot.rooms || []));
    localStorage.setItem("tenants", JSON.stringify(snapshot.tenants || []));
    localStorage.setItem("payments", JSON.stringify(snapshot.payments || []));

    let scanner = snapshot.customScannerImage || "";
    localStorage.setItem("customScannerImage", scanner);

    let flags = snapshot.flags || {};
    localStorage.setItem("renthubSeed50Done", flags.renthubSeed50Done ? "true" : "false");
    localStorage.setItem("renthubSeed30PaytmDone", flags.renthubSeed30PaytmDone ? "true" : "false");
    localStorage.setItem("renthubSeedPendingOverdueDone", flags.renthubSeedPendingOverdueDone ? "true" : "false");

    tenants = (snapshot.tenants || []).map(normalizeTenant).filter(t => t && t.name && t.room && t.phone);
    rooms = (snapshot.rooms || []).map(normalizeRoom).filter((r, i, arr) => r && arr.indexOf(r) === i);
    payments = snapshot.payments || [];
    customScannerImage = scanner;
}

async function loadSnapshotFromServer() {
    try {
        let local = getLocalSnapshot();
        let localCount = (local.rooms?.length || 0) + (local.tenants?.length || 0) + (local.payments?.length || 0);
        let response = await fetch("/api/snapshot", { method: "GET" });
        if (!response.ok) return;
        let payload = await response.json();
        if (!payload || !payload.ok || !payload.data) return;
        let server = payload.data;
        let serverCount = (server.rooms?.length || 0) + (server.tenants?.length || 0) + (server.payments?.length || 0);

        // Protect local seeded/demo data: do not overwrite with an empty server snapshot.
        if (serverCount === 0 && localCount > 0) {
            await syncSnapshotToServer();
            return;
        }

        applySnapshotToLocal(server);
    } catch (e) {
        // backend unavailable, continue with localStorage mode
    }
}

async function syncSnapshotToServer() {
    try {
        let snapshot = getLocalSnapshot();
        await fetch("/api/snapshot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: snapshot })
        });
    } catch (e) {
        // ignore sync errors when backend is offline
    }
}

function syncSnapshotOnUnload() {
    try {
        let snapshot = getLocalSnapshot();
        if (!navigator.sendBeacon) return;
        let payload = JSON.stringify({ data: snapshot });
        let blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon("/api/snapshot", blob);
    } catch (e) {
        // ignore
    }
}

let tenants = (JSON.parse(localStorage.getItem("tenants")) || [])
    .map(normalizeTenant)
    .filter(t => t && t.name && t.room && t.phone);

let rooms = (JSON.parse(localStorage.getItem("rooms")) || [])
    .map(normalizeRoom)
    .filter((r, i, arr) => r && arr.indexOf(r) === i);

localStorage.setItem("tenants", JSON.stringify(tenants));
localStorage.setItem("rooms", JSON.stringify(rooms));

function seedRoomsAndTenants(total) {
    let target = Number(total) || 50;
    if (target < 1) return;

    // One-time seeding, so refresh does not keep adding duplicates.
    if (localStorage.getItem("renthubSeed50Done") === "true") return;

    let generatedRooms = [];
    let generatedTenants = [];

    for (let i = 1; i <= target; i++) {
        let roomNo = `R${String(i).padStart(3, "0")}`;
        let phone = String(9000000000 + i - 1);
        generatedRooms.push(roomNo);
        generatedTenants.push({
            name: `Tenant ${i}`,
            room: roomNo,
            phone
        });
    }

    rooms = generatedRooms;
    tenants = generatedTenants;

    localStorage.setItem("rooms", JSON.stringify(rooms));
    localStorage.setItem("tenants", JSON.stringify(tenants));
    localStorage.setItem("renthubSeed50Done", "true");
}

seedRoomsAndTenants(50);


// ==========================
// TENANT FUNCTIONS
// ==========================

// Add Tenant
function addTenant() {
    let name = prompt("Enter Tenant Name:");
    let room = prompt("Enter Room No:");
    let phone = prompt("Enter Phone:");

    if (!name || !room || !phone) {
        alert("All fields required!");
        return;
    }

    name = String(name).trim();
    room = normalizeRoom(room);
    phone = String(phone).trim();

    if (!name || !room || !phone) {
        alert("All fields required!");
        return;
    }

    // Check if room exists
    let roomExists = rooms.some(r => normalizeRoom(r) === room);
    if (!roomExists) {
        alert("Room does not exist! Add room first.");
        return;
    }

    // Check if already occupied
    let isOccupied = tenants.some(t => normalizeRoom(t.room) === room);
    if (isOccupied) {
        alert("Room already occupied!");
        return;
    }

    let tenant = { name, room, phone };

    tenants.push(tenant);

    localStorage.setItem("tenants", JSON.stringify(tenants));

    displayTenants();
    displayRooms(); // update room status
}

// Bulk add tenants from prompt input (one tenant per line)
function addAllTenants() {
    let input = prompt("Enter tenants (one per line) in format: Name, Room, Phone");
    if (!input) return;

    let lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        alert("No tenant data provided.");
        return;
    }

    let added = 0;
    let skipped = 0;
    let invalidLines = [];

    lines.forEach((line, i) => {
        let parts = line.split(",").map(p => p.trim());
        if (parts.length < 3) {
            skipped++;
            invalidLines.push(`${i + 1}: ${line}`);
            return;
        }

        let [name, room, phone] = parts;
        name = String(name).trim();
        room = normalizeRoom(room);
        phone = String(phone).trim();

        if (!name || !room || !phone) {
            skipped++;
            invalidLines.push(`${i + 1}: ${line}`);
            return;
        }

        if (!rooms.some(r => normalizeRoom(r) === room)) {
            skipped++;
            invalidLines.push(`${i + 1}: room not found (${room})`);
            return;
        }

        if (tenants.some(t => normalizeRoom(t.room) === room)) {
            skipped++;
            invalidLines.push(`${i + 1}: room occupied (${room})`);
            return;
        }

        tenants.push({ name, room, phone });
        added++;
    });

    localStorage.setItem("tenants", JSON.stringify(tenants));

    displayTenants();
    displayRooms();

    let msg = `Bulk import complete: ${added} added, ${skipped} skipped.`;
    if (invalidLines.length) msg += "\n" + invalidLines.slice(0, 5).join("\n") + (invalidLines.length > 5 ? `\n...and ${invalidLines.length - 5} more` : "");
    alert(msg);
}



// Display Tenants
function displayTenants() {
    let table = document.getElementById("tenantTable");
    let total = document.getElementById("totalTenants");

    if (!table || !total) return;

    table.innerHTML = "";

    if (tenants.length === 0) {
        table.innerHTML = `<div class="empty">No tenants found</div>`;
        total.innerText = "0 active tenants";
        return;
    }

    tenants.forEach((t, index) => {
        table.innerHTML += `
            <div class="table-row">
                <div>${t.name}</div>
                <div>${t.room}</div>
                <div>${t.phone}</div>
                <div>6 months</div>
                <div>
                    <button onclick="deleteTenant(${index})">Delete</button>
                </div>
            </div>
        `;
    });

    total.innerText = tenants.length + " active tenants";
}


// Delete Tenant
function deleteTenant(index) {
    tenants.splice(index, 1);

    localStorage.setItem("tenants", JSON.stringify(tenants));

    displayTenants();
    displayRooms(); // update room status
}



// ==========================
// PAYMENT FUNCTIONS
// ==========================

let payments = (JSON.parse(localStorage.getItem("payments")) || []);
let paymentProofImage = "";
let paymentProofFileName = "";
let customScannerImage = localStorage.getItem("customScannerImage") || "";

function normalizePaymentStatus(value) {
    let status = String(value || "").trim().toLowerCase();
    if (status === "collected") return "collected";
    if (status === "pending") return "pending";
    if (status === "overdue") return "overdue";
    return status;
}

function seedCompletedPaytmPayments(total) {
    let target = Number(total) || 30;
    if (target < 1) return;

    // Keep this one-time to avoid adding duplicates on every page load.
    if (localStorage.getItem("renthubSeed30PaytmDone") === "true") return;

    let months = [
        "January 2026", "February 2026", "March 2026", "April 2026",
        "May 2026", "June 2026", "July 2026", "August 2026",
        "September 2026", "October 2026", "November 2026", "December 2026"
    ];
    let generated = [];

    for (let i = 0; i < target; i++) {
        let tenantRef = tenants[i % tenants.length];
        let roomRef = rooms[i % rooms.length];
        let tenantName = tenantRef?.name || `Tenant ${i + 1}`;
        let roomNo = tenantRef?.room || roomRef || `R${String(i + 1).padStart(3, "0")}`;
        let amount = 4500 + (i % 6) * 500; // 4500, 5000, 5500...
        let month = months[i % months.length];
        let utr = `UTR2026${String(i + 1).padStart(6, "0")}`;

        generated.push({
            tenant: tenantName,
            room: roomNo,
            month,
            amount,
            status: "Collected",
            method: "Paytm",
            utr
        });
    }

    payments = [...payments, ...generated];
    localStorage.setItem("payments", JSON.stringify(payments));
    localStorage.setItem("renthubSeed30PaytmDone", "true");
}

seedCompletedPaytmPayments(30);

function seedPendingAndOverduePayments() {
    if (localStorage.getItem("renthubSeedPendingOverdueDone") === "true") return;

    let pendingCount = payments.filter(p => normalizePaymentStatus(p.status) === "pending").length;
    let overdueCount = payments.filter(p => normalizePaymentStatus(p.status) === "overdue").length;
    if (pendingCount > 0 && overdueCount > 0) {
        localStorage.setItem("renthubSeedPendingOverdueDone", "true");
        return;
    }

    let months = ["March 2026", "April 2026", "May 2026", "June 2026"];
    let additions = [];

    for (let i = 0; i < 6; i++) {
        let tenantRef = tenants[(i + 10) % tenants.length];
        let roomRef = rooms[(i + 10) % rooms.length];
        additions.push({
            tenant: tenantRef?.name || `Tenant ${i + 101}`,
            room: tenantRef?.room || roomRef || `R${String(i + 101).padStart(3, "0")}`,
            month: months[i % months.length],
            amount: 5000 + (i % 3) * 500,
            status: "Pending",
            method: "UPI",
            utr: ""
        });
    }

    for (let i = 0; i < 4; i++) {
        let tenantRef = tenants[(i + 20) % tenants.length];
        let roomRef = rooms[(i + 20) % rooms.length];
        additions.push({
            tenant: tenantRef?.name || `Tenant ${i + 201}`,
            room: tenantRef?.room || roomRef || `R${String(i + 201).padStart(3, "0")}`,
            month: months[i % months.length],
            amount: 5500 + (i % 2) * 500,
            status: "Overdue",
            method: "UPI",
            utr: ""
        });
    }

    payments = [...payments, ...additions];
    localStorage.setItem("payments", JSON.stringify(payments));
    localStorage.setItem("renthubSeedPendingOverdueDone", "true");
}

seedPendingAndOverduePayments();

function addPayment() {
    let tenant = prompt("Enter tenant name:");
    let room = normalizeRoom(prompt("Enter room number:"));
    let month = prompt("Enter month (e.g., April 2026):");
    let amount = prompt("Enter amount:");
    let method = prompt("Payment method (Cash/Paytm/UPI):", "Paytm");
    let status = prompt("Status (Collected/Pending/Overdue):", "Collected");

    if (!tenant || !room || !month || !amount || !method || !status) {
        alert("All fields are required for payment.");
        return;
    }

    amount = Number(amount);
    if (Number.isNaN(amount) || amount <= 0) {
        alert("Enter a valid numeric amount.");
        return;
    }

    // optional: verify tenant-room mapping
    let tenantExists = tenants.some(t => t.name.toLowerCase() === tenant.trim().toLowerCase() && normalizeRoom(t.room) === room);
    if (!tenantExists) {
        if (!confirm("Tenant/room not found. Do you want to record the payment anyway?")) return;
    }

    payments.push({ tenant: tenant.trim(), room, month: month.trim(), amount, status: status.trim(), method: method.trim() });
    localStorage.setItem("payments", JSON.stringify(payments));

    displayPayments();
}

function displayPayments() {
    let table = document.getElementById("paymentTable");
    let collected = 0;
    let pending = 0;
    let overdue = 0;

    if (!table) return;

    table.innerHTML = "";

    if (payments.length === 0) {
        table.innerHTML = `<div class="empty">No payments found</div>`;
    } else {
        payments.forEach((p, index) => {
            let normalizedStatus = normalizePaymentStatus(p.status);
            if (normalizedStatus === "collected") collected += p.amount;
            if (normalizedStatus === "pending") pending += p.amount;
            if (normalizedStatus === "overdue") overdue += p.amount;

            table.innerHTML += `
                <div class="table-row">
                    <div>${p.tenant}</div>
                    <div>${p.room}</div>
                    <div>${p.month}</div>
                    <div>Rs ${p.amount.toFixed(2)}</div>
                    <div>${p.status} (${p.method}${p.utr ? `, UTR: ${p.utr}` : ""})</div>
                    <div><button onclick="deletePayment(${index})">Delete</button></div>
                </div>
            `;
        });
    }

    document.getElementById("collected").innerText = `Rs ${collected.toFixed(2)}`;
    document.getElementById("pending").innerText = `Rs ${pending.toFixed(2)}`;
    document.getElementById("overdue").innerText = `Rs ${overdue.toFixed(2)}`;
    document.getElementById("totalPayments").innerText = `${payments.length} payment records`;
}

function deletePayment(index) {
    payments.splice(index, 1);
    localStorage.setItem("payments", JSON.stringify(payments));
    displayPayments();
}

function generateUpiLink() {
    let upiId = document.getElementById("upiId")?.value?.trim();
    if (!upiId) {
        alert("Please enter UPI ID first.");
        return;
    }
    let url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=RentHub&cu=INR`;
    renderUpiQr(url);
    document.getElementById("paymentGatewayInfo").innerText = `UPI link ready: ${url}`;
    alert(`UPI link: ${url} (Tap to open)`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => console.log("UPI URL copied"));
    }
}

function payWithPaytm() {
    let paytmUpi = `hr5806301@ptaxis`;
    let upiInput = document.getElementById("upiId");
    if (upiInput) upiInput.value = paytmUpi;
    let url = `upi://pay?pa=${encodeURIComponent(paytmUpi)}&pn=RentHub&cu=INR`;
    renderUpiQr(url);
    let info = `Paytm UPI ready: ${paytmUpi}. Sender opens Paytm app -> Pay -> ${paytmUpi}`;
    document.getElementById("paymentGatewayInfo").innerText = info;
    alert(info);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(paytmUpi).then(() => console.log("Paytm UPI copied"));
    }
}

function copyUpiId() {
    let upiId = document.getElementById("upiId")?.value?.trim();
    if (!upiId) {
        alert("Enter UPI ID first.");
        return;
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
        alert("Clipboard not available in this browser.");
        return;
    }
    navigator.clipboard.writeText(upiId)
        .then(() => {
            document.getElementById("paymentGatewayInfo").innerText = `UPI ID copied: ${upiId}`;
        })
        .catch(() => alert("Could not copy UPI ID."));
}

function renderUpiQr(upiUrl) {
    let qrImage = document.getElementById("upiQrImage");
    let qrNote = document.getElementById("upiQrNote");
    if (!qrImage || !qrNote || !upiUrl) return;

    if (customScannerImage) {
        qrImage.src = customScannerImage;
        qrImage.style.display = "block";
        qrNote.innerText = "Custom scanner image is active.";
        return;
    }

    let qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`;
    qrImage.src = qrSrc;
    qrImage.style.display = "block";
    qrNote.innerText = "Scan in any UPI app or copy UPI ID.";
}

function handleScannerImageUpload(event) {
    let file = event?.target?.files?.[0];
    let qrImage = document.getElementById("upiQrImage");
    let qrNote = document.getElementById("upiQrNote");
    if (!file || !qrImage || !qrNote) return;

    let reader = new FileReader();
    reader.onload = function (e) {
        customScannerImage = e.target?.result || "";
        if (!customScannerImage) return;
        localStorage.setItem("customScannerImage", customScannerImage);
        qrImage.src = customScannerImage;
        qrImage.style.display = "block";
        qrNote.innerText = "Custom scanner image uploaded.";
    };
    reader.readAsDataURL(file);
}

function handlePaymentScreenshot(event) {
    let file = event?.target?.files?.[0];
    let preview = document.getElementById("paymentProofPreview");
    let proofName = document.getElementById("paymentProofName");

    if (!preview || !proofName) return;
    if (!file) {
        paymentProofImage = "";
        paymentProofFileName = "";
        preview.src = "";
        preview.style.display = "none";
        proofName.innerText = "No screenshot selected";
        return;
    }

    paymentProofFileName = file.name;
    proofName.innerText = `Selected: ${file.name}`;
    let reader = new FileReader();
    reader.onload = function (e) {
        paymentProofImage = e.target?.result || "";
        preview.src = paymentProofImage;
        preview.style.display = "block";
    };
    reader.readAsDataURL(file);
}

function confirmPaytmPayment() {
    let tenant = document.getElementById("proofTenant")?.value?.trim();
    let room = normalizeRoom(document.getElementById("proofRoom")?.value?.trim());
    let month = document.getElementById("proofMonth")?.value?.trim();
    let amountValue = document.getElementById("proofAmount")?.value;
    let amount = Number(amountValue);
    let utr = document.getElementById("utrNumber")?.value?.trim();
    let upiId = document.getElementById("upiId")?.value?.trim();
    let infoNode = document.getElementById("paymentGatewayInfo");

    if (!tenant || !room || !month || !amountValue || Number.isNaN(amount) || amount <= 0) {
        alert("Please fill tenant, room, month and valid amount.");
        return;
    }

    if (!upiId) {
        alert("Please enter UPI ID first.");
        return;
    }

    if (!utr || utr.length < 8) {
        alert("Please enter a valid UTR/Ref number (min 8 characters).");
        return;
    }

    if (!paymentProofImage) {
        alert("Please upload payment screenshot before confirming.");
        return;
    }

    payments.push({
        tenant,
        room,
        month,
        amount,
        status: "Collected",
        method: "Paytm",
        utr,
        screenshotName: paymentProofFileName || "proof-image"
    });
    localStorage.setItem("payments", JSON.stringify(payments));

    if (infoNode) {
        infoNode.innerText = `Payment confirmed for ${tenant}. UTR: ${utr}`;
    }

    let proofPreview = document.getElementById("paymentProofPreview");
    let proofName = document.getElementById("paymentProofName");
    let proofFile = document.getElementById("paymentScreenshot");
    if (proofPreview) {
        proofPreview.src = "";
        proofPreview.style.display = "none";
    }
    if (proofName) proofName.innerText = "No screenshot selected";
    if (proofFile) proofFile.value = "";
    paymentProofImage = "";
    paymentProofFileName = "";

    displayPayments();
    displayDashboard();
    displayReports();
}

function initializePaymentUi() {
    let upiInput = document.getElementById("upiId");
    if (upiInput && !upiInput.value) {
        upiInput.value = "hr5806301@ptaxis";
    }
    if (upiInput && upiInput.value) {
        let url = `upi://pay?pa=${encodeURIComponent(upiInput.value.trim())}&pn=RentHub&cu=INR`;
        renderUpiQr(url);
    }
}

// Existing call integration
function addPaymentButtonFlow() {
    addPayment();
}

// ==========================
// DASHBOARD FUNCTIONS
// ==========================

function displayDashboard() {
    let totalRooms = rooms.length;
    let occupiedRooms = tenants.filter(t => rooms.includes(normalizeRoom(t.room))).length;
    let availableRooms = Math.max(totalRooms - occupiedRooms, 0);
    let occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    let monthlyRevenue = payments
        .filter(p => normalizePaymentStatus(p.status) === "collected")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };

    setText("dashTotalRooms", totalRooms);
    setText("dashOccupiedRooms", occupiedRooms);
    setText("dashAvailableRooms", availableRooms);
    setText("dashMonthlyRevenue", `Rs ${monthlyRevenue.toFixed(2)}`);
    setText("dashOccupancyRateText", `Current occupancy: ${occupancyRate}%`);

    setText("ovTotalRooms", totalRooms);
    setText("ovMaintenance", 0);
    setText("ovMonthlyRevenue", `Rs ${monthlyRevenue.toFixed(2)}`);
    setText("ovOccupied", occupiedRooms);
    setText("ovOccupancyRate", `${occupancyRate}%`);
    setText("ovAvailable", availableRooms);
}

function displayReports() {
    let report = getReportMetrics();
    let toPercent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);
    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };
    let setProgress = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.value = value;
    };

    setText("repRevenue", `Rs ${report.revenue.toFixed(2)}`);
    setText("repOccupancyRate", `${report.occupancyRate}%`);
    setText("repCollectedCount", report.collectedPayments.length);
    setText("repPaytmCount", report.paytmPayments.length);

    setText("repPaidText", `${report.collectedPayments.length} of ${report.totalPayments}`);
    setText("repPendingText", `${report.pendingPayments.length} of ${report.totalPayments}`);
    setText("repOverdueText", `${report.overduePayments.length} of ${report.totalPayments}`);
    setProgress("repPaidProgress", toPercent(report.collectedPayments.length, report.totalPayments));
    setProgress("repPendingProgress", toPercent(report.pendingPayments.length, report.totalPayments));
    setProgress("repOverdueProgress", toPercent(report.overduePayments.length, report.totalPayments));

    setText("repOccupiedText", `${report.occupiedRooms} of ${report.totalRooms}`);
    setText("repAvailableText", `${report.availableRooms} of ${report.totalRooms}`);
    setText("repMaintenanceText", `${report.maintenanceRooms} of ${report.totalRooms}`);
    setProgress("repOccupiedProgress", toPercent(report.occupiedRooms, report.totalRooms));
    setProgress("repAvailableProgress", toPercent(report.availableRooms, report.totalRooms));
    setProgress("repMaintenanceProgress", toPercent(report.maintenanceRooms, report.totalRooms));
}

function getReportMetrics() {
    let totalRooms = rooms.length;
    let occupiedRooms = tenants.filter(t => rooms.includes(normalizeRoom(t.room))).length;
    let availableRooms = Math.max(totalRooms - occupiedRooms, 0);
    let maintenanceRooms = 0;

    let totalPayments = payments.length;
    let collectedPayments = payments.filter(p => normalizePaymentStatus(p.status) === "collected");
    let pendingPayments = payments.filter(p => normalizePaymentStatus(p.status) === "pending");
    let overduePayments = payments.filter(p => normalizePaymentStatus(p.status) === "overdue");
    let paytmPayments = payments.filter(p => String(p.method || "").toLowerCase() === "paytm");

    let revenue = collectedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    let occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    return {
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
        totalPayments,
        collectedPayments,
        pendingPayments,
        overduePayments,
        paytmPayments,
        revenue,
        occupancyRate
    };
}

function exportReportsCSV() {
    let report = getReportMetrics();
    let filename = `renthub-report-${new Date().toISOString().slice(0, 10)}.csv`;

    let summaryRows = [
        ["Metric", "Value"],
        ["Total Rooms", report.totalRooms],
        ["Occupied Rooms", report.occupiedRooms],
        ["Available Rooms", report.availableRooms],
        ["Occupancy Rate", `${report.occupancyRate}%`],
        ["Total Payments", report.totalPayments],
        ["Collected Payments", report.collectedPayments.length],
        ["Pending Payments", report.pendingPayments.length],
        ["Overdue Payments", report.overduePayments.length],
        ["Paytm Payments", report.paytmPayments.length],
        ["Revenue Collected", `Rs ${report.revenue.toFixed(2)}`]
    ];

    let paymentRows = [
        [],
        ["Payment Details"],
        ["Tenant", "Room", "Month", "Amount", "Status", "Method", "UTR"]
    ];
    payments.forEach(p => {
        paymentRows.push([
            p.tenant || "",
            p.room || "",
            p.month || "",
            Number(p.amount || 0).toFixed(2),
            p.status || "",
            p.method || "",
            p.utr || ""
        ]);
    });

    let toCsvLine = row => row.map(val => `"${String(val).replace(/"/g, "\"\"")}"`).join(",");
    let csvText = [...summaryRows, ...paymentRows].map(toCsvLine).join("\n");
    downloadTextFile(filename, "text/csv;charset=utf-8;", csvText);
}

function exportReportsPDF() {
    let report = getReportMetrics();
    let safe = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let rows = payments.map(p => `
        <tr>
            <td>${safe(p.tenant)}</td>
            <td>${safe(p.room)}</td>
            <td>${safe(p.month)}</td>
            <td>Rs ${Number(p.amount || 0).toFixed(2)}</td>
            <td>${safe(p.status)}</td>
            <td>${safe(p.method)}</td>
            <td>${safe(p.utr || "-")}</td>
        </tr>
    `).join("");

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RentHub Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { margin: 0 0 10px; }
    .meta { margin-bottom: 14px; color: #444; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; margin-bottom: 18px; }
    .cell { border: 1px solid #ddd; padding: 8px; border-radius: 6px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>
  <h1>RentHub Report</h1>
  <div class="meta">Generated on ${safe(new Date().toLocaleString())}</div>
  <div class="grid">
    <div class="cell">Total Rooms: <b>${report.totalRooms}</b></div>
    <div class="cell">Occupied Rooms: <b>${report.occupiedRooms}</b></div>
    <div class="cell">Available Rooms: <b>${report.availableRooms}</b></div>
    <div class="cell">Occupancy Rate: <b>${report.occupancyRate}%</b></div>
    <div class="cell">Collected Payments: <b>${report.collectedPayments.length}</b></div>
    <div class="cell">Pending Payments: <b>${report.pendingPayments.length}</b></div>
    <div class="cell">Overdue Payments: <b>${report.overduePayments.length}</b></div>
    <div class="cell">Revenue: <b>Rs ${report.revenue.toFixed(2)}</b></div>
  </div>
  <h3>Payment Details</h3>
  <table>
    <thead>
      <tr>
        <th>Tenant</th><th>Room</th><th>Month</th><th>Amount</th><th>Status</th><th>Method</th><th>UTR</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    let printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
        alert("Popup blocked. Please allow popups for PDF export.");
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}

function downloadTextFile(filename, mimeType, content) {
    let blob = new Blob([content], { type: mimeType });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==========================
// ROOM FUNCTIONS
// ==========================

// Add Room
function addRoom() {
    let roomNo = prompt("Enter Room Number:");

    roomNo = normalizeRoom(roomNo);

    if (!roomNo) {
        alert("Room number required!");
        return;
    }

    // Prevent duplicate
    if (rooms.some(r => normalizeRoom(r) === roomNo)) {
        alert("Room already exists!");
        return;
    }

    rooms.push(roomNo);

    localStorage.setItem("rooms", JSON.stringify(rooms));

    displayRooms();
}


// Display Rooms
function displayRooms() {
    let roomDiv = document.getElementById("roomTable");
    let totalRooms = document.getElementById("totalRooms");

    if (!roomDiv || !totalRooms) return;

    roomDiv.innerHTML = "";

    if (rooms.length === 0) {
        roomDiv.innerHTML = `<div class="empty">No rooms available</div>`;
        totalRooms.innerText = "0 rooms";
        return;
    }

    rooms.forEach((room, index) => {

        // check if occupied
        let isOccupied = tenants.some(t => t.room === room);

        roomDiv.innerHTML += `
            <div class="table-row">
                <div>${room}</div>
                <div>Standard Room</div>
                <div>Rs 5000</div>
                <div>${isOccupied ? "Occupied [X]" : "Available [OK]"}</div>
                <div>
                    <button onclick="deleteRoom(${index})">Delete</button>
                </div>
            </div>
        `;
    });

    totalRooms.innerText = rooms.length + " rooms";
}


// Delete Room
function deleteRoom(index) {

    let roomToDelete = rooms[index];

    // Check if tenant is using this room
    let isUsed = tenants.some(t => t.room === roomToDelete);

    if (isUsed) {
        alert("Room is occupied! Cannot delete.");
        return;
    }

    rooms.splice(index, 1);

    localStorage.setItem("rooms", JSON.stringify(rooms));

    displayRooms();
}



// ==========================
// AUTO LOAD (SAFE)
// ==========================
window.addEventListener("beforeunload", syncSnapshotOnUnload);

window.onload = async function () {
    await loadSnapshotFromServer();
    requireLogin();
    updateUserUI();

    // pages with tenants, rooms, or payments can safely call these.
    if (typeof initializePaymentUi === 'function') initializePaymentUi();
    if (typeof displayDashboard === 'function') displayDashboard();
    if (typeof displayReports === 'function') displayReports();
    if (typeof displayTenants === 'function') displayTenants();
    if (typeof displayRooms === 'function') displayRooms();
    if (typeof displayPayments === 'function') displayPayments();
    await syncSnapshotToServer();
};
