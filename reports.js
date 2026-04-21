let reportsState = {
    rooms: [],
    payments: []
};

function getReportMetrics() {
    let bookedRooms = reportsState.rooms.filter(room => room.status === "booked").length;
    let availableRooms = Math.max(reportsState.rooms.length - bookedRooms, 0);
    let collectedPayments = reportsState.payments.filter(payment => payment.status === "collected");
    let pendingPayments = reportsState.payments.filter(payment => payment.status === "pending");
    let overduePayments = reportsState.payments.filter(payment => payment.status === "overdue");
    let revenue = collectedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    let occupancyRate = reportsState.rooms.length ? Math.round((bookedRooms / reportsState.rooms.length) * 100) : 0;

    return {
        totalRooms: reportsState.rooms.length,
        bookedRooms,
        availableRooms,
        collectedPayments,
        pendingPayments,
        overduePayments,
        revenue,
        occupancyRate
    };
}

async function loadReports() {
    let { apiRequest, formatCurrency } = window.RentHubApp;
    let [roomsPayload, paymentsPayload] = await Promise.all([
        apiRequest("/rooms"),
        apiRequest("/payments")
    ]);

    reportsState.rooms = roomsPayload.data || [];
    reportsState.payments = paymentsPayload.data || [];

    let metrics = getReportMetrics();
    let percent = (value, total) => total > 0 ? Math.round((value / total) * 100) : 0;
    let setText = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.innerText = value;
    };
    let setProgress = (id, value) => {
        let node = document.getElementById(id);
        if (node) node.value = value;
    };

    setText("repRevenue", formatCurrency(metrics.revenue));
    setText("repOccupancyRate", `${metrics.occupancyRate}%`);
    setText("repCollectedCount", metrics.collectedPayments.length);
    setText("repPaytmCount", reportsState.payments.filter(payment => payment.method?.toLowerCase() === "paytm").length);
    setText("repPaidText", `${metrics.collectedPayments.length} of ${reportsState.payments.length}`);
    setText("repPendingText", `${metrics.pendingPayments.length} of ${reportsState.payments.length}`);
    setText("repOverdueText", `${metrics.overduePayments.length} of ${reportsState.payments.length}`);
    setText("repOccupiedText", `${metrics.bookedRooms} of ${metrics.totalRooms}`);
    setText("repAvailableText", `${metrics.availableRooms} of ${metrics.totalRooms}`);
    setText("repMaintenanceText", `0 of ${metrics.totalRooms}`);
    setProgress("repPaidProgress", percent(metrics.collectedPayments.length, reportsState.payments.length));
    setProgress("repPendingProgress", percent(metrics.pendingPayments.length, reportsState.payments.length));
    setProgress("repOverdueProgress", percent(metrics.overduePayments.length, reportsState.payments.length));
    setProgress("repOccupiedProgress", percent(metrics.bookedRooms, metrics.totalRooms));
    setProgress("repAvailableProgress", percent(metrics.availableRooms, metrics.totalRooms));
    setProgress("repMaintenanceProgress", 0);
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

function exportReportsCSV() {
    let metrics = getReportMetrics();
    let rows = [
        ["Metric", "Value"],
        ["Total Rooms", metrics.totalRooms],
        ["Booked Rooms", metrics.bookedRooms],
        ["Available Rooms", metrics.availableRooms],
        ["Occupancy Rate", `${metrics.occupancyRate}%`],
        ["Collected Payments", metrics.collectedPayments.length],
        ["Pending Payments", metrics.pendingPayments.length],
        ["Overdue Payments", metrics.overduePayments.length],
        ["Revenue", metrics.revenue.toFixed(2)],
        [],
        ["Customer", "Room", "Month", "Amount", "Status", "Method", "UTR"]
    ];

    reportsState.payments.forEach(payment => {
        rows.push([
            payment.customerName,
            payment.roomNumber,
            payment.month,
            Number(payment.amount || 0).toFixed(2),
            payment.status,
            payment.method,
            payment.utr
        ]);
    });

    let csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\n");
    downloadTextFile(`renthub-report-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;", csv);
}

function exportReportsPDF() {
    let metrics = getReportMetrics();
    let rows = reportsState.payments.map(payment => `
        <tr>
            <td>${payment.customerName}</td>
            <td>${payment.roomNumber}</td>
            <td>${payment.month}</td>
            <td>${window.RentHubApp.formatCurrency(payment.amount)}</td>
            <td>${payment.status}</td>
            <td>${payment.method}</td>
            <td>${payment.utr || "-"}</td>
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
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; }
        .cell { border: 1px solid #ddd; padding: 10px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <h1>RentHub Report</h1>
    <div class="grid">
        <div class="cell">Total Rooms: <b>${metrics.totalRooms}</b></div>
        <div class="cell">Booked Rooms: <b>${metrics.bookedRooms}</b></div>
        <div class="cell">Available Rooms: <b>${metrics.availableRooms}</b></div>
        <div class="cell">Revenue: <b>${window.RentHubApp.formatCurrency(metrics.revenue)}</b></div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Customer</th>
                <th>Room</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Method</th>
                <th>UTR</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
</body>
</html>`;

    let printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
        alert("Popup blocked. Please allow popups to export PDF.");
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
}

document.addEventListener("renthub:ready", async (event) => {
    if (event.detail?.page === "reports") {
        await loadReports();
    }
});
