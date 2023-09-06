const express = require("express");
const sqlite3 = require("sqlite3");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT || 3000;

const db = new sqlite3.Database(":memory:");

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
app.delete("/phones/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM phones WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Phone deleted successfully!" });
  });
});

// Toggle as Favorite
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
app.get("/purchases", (req, res) => {
  db.all(
    "SELECT phones.name as phoneName, purchases.username FROM purchases JOIN phones ON purchases.phoneId = phones.id",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const purchases = rows.map((row) => ({
        phoneName: row.phoneName,
        boughtBy: row.username,
      }));

      res.json(purchases);
    }
  );
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
