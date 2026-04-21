const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const User = require("./models/User");
const Room = require("./models/Room");
const Payment = require("./models/Payment");
const AppState = require("./models/AppState");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const DEFAULT_ADMIN = {
  id: "admin-default",
  name: "Admin User",
  phone: "9876543210",
  email: "admin@gmail.com",
  password: "1234",
  role: "admin",
  propertyName: "RentHub Residency",
  location: "Your City"
};

const DEFAULT_ROOMS = [
  { id: "room-default-001", number: "R001", description: "Single room with study desk", price: 4500 },
  { id: "room-default-002", number: "R002", description: "Single room with attached washroom", price: 5000 },
  { id: "room-default-003", number: "R003", description: "Twin sharing room", price: 4200 },
  { id: "room-default-004", number: "R004", description: "Corner room with balcony", price: 5600 },
  { id: "room-default-005", number: "R005", description: "Budget room near entrance", price: 3900 },
  { id: "room-default-006", number: "R006", description: "Standard room with wardrobe", price: 4700 },
  { id: "room-default-007", number: "R007", description: "Top floor quiet room", price: 5200 },
  { id: "room-default-008", number: "R008", description: "Deluxe room with large window", price: 6200 },
  { id: "room-default-009", number: "R009", description: "Single room with storage", price: 4300 },
  { id: "room-default-010", number: "R010", description: "Compact room for students", price: 3800 },
  { id: "room-default-011", number: "R011", description: "Standard room with fan and desk", price: 4600 },
  { id: "room-default-012", number: "R012", description: "Premium room near terrace", price: 6100 }
];

const corsOptions = {
  origin: process.env.FRONTEND_URL || "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname)));

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
  const room = normalizeText(value).toUpperCase();
  if (!room) return "";
  if (/^R\d+$/.test(room)) return room;
  if (/^\d+$/.test(room)) return `R${room.padStart(3, "0")}`;
  return room;
}

function normalizeUser(user, index = 0) {
  return {
    id: normalizeText(user?.id) || `user-${Date.now()}-${index}`,
    name: normalizeText(user?.name) || "User",
    phone: normalizeText(user?.phone),
    email: normalizeEmail(user?.email),
    password: normalizeText(user?.password) || "1234",
    role: normalizeRole(user?.role),
    propertyName: normalizeText(user?.propertyName),
    location: normalizeText(user?.location),
    bookedRoomNumber: normalizeRoomNumber(user?.bookedRoomNumber || user?.room),
    createdAt: normalizeText(user?.createdAt) || new Date().toISOString()
  };
}

function normalizeRoom(room, index = 0) {
  return {
    id: normalizeText(room?.id) || `room-${Date.now()}-${index}`,
    number: normalizeRoomNumber(room?.number || room?.room || room?.roomNo),
    description: normalizeText(room?.description) || "Standard Room",
    price: Number(room?.price) > 0 ? Number(room.price) : 5000,
    createdAt: normalizeText(room?.createdAt) || new Date().toISOString()
  };
}

function normalizePayment(payment, index = 0) {
  const amount = Number(payment?.amount);
  let status = normalizeText(payment?.status).toLowerCase();
  if (!["collected", "pending", "overdue"].includes(status)) status = "pending";

  return {
    id: normalizeText(payment?.id) || `payment-${Date.now()}-${index}`,
    customerId: normalizeText(payment?.customerId),
    customerName: normalizeText(payment?.customerName || payment?.tenant || payment?.name),
    customerEmail: normalizeEmail(payment?.customerEmail || payment?.email),
    roomNumber: normalizeRoomNumber(payment?.roomNumber || payment?.room),
    month: normalizeText(payment?.month) || new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
    status,
    method: normalizeText(payment?.method) || "UPI",
    utr: normalizeText(payment?.utr),
    screenshotName: normalizeText(payment?.screenshotName),
    createdAt: normalizeText(payment?.createdAt) || new Date().toISOString()
  };
}

function mapDoc(doc) {
  const data = doc.toObject ? doc.toObject() : doc;
  delete data._id;
  return data;
}

