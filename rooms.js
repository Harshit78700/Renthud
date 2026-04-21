let roomsState = {
    rooms: [],
    tenants: []
};

async function loadRooms() {
    let { apiRequest } = window.RentHubApp;
    let [roomsPayload, tenantsPayload] = await Promise.all([
        apiRequest("/rooms"),
        apiRequest("/tenants")
    ]);

    roomsState.rooms = roomsPayload.data || [];
    roomsState.tenants = tenantsPayload.data || [];
    renderRoomsTable();
}

function renderRoomsTable() {
    let { formatCurrency } = window.RentHubApp;
    let roomDiv = document.getElementById("roomTable");
    let totalRooms = document.getElementById("totalRooms");
    if (!roomDiv || !totalRooms) return;

    totalRooms.innerText = `${roomsState.rooms.length} rooms total`;

    if (roomsState.rooms.length === 0) {
        roomDiv.innerHTML = `<div class="empty">No rooms available</div>`;
        return;
    }

    roomDiv.innerHTML = roomsState.rooms.map(room => {
        let occupant = room.occupantId
            ? roomsState.tenants.find(entry => entry.id === room.occupantId) || null
            : null;
        let status = room.status === "booked" ? "Booked" : "Available";

        return `
            <div class="table-row">
                <div>${room.number}</div>
                <div>${room.description}</div>
                <div>${formatCurrency(room.price)}</div>
                <div><span class="status-pill ${room.status === "booked" ? "booked" : "available"}">${status}</span></div>
                <div>${room.occupantName || occupant?.name || "Open for booking"}</div>
                <div class="table-actions">
                    <button type="button" onclick="editRoom('${room.id}')">Edit</button>
                    ${room.status === "booked" && occupant
                        ? `<button type="button" onclick="releaseBooking('${occupant.id}')">Release</button>`
                        : `<button type="button" onclick="deleteRoom('${room.id}')">Delete</button>`}
                </div>
            </div>
        `;
    }).join("");
}

async function addRoom() {
    let { apiRequest, normalizeText, normalizeRoomNumber } = window.RentHubApp;
    let roomNumber = normalizeRoomNumber(prompt("Enter room number"));
    let description = normalizeText(prompt("Enter room description", "Standard Room"));
    let price = Number(prompt("Enter monthly rent", "5000"));

    if (!roomNumber) {
        alert("Room number is required.");
        return;
    }

    try {
        await apiRequest("/rooms", {
            method: "POST",
            body: {
                number: roomNumber,
                description: description || "Standard Room",
                price: Number.isFinite(price) && price > 0 ? price : 5000
            }
        });

        await loadRooms();
    } catch (error) {
        alert(error.message);
    }
}

async function editRoom(roomId) {
    let { apiRequest, normalizeText, normalizeRoomNumber } = window.RentHubApp;
    let room = roomsState.rooms.find(entry => entry.id === roomId);
    if (!room) return;

    let nextRoomNumber = normalizeRoomNumber(prompt("Update room number", room.number));
    let nextDescription = normalizeText(prompt("Update room description", room.description));
    let nextPrice = Number(prompt("Update monthly rent", String(room.price)));

    if (!nextRoomNumber) {
        alert("Room number is required.");
        return;
    }

    try {
        await apiRequest(`/rooms/${roomId}`, {
            method: "PUT",
            body: {
                ...room,
                number: nextRoomNumber,
                description: nextDescription || "Standard Room",
                price: Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : Number(room.price) || 5000
            }
        });

        await loadRooms();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteRoom(roomId) {
    let { apiRequest } = window.RentHubApp;
    let room = roomsState.rooms.find(entry => entry.id === roomId);
    if (!room) return;

    let confirmed = confirm(`Delete room ${room.number}?`);
    if (!confirmed) return;

    try {
        await apiRequest(`/rooms/${roomId}`, { method: "DELETE" });
        await loadRooms();
    } catch (error) {
        alert(error.message);
    }
}

async function releaseBooking(userId) {
    let { apiRequest } = window.RentHubApp;
    let tenant = roomsState.tenants.find(entry => entry.id === userId);
    if (!tenant) return;

    let confirmed = confirm(`Release booking for ${tenant.name}?`);
    if (!confirmed) return;

    try {
        await apiRequest(`/tenants/${userId}`, {
            method: "PUT",
            body: { ...tenant, bookedRoomNumber: "" }
        });

        await loadRooms();
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "rooms") {
        await loadRooms();
    }
});
