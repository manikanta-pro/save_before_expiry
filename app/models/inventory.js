const db = require("../services/db");

class Inventory {
  id;
  product_name;
  category;
  location;
  expiry_date;
  quantity;
  original_price;
  discount_percent;
  status;
  created_by;

  constructor() {
    this.status = "available";
  }

  /**
   * ADD inventory item
   * Linked to logged-in user via created_by
   */
  async addItem() {
    const sql = `
      INSERT INTO inventory_items
      (product_name, category, location, expiry_date, quantity,
       original_price, discount_percent, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await db.query(sql, [
        this.product_name,
        this.category,
        this.location,
        this.expiry_date,
        this.quantity,
        this.original_price,
        this.discount_percent,
        this.status,
        this.created_by // ✅ IMPORTANT
      ]);

      this.id = result.insertId;
      return this.id;
    } catch (err) {
      console.error("Error in addItem:", err);
      return false;
    }
  }

  /**
   * GET item by ID
   */
  static async getItemById(id) {
    const sql = "SELECT * FROM inventory_items WHERE id = ?";
    try {
      const result = await db.query(sql, [id]);
      return result.length ? result[0] : false;
    } catch (err) {
      console.error("Error in getItemById:", err);
      return false;
    }
  }

  /**
   * UPDATE inventory item
   */
  async updateItem() {
    const sql = `
      UPDATE inventory_items
      SET product_name=?, category=?, location=?, expiry_date=?,
          quantity=?, original_price=?, discount_percent=?, status=?
      WHERE id=?
    `;

    try {
      await db.query(sql, [
        this.product_name,
        this.category,
        this.location,
        this.expiry_date,
        this.quantity,
        this.original_price,
        this.discount_percent,
        this.status,
        this.id
      ]);
      return true;
    } catch (err) {
      console.error("Error in updateItem:", err);
      return false;
    }
  }

  /**
   * DELETE inventory item
   */
  static async deleteItem(id) {
    const sql = "DELETE FROM inventory_items WHERE id = ?";
    try {
      await db.query(sql, [id]);
      return true;
    } catch (err) {
      console.error("Error in deleteItem:", err);
      return false;
    }
  }
}

module.exports = {
  Inventory
};
