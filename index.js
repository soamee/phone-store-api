const express = require("express");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");

const app = express();

const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Phone Store API",
    version: "1.0.0",
    description: "API for a simple phone store",
  },
  servers: [
    {
      url: "phones-store-api.containers.soamee.com",
      description: "Soamee server",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./index.js"], // point this to your API files
};

const port = process.env.PORT || 3000;

const db = new sqlite3.Database(":memory:");

const swaggerSpec = swaggerJSDoc(options);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Middleware
app.use(bodyParser.json());

// Function to seed initial data
function seedData() {
  const phones = [
    {
      name: "SuperPhone X1",
      photoUrl:
        "https://images.unsplash.com/photo-1605772575717-4548a90a5349?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bW9iaWxlJTIwcGhvdG9ncmFwaHl8ZW58MHx8MHx8fDA%3D&w=1000&q=80",
      price: 699.99,
      description: "A super phone with great features!",
    },
    {
      name: "MegaPhone 3000",
      photoUrl:
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YW5kcm9pZCUyMHBob25lfGVufDB8fDB8fHww&w=1000&q=80",
      price: 799.99,
      description: "Another great phone with an awesome camera!",
    },
    {
      name: "BasicPhone Mini",
      photoUrl:
        "https://expertphotography.b-cdn.net/wp-content/uploads/2022/09/How-To-Make-Your-Camera-Better-Quality-editing.jpg",
      price: 199.99,
      description: "A basic phone for all your basic needs.",
    },
    {
      name: "UltraPhone Z2",
      photoUrl:
        "https://imgv3.fotor.com/images/blog-cover-image/a-female-editing-photos-on-iphone.jpg",
      price: 899.99,
      description: "Experience ultra speed and performance!",
    },
    {
      name: "MobiMax Pro",
      photoUrl:
        "https://img.freepik.com/free-photo/creative-reels-composition_23-2149711500.jpg",
      price: 749.99,
      description: "Max out your mobile experience with MobiMax Pro!",
    },
    {
      name: "EconoPhone Lite",
      photoUrl:
        "https://cdn.mos.cms.futurecdn.net/2LMudXBYQMgntPyw9EeNoN-1200-80.jpg",
      price: 99.99,
      description: "Affordable phone for everyday use!",
    },
  ];

  const stmt = db.prepare(
    "INSERT INTO phones (name, photoUrl, price, description) VALUES (?, ?, ?, ?)"
  );
  phones.forEach((phone) => {
    stmt.run(phone.name, phone.photoUrl, phone.price, phone.description);
  });
  stmt.finalize();
}

// Initialize database
db.serialize(() => {
  db.run(
    "CREATE TABLE phones (id INTEGER PRIMARY KEY, name TEXT, photoUrl TEXT, price REAL, description TEXT)"
  );
  db.run("CREATE TABLE favorites (username TEXT, phoneId INTEGER)");
  db.run("CREATE TABLE purchases (username TEXT, phoneId INTEGER)", seedData);
});

// CRUD: Read all phones
/**
 * @swagger
 * /phones:
 *  get:
 *    summary: Retrieve a list of phones.
 *    tags: [Phones]
 *    responses:
 *      200:
 *        description: A list of phones.
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/Phone'
 *
 * components:
 *  schemas:
 *    Phone:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *        name:
 *          type: string
 *        photoUrl:
 *          type: string
 *        price:
 *          type: number
 *        description:
 *          type: string
 */
app.get("/phones", (req, res) => {
  db.all("SELECT * FROM phones", [], (err, phones) => {
    if (err) return res.status(500).json({ error: err.message });

    let completed = 0; // Counter to track completed phone favorite lookups

    if (phones.length === 0) return res.json([]); // If no phones, return an empty list

    phones.forEach((phone, index) => {
      db.all(
        "SELECT username FROM favorites WHERE phoneId = ?",
        [phone.id],
        (err, users) => {
          if (err) return res.status(500).json({ error: err.message });

          phone.favorites = users.map((user) => user.username);

          completed++;
          if (completed === phones.length) {
            res.json(phones);
          }
        }
      );
    });
  });
});

// CRUD: Create
/**
 * @swagger
 * /phones:
 *  post:
 *    summary: Add a new phone.
 *    tags: [Phones]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/PhoneWithoutID'
 *    responses:
 *      200:
 *        description: Phone added successfully.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Phone'
 *      500:
 *        description: Server error.
 */
app.post("/phones", (req, res) => {
  const { name, photoUrl, price, description } = req.body;
  const stmt = db.prepare(
    "INSERT INTO phones (name, photoUrl, price, description) VALUES (?, ?, ?, ?)"
  );
  stmt.run(name, photoUrl, price, description, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Phone added successfully!" });
  });
  stmt.finalize();
});

// CRUD: Read
/**
 * @swagger
 * /phone/{id}:
 *  get:
 *    summary: Retrieve a specific phone by ID.
 *    tags: [Phones]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the phone to retrieve.
 *    responses:
 *      200:
 *        description: A single phone.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Phone'
 *      404:
 *        description: Phone not found.
 *      500:
 *        description: Server error.
 */
