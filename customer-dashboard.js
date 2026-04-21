async function loadCustomerDashboard() {
    let { apiRequest, formatCurrency } = window.RentHubApp;
    let currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!currentUser) return;

    let [roomsPayload, paymentsPayload] = await Promise.all([
        apiRequest("/rooms"),
        apiRequest("/payments")
    ]);

    let rooms = roomsPayload.data || [];
    let payments = paymentsPayload.data || [];
    let bookedRoom = rooms.find(room => room.number === currentUser.bookedRoomNumber) || null;
    let duePayments = payments.filter(payment => payment.status !== "collected");
    let paidPayments = payments.filter(payment => payment.status === "collected");
    let availableRooms = rooms.filter(room => room.status === "available").length;

    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };

    setText("customerGreeting", currentUser.name);
    setText("customerBookedRoom", bookedRoom ? bookedRoom.number : "Not booked");
    setText("customerRoomPrice", bookedRoom ? formatCurrency(bookedRoom.price) : "Choose a room");
    setText("customerDueCount", duePayments.length);
    setText("customerAvailableRooms", availableRooms);

    let notice = document.getElementById("customerDashboardNotice");
    if (notice) {
        notice.innerHTML = bookedRoom
            ? `You are currently booked in <b>${bookedRoom.number}</b>. You can pay rent from the Payments page.`
            : `You have not booked a room yet. Visit <a href="book-room.html">Rent Room</a> to reserve one.`;
    }

    let paymentList = document.getElementById("customerRecentPayments");
    if (paymentList) {
        paymentList.innerHTML = payments.length === 0
            ? `<div class="empty">No payment activity yet</div>`
            : payments.slice(0, 5).map(payment => `
                <div class="mini-row">
                    <div>
                        <b>${payment.month}</b>
                        <span>${payment.method}</span>
                    </div>
                    <div>${payment.status.toUpperCase()} - ${formatCurrency(payment.amount)}</div>
                </div>
            `).join("");
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "customer-dashboard") {
        await loadCustomerDashboard();
    }
});
