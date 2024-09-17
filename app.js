const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid'); // Import uuid library
const path = require('path');

const app = express();
const port = 3000;

// Get the absolute path of the database file
const dbPath = path.resolve(__dirname, 'studietid.db');
console.log(`Connecting to database at: ${dbPath}`);

// Koble til databasen
const db = sqlite3(dbPath, { verbose: console.log });

// Verify database connection and table existence
try {
    const verifyTableStmt = db.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?');
    const tableExists = verifyTableStmt.get('table', 'user');
    if (!tableExists) {
        console.error('Table "user" does not exist in the database.');
        process.exit(1); // Exit the process if the table does not exist
    } else {
        console.log('Table "user" exists in the database.');
    }
} catch (error) {
    console.error('Error verifying table existence:', error.message);
    process.exit(1); // Exit the process if there is an error
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // For å servere statiske filer (HTML, CSS, JS)

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Hjemmeside (HTML)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/user', (req, res) => {
    const email = req.query.email;
    const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
    const user = stmt.get(email);
    if (user) {
        res.render('user', { user: user });
    } else {
        res.status(404).send('User not found');
    }
});

// Legg til bruker
app.post('/addUser', (req, res) => {
    const { firstName, lastName, idRole, email } = req.body;
    const userId = uuidv4(); // Generate a unique user ID
    console.log(`Attempting to add user with ID: ${userId}`);
    const result = addUser(firstName, lastName, idRole, email);
    res.send(result ? `Bruker lagt til med ID: ${userId}` : 'Feil ved å legge til bruker');
});

// Function to add user to the database
function addUser(firstName, lastName, idRole, email) {
    try {
        // Check if email already exists
        const checkEmailStmt = db.prepare('SELECT COUNT(*) AS count FROM user WHERE email = ?');
        const emailExists = checkEmailStmt.get(email).count > 0;

        if (emailExists) {
            console.error('Error adding user: Email already exists');
            return false;
        }

        const stmt = db.prepare('INSERT INTO user (firstName, lastName, idRole, email) VALUES (?, ?, ?, ?)');
        stmt.run(firstName, lastName, idRole, email);
        console.log(`User added with email: ${email}`);
        return true;
    } catch (error) {
        console.error('Error adding user:', error.message);
        return false;
    }
}

// Login user
app.post('/login', (req, res) => {
    const { email } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
        const user = stmt.get(email);
        if (user) {
            res.redirect(`/user?email=${email}`);
        } else {
            res.status(401).send('Invalid email');
        }
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).send('Error logging in');
    }
});

// Route handler to update user information
app.post('/update-user', (req, res) => {
    const { email, firstName, lastName } = req.body;
    try {
        const stmt = db.prepare('UPDATE user SET firstName = ?, lastName = ? WHERE email = ?');
        stmt.run(firstName, lastName, email);
        res.redirect(`/user?email=${email}`);
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).send('Error updating user');
    }
});

// Register activity
app.post('/regActivity', (req, res) => {
    const { userId, activity } = req.body;
    try {
        const stmt = db.prepare('INSERT INTO activity (userId, activity) VALUES (?, ?)');
        stmt.run(userId, activity);
        res.send('Aktivitet registrert');
    } catch (error) {
        console.error('Error registering activity:', error.message);
        res.status(500).send('Error registering activity');
    }
});

// Delete user
app.post('/deleteUser', (req, res) => {
    const { firstName, lastName, isAdmin, email } = req.body;
    try {
        const stmt = db.prepare('DELETE FROM user WHERE firstName = ? AND lastName = ? AND isAdmin = ? AND email = ?');
        stmt.run(firstName, lastName, isAdmin, email);
        res.send('Bruker slettet');
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).send('Error deleting user');
    }
});

// Get user
app.post('/getUser', (req, res) => {
    const { email } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
        const user = stmt.get(email);
        if (user) {
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(500).send('Error fetching user');
    }
});

app.listen(port, () => {
    console.log(`Server kjører på http://localhost:${port}`);
});