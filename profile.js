async function loadProfile() {
    let { apiRequest, formatCurrency } = window.RentHubApp;
    let currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!currentUser) return;

    let roomsPayload = await apiRequest("/rooms");
    let rooms = roomsPayload.data || [];
    let room = rooms.find(entry => entry.number === currentUser.bookedRoomNumber) || null;

    let setValue = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.value = value || "";
    };
    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value || "";
    };

    setText("profileRoleText", currentUser.role === "admin" ? "Administrator" : "Customer");
    setText("profileRoleTextCard", currentUser.role === "admin" ? "Administrator" : "Customer");
    setText("profileRoomText", room ? `${room.number} - ${formatCurrency(room.price)}` : "No room booked");
    setValue("profileName", currentUser.name);
    setValue("profilePhone", currentUser.phone);
    setValue("profileEmail", currentUser.email);
    setValue("profileProperty", currentUser.propertyName);
    setValue("profileLocation", currentUser.location);

    let adminFields = document.getElementById("profileAdminFields");
    if (adminFields) {
        adminFields.style.display = currentUser.role === "admin" ? "grid" : "none";
    }
}

async function saveProfile() {
    let { apiRequest, normalizeText } = window.RentHubApp;
    let currentUser = await window.RentHubApp.fetchCurrentUser();
    let message = document.getElementById("profileMessage");
    if (!currentUser) return;

    let updatedUser = {
        ...currentUser,
        name: normalizeText(document.getElementById("profileName")?.value) || currentUser.name,
        phone: normalizeText(document.getElementById("profilePhone")?.value) || currentUser.phone,
        propertyName: currentUser.role === "admin"
            ? normalizeText(document.getElementById("profileProperty")?.value)
            : currentUser.propertyName,
        location: currentUser.role === "admin"
            ? normalizeText(document.getElementById("profileLocation")?.value)
            : currentUser.location
    };

    let newPassword = normalizeText(document.getElementById("profilePassword")?.value);
    if (newPassword) {
        updatedUser.password = newPassword;
    }

    try {
        await apiRequest(`/users/${currentUser.id}`, {
            method: "PUT",
            body: updatedUser
        });
        await loadProfile();
        window.RentHubApp.renderSidebar();
        if (message) message.innerText = "Profile updated successfully.";
    } catch (error) {
        if (message) message.innerText = error.message;
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "profile") {
        await loadProfile();
    }
});
