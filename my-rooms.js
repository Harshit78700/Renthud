let myRoomsState = {
    rooms: [],
    currentUser: null
};

async function loadMyRooms() {
    let { apiRequest } = window.RentHubApp;
    myRoomsState.currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!myRoomsState.currentUser) return;

    let roomsPayload = await apiRequest("/rooms");
    myRoomsState.rooms = roomsPayload.data || [];
    renderMyRooms();
}

function renderMyRooms() {
    let { formatCurrency } = window.RentHubApp;
    let currentUser = myRoomsState.currentUser;
    let rooms = myRoomsState.rooms;
    if (!currentUser) return;

    let currentRoom = rooms.find(room => room.number === currentUser.bookedRoomNumber) || null;
    let notice = document.getElementById("customerBookingNotice");
    let bookingSummary = document.getElementById("bookingSummary");
    let bookingSummaryText = document.getElementById("bookingSummaryText");
    let bookingAction = document.getElementById("bookingAction");
    let grid = document.getElementById("bookRoomGrid");
    if (!notice || !bookingSummary || !bookingSummaryText || !bookingAction || !grid) return;

    notice.innerHTML = currentRoom
        ? `Your current booking is <b>${currentRoom.number}</b> at <b>${formatCurrency(currentRoom.price)}</b> per month.`
        : `Pick any available room below. Booked rooms are locked for other customers.`;

    bookingSummary.style.display = "flex";
    if (currentRoom) {
        bookingSummaryText.innerHTML = `Booked room: <b>${currentRoom.number}</b><br>${currentRoom.description}<br>Monthly rent: <b>${formatCurrency(currentRoom.price)}</b>`;
        bookingAction.innerHTML = `<button type="button" onclick="cancelMyBooking()">Cancel Booking</button>`;
    } else {
        bookingSummaryText.innerHTML = `No room booked yet.<br>Select an available room to create your booking and monthly payment entry.`;
        bookingAction.innerHTML = "";
    }

    grid.innerHTML = rooms.length === 0
        ? `<div class="empty">No rooms added yet</div>`
        : rooms.map(room => {
            let isMine = currentUser.bookedRoomNumber === room.number;
            let isBooked = room.status === "booked";
            let action = isMine ? "My Room" : (isBooked ? "Booked" : "Book Now");

            return `
                <article class="room-card ${isBooked ? "room-card-booked" : ""}">
                    <div class="room-card-top">
                        <h3>${room.number}</h3>
                        <span class="status-pill ${isBooked ? "booked" : "available"}">${isBooked ? "Booked" : "Available"}</span>
                    </div>
                    <p>${room.description}</p>
                    <div class="room-meta">
                        <span>Rent</span>
                        <b>${formatCurrency(room.price)} / month</b>
                    </div>
                    <div class="room-meta">
                        <span>Occupant</span>
                        <b>${room.occupantName || "Open"}</b>
                    </div>
                    <button type="button" onclick="bookRoom('${room.id}')" ${isBooked && !isMine ? "disabled" : ""}>${action}</button>
                </article>
            `;
        }).join("");
}

async function bookRoom(roomId) {
    let { apiRequest, getCurrentMonthLabel, uid } = window.RentHubApp;
    let currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!currentUser) return;

    let room = myRoomsState.rooms.find(entry => entry.id === roomId);
    if (!room) return;

    if (currentUser.bookedRoomNumber === room.number) {
        alert("This is already your booked room.");
        return;
    }

    if (room.status === "booked" && !room.occupiedByCurrentUser) {
        alert("This room is already booked.");
        return;
    }

    if (currentUser.bookedRoomNumber) {
        let confirmed = confirm(`Change your booking from ${currentUser.bookedRoomNumber} to ${room.number}?`);
        if (!confirmed) return;
    }

    try {
        let updatedUserPayload = await apiRequest(`/users/${currentUser.id}`, {
            method: "PUT",
            body: { ...currentUser, bookedRoomNumber: room.number }
        });
        myRoomsState.currentUser = updatedUserPayload.data;

        let paymentsPayload = await apiRequest("/payments");
        let payments = paymentsPayload.data || [];
        let month = getCurrentMonthLabel();
        let openPayment = payments.find(payment =>
            payment.month === month &&
            payment.status !== "collected"
        );

        let paymentBody = {
            customerId: currentUser.id,
            customerName: currentUser.name,
            customerEmail: currentUser.email,
            roomNumber: room.number,
            month,
            amount: Number(room.price) || 0,
            status: openPayment?.status === "overdue" ? "overdue" : "pending",
            method: openPayment?.method || "UPI",
            utr: openPayment?.utr || "",
            screenshotName: openPayment?.screenshotName || ""
        };

        if (openPayment) {
            await apiRequest(`/payments/${openPayment.id}`, {
                method: "PUT",
                body: { ...openPayment, ...paymentBody }
            });
        } else {
            await apiRequest("/payments", {
                method: "POST",
                body: { id: uid("payment"), ...paymentBody }
            });
        }

        await loadMyRooms();
        window.RentHubApp.renderSidebar();
        alert(`Room ${room.number} booked successfully.`);
    } catch (error) {
        alert(error.message);
    }
}

async function cancelMyBooking() {
    let { apiRequest } = window.RentHubApp;
    let currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!currentUser || !currentUser.bookedRoomNumber) return;

    let confirmed = confirm(`Cancel booking for ${currentUser.bookedRoomNumber}?`);
    if (!confirmed) return;

    try {
        let updatedUserPayload = await apiRequest(`/users/${currentUser.id}`, {
            method: "PUT",
            body: { ...currentUser, bookedRoomNumber: "" }
        });
        myRoomsState.currentUser = updatedUserPayload.data;

        await loadMyRooms();
        window.RentHubApp.renderSidebar();
        alert("Booking cancelled.");
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "book-room") {
        await loadMyRooms();
    }
});
