// ==========================
// Imports & Setup
// ==========================
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const { User } = require("./models/user");
const { Inventory } = require("./models/inventory");
const { Contact } = require("./models/contact");

const db = require("./services/db");

const app = express();

// ==========================
// View Engine & Middleware
// ==========================
app.set("views", "./app/views");
app.set("view engine", "pug");

app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));

// ==========================
// Session Config
// ==========================
const oneHour = 60 * 60 * 1000;

app.use(
  session({
    secret: "secretkeysdfjsflyoifasd",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: oneHour
    }
  })
);

// ==========================
// Auth Helpers
// ==========================
function requireLogin(req, res, next) {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }
  next();
}

// ==========================
// Public Routes
// ==========================
app.get("/", (req, res) => {
  if (req.session.loggedIn) return res.redirect("/dashboard");
  res.render("login");
});

app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));
app.get("/home", (req, res) => res.render("home", { title: "Home" }));
app.get("/about", (req, res) => res.render("about", { title: "About" }));
app.get("/contact", (req, res) => res.render("contact", { title: "Contact" }));

// ==========================
// Register / Set Password
// ==========================
app.post("/set-password", async (req, res) => {
  const { email, password, businessName, forename, surname, contactNumber } =
    req.body;

  const user = new User(email);
  user.businessName = businessName;
  user.forename = forename;
  user.surname = surname;
  user.contactNumber = contactNumber;

  try {
    const uId = await user.getIdFromEmail();

    if (uId) {
      await user.setUserPassword(password);
      res.render("signup", { successMessage: "Password updated" });
    } else {
      await user.addUser(password);
      res.render("signup", { successMessage: "Account created" });
    }
  } catch (err) {
    res.render("signup", { errorMessage: "Something went wrong" });
  }
});

// ==========================
// Login
// ==========================
app.post("/authenticate", async (req, res) => {
  const { email, password } = req.body;
  const user = new User(email);

  try {
    const uId = await user.getIdFromEmail();
    if (!uId) {
      return res.render("login", { errorMessage: "Email not found" });
    }

    const match = await user.authenticate(password);
    if (!match) {
      return res.render("login", { errorMessage: "Invalid password" });
    }

    req.session.uid = uId;
    req.session.loggedIn = true;
    res.redirect("/dashboard");
  } catch (err) {
    res.render("login", { errorMessage: "Login failed" });
  }
});

