let paymentsState = {
    payments: [],
    tenants: []
};

async function loadPayments() {
    let { apiRequest } = window.RentHubApp;
    let [paymentsPayload, tenantsPayload] = await Promise.all([
        apiRequest("/payments"),
        apiRequest("/tenants")
    ]);

    paymentsState.payments = paymentsPayload.data || [];
    paymentsState.tenants = tenantsPayload.data || [];
    renderPaymentsTable();
}

function renderPaymentsTable() {
    let { formatCurrency } = window.RentHubApp;
    let table = document.getElementById("paymentTable");
    if (!table) return;

    let collected = 0;
    let pending = 0;
    let overdue = 0;

    if (paymentsState.payments.length === 0) {
        table.innerHTML = `<div class="empty">No payments found</div>`;
    } else {
        table.innerHTML = paymentsState.payments.map(payment => {
            let amount = Number(payment.amount || 0);
            if (payment.status === "collected") collected += amount;
            if (payment.status === "pending") pending += amount;
            if (payment.status === "overdue") overdue += amount;

            return `
                <div class="table-row">
                    <div>${payment.customerName}</div>
                    <div>${payment.roomNumber}</div>
                    <div>${payment.month}</div>
                    <div>${formatCurrency(amount)}</div>
                    <div><span class="status-pill ${payment.status}">${payment.status}</span></div>
                    <div>${payment.method}${payment.utr ? ` / ${payment.utr}` : ""}</div>
                    <div class="table-actions">
                        <button type="button" onclick="editPayment('${payment.id}')">Edit</button>
                        <button type="button" onclick="deletePayment('${payment.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join("");
    }

    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };

    setText("collected", formatCurrency(collected));
    setText("pending", formatCurrency(pending));
    setText("overdue", formatCurrency(overdue));
    setText("totalPayments", `${paymentsState.payments.length} payment records`);
}

async function addAdminPayment() {
    let { apiRequest, normalizeEmail, normalizeText } = window.RentHubApp;
    let customerEmail = normalizeEmail(prompt("Customer email"));
    let month = normalizeText(prompt("Month", new Date().toLocaleString("en-US", { month: "long", year: "numeric" })));
    let amount = Number(prompt("Amount", "5000"));
    let method = normalizeText(prompt("Method", "Cash")) || "Cash";
    let status = normalizeText(prompt("Status (Collected/Pending/Overdue)", "Collected")).toLowerCase();

    let customer = paymentsState.tenants.find(user => user.email === customerEmail);
    if (!customer) {
        alert("Customer not found.");
        return;
    }

    if (!customer.bookedRoomNumber) {
        alert("Customer has not booked a room.");
        return;
    }

    try {
        await apiRequest("/payments", {
            method: "POST",
            body: {
                customerId: customer.id,
                customerName: customer.name,
                customerEmail: customer.email,
                roomNumber: customer.bookedRoomNumber,
                month,
                amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
                status: ["collected", "pending", "overdue"].includes(status) ? status : "collected",
                method,
                utr: method.toLowerCase() === "cash" ? "" : normalizeText(prompt("UTR / Ref number", ""))
            }
        });

        await loadPayments();
    } catch (error) {
        alert(error.message);
    }
}

async function editPayment(paymentId) {
    let { apiRequest, normalizeText } = window.RentHubApp;
    let payment = paymentsState.payments.find(entry => entry.id === paymentId);
    if (!payment) return;

    let month = normalizeText(prompt("Month", payment.month));
    let amount = Number(prompt("Amount", String(payment.amount)));
    let status = normalizeText(prompt("Status (Collected/Pending/Overdue)", payment.status)).toLowerCase();
    let method = normalizeText(prompt("Method", payment.method));
    let utr = normalizeText(prompt("UTR / Ref number", payment.utr || ""));

    try {
        await apiRequest(`/payments/${paymentId}`, {
            method: "PUT",
            body: {
                ...payment,
                month: month || payment.month,
                amount: Number.isFinite(amount) && amount >= 0 ? amount : Number(payment.amount) || 0,
                status: ["collected", "pending", "overdue"].includes(status) ? status : payment.status,
                method: method || payment.method,
                utr: (method || payment.method).toLowerCase() === "cash" ? "" : utr
            }
        });

        await loadPayments();
    } catch (error) {
        alert(error.message);
    }
}

async function deletePayment(paymentId) {
    let { apiRequest } = window.RentHubApp;
    let payment = paymentsState.payments.find(entry => entry.id === paymentId);
    if (!payment) return;

    let confirmed = confirm(`Delete payment for ${payment.customerName} (${payment.month})?`);
    if (!confirmed) return;

    try {
        await apiRequest(`/payments/${paymentId}`, { method: "DELETE" });
        await loadPayments();
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "payments") {
        await loadPayments();
    }
});
