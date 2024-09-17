async function fetchUsers() {
    try {
        let response = await fetch('/getusers'); // Fetch data from the database
        let data = await response.json();

        let tableBody = document.getElementById('usersTableBody');

        data.forEach(user => {
            let row = document.createElement('tr');

            let firstNameCell = document.createElement('td');
            firstNameCell.textContent = user.firstName;
            row.appendChild(firstNameCell);

            let lastNameCell = document.createElement('td');
            lastNameCell.textContent = user.lastName;
            row.appendChild(lastNameCell);

            let emailCell = document.createElement('td');
            emailCell.textContent = user.email;
            row.appendChild(emailCell);

            tableBody.appendChild(row);
        });
    } catch (error) {
        console.log('Error:', error); // Handle any errors
    }
}

// Call the function to fetch and display users when the page loads
window.onload = fetchUsers;