let myPaymentsState = {
    payments: [],
    currentUser: null,
    customScannerImage: "",
    paymentProofImage: "",
    paymentProofFileName: ""
};

function renderUpiQr(upiUrl) {
    let qrImage = document.getElementById("upiQrImage");
    let qrNote = document.getElementById("upiQrNote");
    if (!qrImage || !qrNote || !upiUrl) return;

    if (myPaymentsState.customScannerImage) {
        qrImage.src = myPaymentsState.customScannerImage;
        qrImage.style.display = "block";
        qrNote.innerText = "Custom QR image is active.";
        return;
    }

    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUrl)}`;
    qrImage.style.display = "block";
    qrNote.innerText = "Scan in any UPI app.";
}

function generateUpiLink() {
    let upiId = window.RentHubApp.normalizeText(document.getElementById("upiId")?.value);
    let infoNode = document.getElementById("paymentGatewayInfo");
    if (!upiId) {
        alert("Please enter UPI ID first.");
        return;
    }

    let url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=RentHub&cu=INR`;
    renderUpiQr(url);
    if (infoNode) infoNode.innerText = `UPI link ready: ${url}`;
}

function copyUpiId() {
    let upiId = window.RentHubApp.normalizeText(document.getElementById("upiId")?.value);
    let infoNode = document.getElementById("paymentGatewayInfo");
    if (!upiId || !navigator.clipboard?.writeText) return;

    navigator.clipboard.writeText(upiId).then(() => {
        if (infoNode) infoNode.innerText = `UPI ID copied: ${upiId}`;
    });
}

async function handleScannerImageUpload(event) {
    let { apiRequest } = window.RentHubApp;
    let file = event?.target?.files?.[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = async function (loadEvent) {
        try {
            myPaymentsState.customScannerImage = loadEvent.target?.result || "";
            await apiRequest("/app-state", {
                method: "PUT",
                body: {
                    flags: {},
                    customScannerImage: myPaymentsState.customScannerImage
                }
            });

            let upiId = window.RentHubApp.normalizeText(document.getElementById("upiId")?.value);
            if (upiId) {
                renderUpiQr(`upi://pay?pa=${encodeURIComponent(upiId)}&pn=RentHub&cu=INR`);
            }
        } catch (error) {
            alert(error.message);
        }
    };
    reader.readAsDataURL(file);
}

function handlePaymentScreenshot(event) {
    let file = event?.target?.files?.[0];
    let preview = document.getElementById("paymentProofPreview");
    let proofName = document.getElementById("paymentProofName");
    if (!preview || !proofName) return;

    if (!file) {
        preview.src = "";
        preview.style.display = "none";
        proofName.innerText = "No screenshot selected";
        myPaymentsState.paymentProofImage = "";
        myPaymentsState.paymentProofFileName = "";
        return;
    }

    myPaymentsState.paymentProofFileName = file.name;
    proofName.innerText = `Selected: ${file.name}`;

    let reader = new FileReader();
    reader.onload = function (loadEvent) {
        myPaymentsState.paymentProofImage = loadEvent.target?.result || "";
        preview.src = myPaymentsState.paymentProofImage;
        preview.style.display = "block";
    };
    reader.readAsDataURL(file);
}

async function loadMyPayments() {
    let { apiRequest, formatCurrency } = window.RentHubApp;
    myPaymentsState.currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!myPaymentsState.currentUser) return;

    let [paymentsPayload, appStatePayload, roomsPayload] = await Promise.all([
        apiRequest("/payments"),
        apiRequest("/app-state"),
        apiRequest("/rooms")
    ]);

    myPaymentsState.payments = paymentsPayload.data || [];
    myPaymentsState.customScannerImage = appStatePayload.data?.customScannerImage || "";
    let rooms = roomsPayload.data || [];
    let currentRoom = rooms.find(room => room.number === myPaymentsState.currentUser.bookedRoomNumber) || null;

    let table = document.getElementById("myPaymentTable");
    if (!table) return;

    table.innerHTML = myPaymentsState.payments.length === 0
        ? `<div class="empty">No payments found for your account</div>`
        : myPaymentsState.payments.map(payment => `
            <div class="table-row">
                <div>${payment.month}</div>
                <div>${payment.roomNumber}</div>
                <div>${formatCurrency(payment.amount)}</div>
                <div><span class="status-pill ${payment.status}">${payment.status}</span></div>
                <div>${payment.method}${payment.utr ? ` / ${payment.utr}` : ""}</div>
            </div>
        `).join("");

    let collected = myPaymentsState.payments
        .filter(payment => payment.status === "collected")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    let pending = myPaymentsState.payments
        .filter(payment => payment.status !== "collected")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };

    setText("myCollected", formatCurrency(collected));
    setText("myPending", formatCurrency(pending));
    setText("myPaymentCount", `${myPaymentsState.payments.length} payment records`);

    let upiInput = document.getElementById("upiId");
    let monthInput = document.getElementById("proofMonth");
    let amountInput = document.getElementById("proofAmount");
    if (upiInput && !upiInput.value) upiInput.value = "renthub@upi";
    if (monthInput && !monthInput.value) monthInput.value = window.RentHubApp.getCurrentMonthLabel();
    if (amountInput && currentRoom && !amountInput.value) amountInput.value = String(currentRoom.price);
    if (upiInput?.value) {
        renderUpiQr(`upi://pay?pa=${encodeURIComponent(upiInput.value.trim())}&pn=RentHub&cu=INR`);
    }
}

