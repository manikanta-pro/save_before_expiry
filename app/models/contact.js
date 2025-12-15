// models/contact.js
const db = require("../services/db");

class Contact {
  name;
  email;
  message;

  async save() {
    const sql = `
      INSERT INTO contact_messages (name, email, message)
      VALUES (?, ?, ?)
    `;

    try {
      await db.query(sql, [
        this.name,
        this.email,
        this.message
      ]);
      return true;
    } catch (err) {
      console.error("Error saving contact message:", err);
      return false;
    }
  }
}

module.exports = { Contact };
