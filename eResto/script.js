// CONNEXION 

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (email === "" || password === "") {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        alert("Connexion réussie !");
        window.location.href = "admin.html";
    });
}

//  INSCRIPTION 

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const restaurant = document.getElementById("restaurant").value.trim();
        const cuisine = document.getElementById("cuisine").value.trim();
        const adresse = document.getElementById("adresse").value.trim();
        const telephone = document.getElementById("telephone").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (
            restaurant === "" ||
            cuisine === "" ||
            adresse === "" ||
            telephone === "" ||
            email === "" ||
            password === ""
        ) {
            alert("Veuillez remplir tous les les champs.");
            return;
        }

        alert("Inscription réussie !");
        window.location.href = "connexion.html";
    });
}

//  GESTION DES PLATS 

const foodForm = document.getElementById("foodForm");
const foodList = document.getElementById("foodList");

let plats = [
    { nom: "Pizza Margherita", prix: 4500 },
    { nom: "Burger Maison", prix: 3500 },
    { nom: "Poulet Braisé", prix: 5000 }
];

function afficherPlats() {

    if (!foodList) return;

    foodList.innerHTML = "";

    plats.forEach((plat, index) => {

        const li = document.createElement("li");

        li.innerHTML = `
            <span>${plat.nom} - ${plat.prix} FCFA</span>
            <button class="delete" onclick="supprimerPlat(${index})">
                Supprimer
            </button>
        `;

        foodList.appendChild(li);

    });

}

if (foodForm) {

    afficherPlats();

    foodForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const nom = document.getElementById("foodName").value.trim();
        const prix = document.getElementById("foodPrice").value.trim();

        if (nom === "" || prix === "") {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        plats.push({
            nom: nom,
            prix: prix
        });

        afficherPlats();

        foodForm.reset();

    });

}

function supprimerPlat(index) {

    plats.splice(index, 1);

    afficherPlats();

}