async function confirmCustomerPayment() {
    let { apiRequest, normalizeText, uid } = window.RentHubApp;
    let currentUser = await window.RentHubApp.fetchCurrentUser();
    if (!currentUser || !currentUser.bookedRoomNumber) {
        alert("Please book a room first.");
        return;
    }

    let month = normalizeText(document.getElementById("proofMonth")?.value) || window.RentHubApp.getCurrentMonthLabel();
    let amountValue = Number(document.getElementById("proofAmount")?.value);
    let utr = normalizeText(document.getElementById("utrNumber")?.value);
    let upiId = normalizeText(document.getElementById("upiId")?.value);
    let infoNode = document.getElementById("paymentGatewayInfo");

    if (!upiId) {
        alert("Enter a UPI ID first.");
        return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
        alert("Enter a valid amount.");
        return;
    }

    if (utr.length < 6) {
        alert("Enter a valid UTR / reference number.");
        return;
    }

    if (!myPaymentsState.paymentProofImage) {
        alert("Upload the payment screenshot before confirming.");
        return;
    }

    try {
        let openPayment = myPaymentsState.payments.find(payment =>
            payment.month === month &&
            payment.roomNumber === currentUser.bookedRoomNumber &&
            payment.status !== "collected"
        );

        let body = {
            customerId: currentUser.id,
            customerName: currentUser.name,
            customerEmail: currentUser.email,
            roomNumber: currentUser.bookedRoomNumber,
            month,
            amount: amountValue,
            status: "collected",
            method: "UPI",
            utr,
            screenshotName: myPaymentsState.paymentProofFileName || "payment-proof"
        };

        if (openPayment) {
            await apiRequest(`/payments/${openPayment.id}`, {
                method: "PUT",
                body: { ...openPayment, ...body }
            });
        } else {
            await apiRequest("/payments", {
                method: "POST",
                body: { id: uid("payment"), ...body }
            });
        }

        if (infoNode) infoNode.innerText = `Payment saved for ${month}.`;

        let screenshotInput = document.getElementById("paymentScreenshot");
        let preview = document.getElementById("paymentProofPreview");
        let proofName = document.getElementById("paymentProofName");
        if (screenshotInput) screenshotInput.value = "";
        if (preview) {
            preview.src = "";
            preview.style.display = "none";
        }
        if (proofName) proofName.innerText = "No screenshot selected";
        myPaymentsState.paymentProofImage = "";
        myPaymentsState.paymentProofFileName = "";

        await loadMyPayments();
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "my-payments") {
        await loadMyPayments();
    }
});