// ==========================
// Logout
// ==========================
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ==========================
// DASHBOARD (USER-SCOPED)
// ==========================
app.get("/dashboard", requireLogin, async (req, res) => {
  try {
    const userId = req.session.uid;
    const { search = "", status = "", category = "" } = req.query;

    const filters = ["created_by = ?"];
    const params = [userId];

    if (search) {
      filters.push("(product_name LIKE ? OR location LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      filters.push("status = ?");
      params.push(status);
    }

    if (category) {
      filters.push("category = ?");
      params.push(category);
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;

    const summarySql = `
      SELECT
        COUNT(*) AS totalItems,
        SUM(status='available') AS availableItems,
        SUM(status='reserved') AS reservedItems,
        SUM(status='claimed') AS claimedItems,
        SUM(status='expired') AS expiredItems,
        SUM(expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)) AS expiringSoon
      FROM inventory_items
      WHERE created_by = ?;
    `;

    const itemsSql = `
      SELECT
        id, product_name, category, location,
        DATE_FORMAT(expiry_date,'%Y-%m-%d') AS expiry_date,
        quantity, original_price,
        ROUND(original_price * (1 - discount_percent/100), 2) AS discounted_price,
        discount_percent, status
      FROM inventory_items
      ${whereClause}
      ORDER BY expiry_date ASC
      LIMIT 20;
    `;

    const categoriesSql = `
      SELECT DISTINCT category
      FROM inventory_items
      WHERE created_by = ? AND category IS NOT NULL;
    `;

    const [summaryRows, expiringItems, categories] = await Promise.all([
      db.query(summarySql, [userId]),
      db.query(itemsSql, params),
      db.query(categoriesSql, [userId])
    ]);

    res.render("dashboard", {
      title: "Dashboard",
      summary: summaryRows[0],
      expiringItems,
      categories,
      filters: { search, status, category }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard error");
  }
});

// ==========================
// INVENTORY CREATE
// ==========================
app.get("/inventory/create", requireLogin, (req, res) => {
  res.render("inventory-create", { title: "Create Inventory" });
});

app.post("/inventory/create", requireLogin, async (req, res) => {
  const item = new Inventory();

  item.product_name = req.body.product_name;
  item.category = req.body.category;
  item.location = req.body.location;
  item.expiry_date = req.body.expiry_date;
  item.quantity = req.body.quantity;
  item.original_price = req.body.original_price;
  item.discount_percent = req.body.discount_percent;
  item.created_by = req.session.uid;

  const id = await item.addItem();
  if (id) return res.redirect("/dashboard");

  res.render("inventory-create", { errorMessage: "Failed to create item" });
});

// ==========================
// INVENTORY UPDATE
// ==========================
app.get("/inventory/update/:id", requireLogin, async (req, res) => {
  const item = await Inventory.getItemById(req.params.id);
  if (!item || item.created_by !== req.session.uid) {
    return res.redirect("/dashboard");
  }
  res.render("inventory-update", { item });
});

app.post("/inventory/update/:id", requireLogin, async (req, res) => {
  const item = new Inventory();
  item.id = req.params.id;

  item.product_name = req.body.product_name;
  item.category = req.body.category;
  item.location = req.body.location;
  item.expiry_date = req.body.expiry_date;
  item.quantity = req.body.quantity;
  item.original_price = req.body.original_price;
  item.discount_percent = req.body.discount_percent;
  item.status = req.body.status;

  await item.updateItem();
  res.redirect("/dashboard");
});

// ==========================
// INVENTORY DELETE
// ==========================
app.get("/inventory/delete/:id", requireLogin, async (req, res) => {
  const item = await Inventory.getItemById(req.params.id);
  if (!item || item.created_by !== req.session.uid) {
    return res.redirect("/dashboard");
  }
  res.render("inventory-delete", { item });
});

app.post("/inventory/delete/:id", requireLogin, async (req, res) => {
  await Inventory.deleteItem(req.params.id);
  res.redirect("/dashboard");
});


// ==========================
// CONTACT FORM SUBMISSION
// ==========================
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.render("contact", {
      errorMessage: "All fields are required."
    });
  }

  const contact = new Contact();
  contact.name = name;
  contact.email = email;
  contact.message = message;

  const saved = await contact.save();

  if (!saved) {
    return res.render("contact", {
      errorMessage: "Failed to send message. Please try again."
    });
  }

  res.render("contact", {
    successMessage: "Thank you! Your message has been sent."
  });
});

// ==========================
// PUBLIC DASHBOARD (CONSUMER)
// ==========================
app.get("/deals", async (req, res) => {
  const { search = "", category = "" } = req.query;

  const filters = [
    "status = 'available'",
    "expiry_date >= CURDATE()"
  ];
  const params = [];

  if (search) {
    filters.push("(product_name LIKE ? OR location LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    filters.push("category = ?");
    params.push(category);
  }

  const whereClause = `WHERE ${filters.join(" AND ")}`;

  const sql = `
    SELECT
      id,
      product_name,
      category,
      location,
      DATE_FORMAT(expiry_date,'%Y-%m-%d') AS expiry_date,
      quantity,
      original_price,
      ROUND(original_price * (1 - discount_percent/100), 2) AS discounted_price,
      discount_percent
    FROM inventory_items
    ${whereClause}
    ORDER BY expiry_date ASC
  `;

  const categoriesSql = `
    SELECT DISTINCT category
    FROM inventory_items
    WHERE status='available' AND expiry_date >= CURDATE()
  `;

  const [items, categories] = await Promise.all([
    db.query(sql, params),
    db.query(categoriesSql)
  ]);

  res.render("public-dashboard", {
    title: "Nearby Deals",
    items,
    categories,
    filters: { search, category }
  });
});

// ==========================
// PUBLIC PRODUCT DETAILS
// ==========================
app.get("/products/:id", async (req, res) => {
  try {
    const sql = `
      SELECT
        *,
        DATEDIFF(expiry_date, CURDATE()) AS days_to_expiry,
        ROUND(original_price * (1 - discount_percent/100), 2) AS discounted_price
      FROM inventory_items
      WHERE id = ?
        AND status = 'available'
        AND expiry_date >= CURDATE()
    `;

    const result = await db.query(sql, [req.params.id]);

    if (!result.length) {
      return res.redirect("/deals");
    }

    const product = result[0];

    // Recommended items (same category)
    const recommendedItems = await db.query(
      `
      SELECT
        id,
        product_name,
        expiry_date,
        ROUND(original_price * (1 - discount_percent/100), 2) AS discounted_price,
        discount_percent,
        status
      FROM inventory_items
      WHERE category = ?
        AND id != ?
        AND status = 'available'
        AND expiry_date >= CURDATE()
      LIMIT 4
      `,
      [product.category, product.id]
    );

    res.render("product-detail", {
      title: product.product_name,
      product,
      recommendedItems
    });
  } catch (err) {
    console.error(err);
    res.redirect("/deals");
  }
});


// ==========================
// Server
// ==========================
app.listen(3000, () => {
  console.log("Server running at http://127.0.0.1:3000/");
});