function sendError(res, status, message) {
  return res.status(status).json({ ok: false, message });
}

async function ensureDefaultAdminUser() {
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) return existingAdmin;
  return User.create(normalizeUser(DEFAULT_ADMIN, 0));
}

async function ensureDefaultRooms() {
  const roomCount = await Room.countDocuments();
  if (roomCount > 0) return;
  const rooms = DEFAULT_ROOMS.map((room, index) => normalizeRoom(room, index));
  await Room.insertMany(rooms, { ordered: false });
}

async function ensureAppState() {
  await AppState.findOneAndUpdate(
    { key: "main" },
    { key: "main", flags: {}, customScannerImage: "" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function initializeDatabase() {
  await Promise.all([ensureDefaultAdminUser(), ensureDefaultRooms(), ensureAppState()]);
}

async function getCurrentAppState() {
  await ensureAppState();
  const appState = await AppState.findOne({ key: "main" });
  return appState || { key: "main", flags: {}, customScannerImage: "" };
}

async function buildRoomResponse(room, requesterId) {
  const occupant = await User.findOne({ role: "customer", bookedRoomNumber: room.number });
  return {
    ...mapDoc(room),
    status: occupant ? "booked" : "available",
    occupantId: occupant?.id || "",
    occupantName: occupant?.name || "",
    occupiedByCurrentUser: Boolean(occupant && occupant.id === requesterId)
  };
}

async function buildRoomsResponse(requesterId) {
  const rooms = await Room.find().sort({ createdAt: 1 });
  const tenants = await User.find({ role: "customer", bookedRoomNumber: { $ne: "" } });
  const occupancy = new Map(tenants.map((tenant) => [tenant.bookedRoomNumber, tenant]));

  return rooms.map((room) => {
    const occupant = occupancy.get(room.number);
    return {
      ...mapDoc(room),
      status: occupant ? "booked" : "available",
      occupantId: occupant?.id || "",
      occupantName: occupant?.name || "",
      occupiedByCurrentUser: Boolean(occupant && occupant.id === requesterId)
    };
  });
}

app.use(async (req, res, next) => {
  try {
    const userId = normalizeText(req.header("x-user-id"));
    if (!userId) {
      req.currentUser = null;
      return next();
    }

    const user = await User.findOne({ id: userId });
    req.currentUser = user || null;
    return next();
  } catch (error) {
    return sendError(res, 500, "Unable to resolve user session.");
  }
});

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return sendError(res, 401, "Please log in first.");
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return sendError(res, 401, "Please log in first.");
  }
  if (req.currentUser.role !== "admin") {
    return sendError(res, 403, "Admin access required.");
  }
  return next();
}

function requireSelfOrAdmin(req, res, next) {
  if (!req.currentUser) {
    return sendError(res, 401, "Please log in first.");
  }
  if (req.currentUser.role === "admin" || req.currentUser.id === req.params.id) {
    return next();
  }
  return sendError(res, 403, "You can only access your own account.");
}

async function validateRoomBooking(userId, roomNumber) {
  const normalizedRoom = normalizeRoomNumber(roomNumber);
  if (!normalizedRoom) {
    return { ok: true, roomNumber: "" };
  }

  const room = await Room.findOne({ number: normalizedRoom });
  if (!room) {
    return { ok: false, message: "Selected room was not found." };
  }

  const occupant = await User.findOne({
    role: "customer",
    bookedRoomNumber: normalizedRoom,
    id: { $ne: userId }
  });

  if (occupant) {
    return { ok: false, message: "This room is already booked." };
  }

  return { ok: true, roomNumber: normalizedRoom };
}

app.post("/auth/login", async (req, res) => {
  try {
    await ensureDefaultAdminUser();

    const email = normalizeEmail(req.body?.email);
    const password = normalizeText(req.body?.password);

    if (!email || !password) {
      return sendError(res, 400, "Email and password are required.");
    }

    const user = await User.findOne({ email, password });
    if (!user) {
      return sendError(res, 401, "Invalid credentials. Please try again.");
    }

    return res.json({ ok: true, data: mapDoc(user) });
  } catch (error) {
    return sendError(res, 500, "Unable to login right now.");
  }
});

app.post("/auth/register", async (req, res) => {
  try {
    const payload = normalizeUser(req.body);

    if (!payload.name || !payload.phone || !payload.email || !payload.password) {
      return sendError(res, 400, "Please fill all required fields.");
    }

    if (payload.password.length < 4) {
      return sendError(res, 400, "Password must be at least 4 characters.");
    }

    if (payload.role === "admin" && (!payload.propertyName || !payload.location)) {
      return sendError(res, 400, "Admin registration needs property name and location.");
    }

    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      return sendError(res, 409, "This email is already registered.");
    }

    const saved = await User.create(payload);
    return res.status(201).json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to register user.");
  }
});

