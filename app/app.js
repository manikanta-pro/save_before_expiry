// Import express.js
const express = require("express");
const path = require("path");

// Create express app
var app = express();

// Set Pug as the view engine
app.set("views", "./app/views");
app.set("view engine", "pug");

// Add static files location
app.use(express.static("static"));

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root - /
app.get("/", function(req, res) {
    res.render("home", { title: "Home" });
});

// About page
app.get("/about", function(req, res) {
    res.render("about", { title: "About" });
});

// Contact page
app.get("/contact", function(req, res) {
    res.render("contact", { title: "Contact" });
});

// Dashboard page with inventory insights
app.get("/dashboard", async function(req, res) {
    try {
        const { search = "", status = "", category = "" } = req.query;

        const filters = [];
        const params = [];

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

        const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

        const summarySql = `
            SELECT
                COUNT(*) AS totalItems,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS availableItems,
                SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reservedItems,
                SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) AS claimedItems,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) AS expiredItems,
                SUM(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 1 ELSE 0 END) AS expiringSoon
            FROM inventory_items;
        `;

        const expiringItemsSql = `
            SELECT
                id,
                product_name,
                category,
                location,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                quantity,
                original_price,
                ROUND(original_price * (1 - (discount_percent/100)), 2) AS discounted_price,
                discount_percent,
                status
            FROM inventory_items
            ${whereClause}
            ORDER BY expiry_date ASC
            LIMIT 20;
        `;

        const categoriesSql = `
            SELECT DISTINCT category
            FROM inventory_items
            WHERE category IS NOT NULL
            ORDER BY category ASC;
        `;

        const [summaryRows, expiringItems, categories] = await Promise.all([
            db.query(summarySql),
            db.query(expiringItemsSql, params),
            db.query(categoriesSql)
        ]);

        res.render("dashboard", {
            title: "Dashboard",
            summary: summaryRows[0] || {},
            expiringItems,
            filters: { search, status, category },
            categories
        });
    } catch (err) {
        console.error("Error loading dashboard", err);
        res.status(500).send("Unable to load dashboard right now.");
    }
});

// Product detail page
app.get("/products/:id", async function(req, res) {
    const productId = parseInt(req.params.id, 10);

    if (Number.isNaN(productId)) {
        return res.status(400).send("Invalid product id");
    }

    try {
        const productSql = `
            SELECT
                id,
                product_name,
                category,
                location,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                quantity,
                original_price,
                discount_percent,
                ROUND(original_price * (1 - (discount_percent/100)), 2) AS discounted_price,
                status,
                DATEDIFF(expiry_date, CURDATE()) AS days_to_expiry
            FROM inventory_items
            WHERE id = ?
            LIMIT 1;
        `;

        const [product] = await db.query(productSql, [productId]);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        const recommendationsSql = `
            SELECT
                id,
                product_name,
                category,
                location,
                DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                ROUND(original_price * (1 - (discount_percent/100)), 2) AS discounted_price,
                discount_percent,
                status
            FROM inventory_items
            WHERE category = ?
              AND id != ?
            ORDER BY expiry_date ASC
            LIMIT 3;
        `;

        let recommendedItems = await db.query(recommendationsSql, [product.category, productId]);

        // If no category matches, fall back to the soonest-to-expire items.
        if (!recommendedItems.length) {
            const fallbackSql = `
                SELECT
                    id,
                    product_name,
                    category,
                    location,
                    DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiry_date,
                    ROUND(original_price * (1 - (discount_percent/100)), 2) AS discounted_price,
                    discount_percent,
                    status
                FROM inventory_items
                WHERE id != ?
                ORDER BY expiry_date ASC
                LIMIT 3;
            `;
            recommendedItems = await db.query(fallbackSql, [productId]);
        }

        res.render("product-detail", {
            title: product.product_name,
            product,
            recommendedItems
        });
    } catch (err) {
        console.error("Error loading product detail", err);
        res.status(500).send("Unable to load product details right now.");
    }
});

// Create a route for testing the db
app.get("/db_test", function(req, res) {
    // Assumes a table called test_table exists in your database
    sql = 'select * from test_table';
    db.query(sql).then(results => {
        console.log(results);
        res.send(results)
    });
});

// Create a route for /goodbye
// Responds to a 'GET' request
app.get("/goodbye", function(req, res) {
    res.send("Goodbye world!");
});

// Create a dynamic route for /hello/<name>, where name is any value provided by user
// At the end of the URL
// Responds to a 'GET' request
app.get("/hello/:name", function(req, res) {
    // req.params contains any parameters in the request
    // We can examine it in the console for debugging purposes
    console.log(req.params);
    //  Retrieve the 'name' parameter and use it in a dynamically generated page
    res.send("Hello " + req.params.name);
});

// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});
