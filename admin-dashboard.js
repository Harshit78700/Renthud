async function loadAdminDashboard() {
    let { apiRequest, formatCurrency } = window.RentHubApp;
    let [roomsPayload, tenantsPayload, paymentsPayload] = await Promise.all([
        apiRequest("/rooms"),
        apiRequest("/tenants"),
        apiRequest("/payments")
    ]);

    let rooms = roomsPayload.data || [];
    let tenants = tenantsPayload.data || [];
    let payments = paymentsPayload.data || [];
    let bookedRooms = rooms.filter(room => room.status === "booked").length;
    let availableRooms = Math.max(rooms.length - bookedRooms, 0);
    let revenue = payments
        .filter(payment => payment.status === "collected")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    let occupancyRate = rooms.length ? Math.round((bookedRooms / rooms.length) * 100) : 0;

    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };

    setText("dashTotalRooms", rooms.length);
    setText("dashOccupiedRooms", bookedRooms);
    setText("dashAvailableRooms", availableRooms);
    setText("dashMonthlyRevenue", formatCurrency(revenue));
    setText("dashOccupancyRateText", `Current occupancy: ${occupancyRate}%`);
    setText("ovTotalRooms", rooms.length);
    setText("ovMaintenance", 0);
    setText("ovMonthlyRevenue", formatCurrency(revenue));
    setText("ovOccupied", bookedRooms);
    setText("ovOccupancyRate", `${occupancyRate}%`);
    setText("ovAvailable", availableRooms);

    let recentTable = document.getElementById("recentCustomers");
    if (recentTable) {
        let recentCustomers = tenants.slice().reverse().slice(0, 5);
        recentTable.innerHTML = recentCustomers.length === 0
            ? `<div class="empty">No customers registered yet</div>`
            : recentCustomers.map(customer => `
                <div class="mini-row">
                    <div>
                        <b>${customer.name}</b>
                        <span>${customer.email}</span>
                    </div>
                    <div>${customer.bookedRoomNumber || "No room booked"}</div>
                </div>
            `).join("");
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "dashboard") {
        await loadAdminDashboard();
    }
});