app.get("/auth/demo", async (req, res) => {
  try {
    await ensureDefaultAdminUser();

    const [admin, customer] = await Promise.all([
      User.findOne({ role: "admin" }).sort({ createdAt: 1 }),
      User.findOne({ role: "customer" }).sort({ createdAt: 1 })
    ]);

    return res.json({
      ok: true,
      data: {
        admin: admin ? mapDoc(admin) : normalizeUser(DEFAULT_ADMIN, 0),
        customer: customer ? mapDoc(customer) : null
      }
    });
  } catch (error) {
    return sendError(res, 500, "Unable to load demo credentials.");
  }
});

app.get("/users/:id", requireSelfOrAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return sendError(res, 404, "User not found.");
    }
    return res.json({ ok: true, data: mapDoc(user) });
  } catch (error) {
    return sendError(res, 500, "Unable to load user.");
  }
});

app.put("/users/:id", requireSelfOrAdmin, async (req, res) => {
  try {
    const existingUser = await User.findOne({ id: req.params.id });
    if (!existingUser) {
      return sendError(res, 404, "User not found.");
    }

    const isAdmin = req.currentUser.role === "admin";
    const bookingCheck = await validateRoomBooking(req.params.id, req.body?.bookedRoomNumber ?? existingUser.bookedRoomNumber);
    if (!bookingCheck.ok) {
      return sendError(res, 400, bookingCheck.message);
    }

    const merged = {
      ...mapDoc(existingUser),
      name: normalizeText(req.body?.name ?? existingUser.name),
      phone: normalizeText(req.body?.phone ?? existingUser.phone),
      password: normalizeText(req.body?.password ?? existingUser.password),
      bookedRoomNumber: bookingCheck.roomNumber,
      propertyName: isAdmin ? normalizeText(req.body?.propertyName ?? existingUser.propertyName) : existingUser.propertyName,
      location: isAdmin ? normalizeText(req.body?.location ?? existingUser.location) : existingUser.location,
      email: isAdmin ? normalizeEmail(req.body?.email ?? existingUser.email) : existingUser.email,
      role: existingUser.role
    };

    const duplicate = await User.findOne({ email: merged.email, id: { $ne: req.params.id } });
    if (duplicate) {
      return sendError(res, 409, "This email is already registered.");
    }

    const saved = await User.findOneAndUpdate(
      { id: req.params.id },
      normalizeUser(merged),
      { new: true, runValidators: true }
    );

    return res.json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to update user.");
  }
});

app.get("/tenants", requireAdmin, async (req, res) => {
  try {
    const tenants = await User.find({ role: "customer" }).sort({ createdAt: 1 });
    return res.json({ ok: true, data: tenants.map(mapDoc) });
  } catch (error) {
    return sendError(res, 500, "Unable to load customers.");
  }
});

app.post("/tenants", requireAdmin, async (req, res) => {
  try {
    const tenant = normalizeUser({ ...req.body, role: "customer" });
    if (!tenant.name || !tenant.phone || !tenant.email || !tenant.password) {
      return sendError(res, 400, "Please fill all required fields.");
    }

    const existingUser = await User.findOne({ email: tenant.email });
    if (existingUser) {
      return sendError(res, 409, "This email is already registered.");
    }

    const bookingCheck = await validateRoomBooking(tenant.id, tenant.bookedRoomNumber);
    if (!bookingCheck.ok) {
      return sendError(res, 400, bookingCheck.message);
    }
    tenant.bookedRoomNumber = bookingCheck.roomNumber;

    const saved = await User.create(tenant);
    return res.status(201).json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to save customer.");
  }
});

