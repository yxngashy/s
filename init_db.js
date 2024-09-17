const sqlite3 = require('better-sqlite3');
const db = sqlite3('./studietid.db', { verbose: console.log });

// Create the users table
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    idRole INTEGER NOT NULL,
    isAdmin INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE
);
`;

db.exec(createUsersTable);

console.log('Database initialized and users table created.');