app.get("/phones/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM phones WHERE id = ?", [id], (err, phone) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!phone) return res.status(404).json({ error: "Phone not found!" });

    // Fetch users who marked this phone as favorite
    db.all(
      "SELECT username FROM favorites WHERE phoneId = ?",
      [id],
      (err, users) => {
        if (err) return res.status(500).json({ error: err.message });

        phone.favorites = users.map((user) => user.username);
        res.json(phone);
      }
    );
  });
});

// CRUD: Update
/**
 * @swagger
 * /phone/{id}:
 *  put:
 *    summary: Update a specific phone by ID.
 *    tags: [Phones]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the phone to update.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/PhoneWithoutID'
 *    responses:
 *      200:
 *        description: Phone updated successfully.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Phone'
 *      404:
 *        description: Phone not found.
 *      500:
 *        description: Server error.
 */
app.put("/phones/:id", (req, res) => {
  const { id } = req.params;
  const { name, photoUrl, price, description } = req.body;
  const stmt = db.prepare(
    "UPDATE phones SET name = ?, photoUrl = ?, price = ?, description = ? WHERE id = ?"
  );
  stmt.run(name, photoUrl, price, description, id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Phone updated successfully!" });
  });
  stmt.finalize();
});

// CRUD: Delete
/**
 * @swagger
 * /phone/{id}:
 *  delete:
 *    summary: Delete a specific phone by ID.
 *    tags: [Phones]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the phone to delete.
 *    responses:
 *      200:
 *        description: Phone deleted successfully.
 *      404:
 *        description: Phone not found.
 *      500:
 *        description: Server error.
 */
app.delete("/phones/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM phones WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Phone deleted successfully!" });
  });
});

// Toggle as Favorite
/**
 * @swagger
 * /phone/{id}/favorite:
 *  post:
 *    summary: Toggle a phone as favorite for a user.
 *    tags: [Phones]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the phone to toggle as favorite.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                description: Username of the user marking the phone as favorite.
 *    responses:
 *      200:
 *        description: Phone marked as favorite successfully.
 *      404:
 *        description: Phone not found.
 *      500:
 *        description: Server error.
 */
app.put("/phones/:id/favorite", (req, res) => {
  const { id } = req.params;
  const username = req.headers.username;
  db.get(
    "SELECT * FROM favorites WHERE phoneId = ? AND username = ?",
    [id, username],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run(
          "DELETE FROM favorites WHERE phoneId = ? AND username = ?",
          [id, username],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Removed from favorites!" });
          }
        );
      } else {
        db.run(
          "INSERT INTO favorites (username, phoneId) VALUES (?, ?)",
          [username, id],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Added to favorites!" });
          }
        );
      }
    }
  );
});

// Buy a Phone
/**
 * @swagger
 * /phone/{id}/buy:
 *  post:
 *    summary: Purchase a specific phone by ID.
 *    tags: [Purchases]
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: ID of the phone to buy.
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              username:
 *                type: string
 *                description: Username of the user buying the phone.
 *    responses:
 *      200:
 *        description: Phone purchased successfully.
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/Purchase'
 *      404:
 *        description: Phone not found.
 *      500:
 *        description: Server error.
 */
app.post("/phones/:id/buy", (req, res) => {
  const { id } = req.params;
  const username = req.headers.username;
  db.run(
    "INSERT INTO purchases (username, phoneId) VALUES (?, ?)",
    [username, id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Phone purchased successfully!" });
    }
  );
});

// GET purchases
/**
 * @swagger
 * /purchases:
 *  get:
 *    summary: Retrieve a list of all phone purchases.
 *    tags: [Purchases]
 *    responses:
 *      200:
 *        description: A list of phone purchases.
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/PurchaseDetails'
 *      500:
 *        description: Server error.
 */
app.get("/purchases", (req, res) => {
  const sql = `SELECT phones.id as phoneId, phones.name, phones.photoUrl, phones.price, phones.description, purchases.username 
                 FROM purchases
                 JOIN phones ON purchases.phoneId = phones.id`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const purchases = rows.map((row) => ({
      id: row.purchaseId,
      phone: {
        id: row.phoneId,
        name: row.name,
        photoUrl: row.photoUrl,
        price: row.price,
        description: row.description,
      },
      username: row.username,
    }));

    res.json(purchases);
  });
});

/**
 * @swagger
 * components:
 *  schemas:
 *    Purchase:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: ID of the purchase.
 *        phoneId:
 *          type: integer
 *          description: ID of the purchased phone.
 *        username:
 *          type: string
 *          description: Username of the user who bought the phone.
 */

// Note: We need a new schema 'PurchaseDetails' to represent the detailed purchase data:
/**
 * @swagger
 * components:
 *  schemas:
 *    PurchaseDetails:
 *      type: object
 *      properties:
 *        id:
 *          type: integer
 *          description: ID of the purchase.
 *        phone:
 *          $ref: '#/components/schemas/Phone'
 *        username:
 *          type: string
 *          description: Username of the user who bought the phone.
 */

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