app.put("/tenants/:id", requireAdmin, async (req, res) => {
  try {
    const existingTenant = await User.findOne({ id: req.params.id, role: "customer" });
    if (!existingTenant) {
      return sendError(res, 404, "Customer not found.");
    }

    const bookingCheck = await validateRoomBooking(req.params.id, req.body?.bookedRoomNumber ?? existingTenant.bookedRoomNumber);
    if (!bookingCheck.ok) {
      return sendError(res, 400, bookingCheck.message);
    }

    const tenant = normalizeUser({
      ...mapDoc(existingTenant),
      ...req.body,
      id: req.params.id,
      role: "customer",
      bookedRoomNumber: bookingCheck.roomNumber
    });

    const duplicate = await User.findOne({ email: tenant.email, id: { $ne: req.params.id } });
    if (duplicate) {
      return sendError(res, 409, "This email is already registered.");
    }

    const saved = await User.findOneAndUpdate(
      { id: req.params.id, role: "customer" },
      tenant,
      { new: true, runValidators: true }
    );

    return res.json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to update customer.");
  }
});

app.delete("/tenants/:id", requireAdmin, async (req, res) => {
  try {
    const removed = await User.findOneAndDelete({ id: req.params.id, role: "customer" });
    if (!removed) {
      return sendError(res, 404, "Customer not found.");
    }

    await Payment.deleteMany({ customerId: req.params.id });
    return res.json({ ok: true, message: "Customer deleted." });
  } catch (error) {
    return sendError(res, 500, "Unable to delete customer.");
  }
});

app.get("/rooms", requireAuth, async (req, res) => {
  try {
    await ensureDefaultRooms();
    const rooms = await buildRoomsResponse(req.currentUser.id);
    return res.json({ ok: true, data: rooms });
  } catch (error) {
    return sendError(res, 500, "Unable to load rooms.");
  }
});

app.post("/rooms", requireAdmin, async (req, res) => {
  try {
    const room = normalizeRoom(req.body);
    if (!room.number) {
      return sendError(res, 400, "Room number is required.");
    }

    const existingRoom = await Room.findOne({ number: room.number });
    if (existingRoom) {
      return sendError(res, 409, "Room already exists.");
    }

    const saved = await Room.create(room);
    return res.status(201).json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to save room.");
  }
});

app.put("/rooms/:id", requireAdmin, async (req, res) => {
  try {
    const existingRoom = await Room.findOne({ id: req.params.id });
    if (!existingRoom) {
      return sendError(res, 404, "Room not found.");
    }

    const room = normalizeRoom({ ...mapDoc(existingRoom), ...req.body, id: req.params.id });
    const duplicate = await Room.findOne({ number: room.number, id: { $ne: req.params.id } });
    if (duplicate) {
      return sendError(res, 409, "Another room already uses this number.");
    }

    const saved = await Room.findOneAndUpdate(
      { id: req.params.id },
      room,
      { new: true, runValidators: true }
    );

    if (existingRoom.number !== room.number) {
      await Promise.all([
        User.updateMany(
          { bookedRoomNumber: existingRoom.number, role: "customer" },
          { $set: { bookedRoomNumber: room.number } }
        ),
        Payment.updateMany(
          { roomNumber: existingRoom.number },
          { $set: { roomNumber: room.number } }
        )
      ]);
    }

    return res.json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to update room.");
  }
});

app.delete("/rooms/:id", requireAdmin, async (req, res) => {
  try {
    const room = await Room.findOne({ id: req.params.id });
    if (!room) {
      return sendError(res, 404, "Room not found.");
    }

    const occupantExists = await User.exists({ bookedRoomNumber: room.number, role: "customer" });
    if (occupantExists) {
      return sendError(res, 400, "This room is currently booked and cannot be deleted.");
    }

    await Payment.deleteMany({ roomNumber: room.number, status: { $ne: "collected" } });
    await Room.deleteOne({ id: req.params.id });

    return res.json({ ok: true, message: "Room deleted." });
  } catch (error) {
    return sendError(res, 500, "Unable to delete room.");
  }
});

app.get("/payments", requireAuth, async (req, res) => {
  try {
    const filter = req.currentUser.role === "admin" ? {} : { customerId: req.currentUser.id };
    const payments = await Payment.find(filter).sort({ createdAt: -1 });
    return res.json({ ok: true, data: payments.map(mapDoc) });
  } catch (error) {
    return sendError(res, 500, "Unable to load payments.");
  }
});

app.post("/payments", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.currentUser.role === "admin";
    let payment = normalizePayment(req.body);

    if (!isAdmin) {
      if (!req.currentUser.bookedRoomNumber) {
        return sendError(res, 400, "Please book a room first.");
      }

      payment = normalizePayment({
        ...payment,
        customerId: req.currentUser.id,
        customerName: req.currentUser.name,
        customerEmail: req.currentUser.email,
        roomNumber: req.currentUser.bookedRoomNumber
      });
    }

    if (!payment.customerId || !payment.roomNumber || !payment.month) {
      return sendError(res, 400, "Customer, room, and month are required.");
    }

    if (!isAdmin && payment.customerId !== req.currentUser.id) {
      return sendError(res, 403, "You can only create your own payments.");
    }

    const saved = await Payment.create(payment);
    return res.status(201).json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to save payment.");
  }
});

app.put("/payments/:id", requireAuth, async (req, res) => {
  try {
    const existingPayment = await Payment.findOne({ id: req.params.id });
    if (!existingPayment) {
      return sendError(res, 404, "Payment not found.");
    }

    const isAdmin = req.currentUser.role === "admin";
    if (!isAdmin && existingPayment.customerId !== req.currentUser.id) {
      return sendError(res, 403, "You can only update your own payments.");
    }

    let payment = normalizePayment({ ...mapDoc(existingPayment), ...req.body, id: req.params.id });
    if (!isAdmin) {
      payment.customerId = req.currentUser.id;
      payment.customerName = req.currentUser.name;
      payment.customerEmail = req.currentUser.email;
      payment.roomNumber = req.currentUser.bookedRoomNumber;
    }

    const saved = await Payment.findOneAndUpdate(
      { id: req.params.id },
      payment,
      { new: true, runValidators: true }
    );

    return res.json({ ok: true, data: mapDoc(saved) });
  } catch (error) {
    return sendError(res, 400, "Unable to update payment.");
  }
});

app.delete("/payments/:id", requireAdmin, async (req, res) => {
  try {
    const removed = await Payment.findOneAndDelete({ id: req.params.id });
    if (!removed) {
      return sendError(res, 404, "Payment not found.");
    }

    return res.json({ ok: true, message: "Payment deleted." });
  } catch (error) {
    return sendError(res, 500, "Unable to delete payment.");
  }
});

app.get("/app-state", requireAuth, async (req, res) => {
  try {
    const appState = await getCurrentAppState();
    return res.json({
      ok: true,
      data: {
        flags: appState.flags || {},
        customScannerImage: appState.customScannerImage || ""
      }
    });
  } catch (error) {
    return sendError(res, 500, "Unable to load app settings.");
  }
});

app.put("/app-state", requireAuth, async (req, res) => {
  try {
    const saved = await AppState.findOneAndUpdate(
      { key: "main" },
      {
        key: "main",
        flags: req.body?.flags || {},
        customScannerImage: normalizeText(req.body?.customScannerImage)
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.json({
      ok: true,
      data: {
        flags: saved.flags || {},
        customScannerImage: saved.customScannerImage || ""
      }
    });
  } catch (error) {
    return sendError(res, 400, "Unable to save app settings.");
  }
});

app.get("*", (req, res, next) => {
  const apiPrefixes = ["/auth", "/users", "/tenants", "/rooms", "/payments", "/app-state"];
  if (apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  return res.sendFile(path.join(__dirname, "index.html"));
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    await initializeDatabase();
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
