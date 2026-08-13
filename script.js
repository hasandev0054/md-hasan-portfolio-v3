function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);

    if (section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}
// Contact Form Submission
const contactForm = document.getElementById("contactForm");

if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!name || !email || !subject || !message) {
            alert("Please fill in all fields.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message);
                contactForm.reset();
            } else {
                alert(data.message || "Failed to send message.");
            }

        } catch (error) {
            console.error(error);
            alert("Server connection failed.");
        }
    });
}

// ======================
// Dark Mode
// ======================

const themeBtn = document.getElementById("theme-toggle");

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark");

    const icon = themeBtn.querySelector("i");

    if(document.body.classList.contains("dark")){
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
    }else{
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
    }

});

const words = [
    "Full Stack Developer",
    "Software Engineer",
    "WordPress Developer",
    "JavaScript Developer",
    "Backend Developer"
];

let wordIndex = 0;
let charIndex = 0;
let deleting = false;

const typing = document.getElementById("typing");

function typeEffect(){

    if(!typing) return;

    const currentWord = words[wordIndex];

    if(!deleting){

        typing.textContent =
        currentWord.substring(0,charIndex++);

        if(charIndex > currentWord.length){

            deleting = true;

            setTimeout(typeEffect,1200);

            return;

        }

    }else{

        typing.textContent =
        currentWord.substring(0,charIndex--);

        if(charIndex < 0){

            deleting = false;

            wordIndex++;

            if(wordIndex >= words.length){
                wordIndex = 0;
            }

        }

    }

    setTimeout(typeEffect,deleting ? 50 : 100);

}

typeEffect();
/* ==========================
   Loading Screen
========================== */

window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    setTimeout(() => {

        loader.classList.add("loader-hide");

    }, 1200);

});

/* ==========================
   BACK TO TOP BUTTON
========================== */

const topBtn = document.getElementById("topBtn");

window.addEventListener("scroll", function(){

    if(window.scrollY > 400){

        topBtn.style.display = "block";

    }

    else{

        topBtn.style.display = "none";

    }

});

topBtn.addEventListener("click", function(){

    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

});

/* ==========================
   Skill Animation
========================== */

window.addEventListener("load", () => {

    document.querySelectorAll(".progress-bar").forEach(bar => {

        const value = bar.style.width;

        bar.style.width = "0";

        setTimeout(() => {
            bar.style.width = value;
        }, 500);

    });

});

/* ==========================
   MOBILE NAVIGATION
========================== */

const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");

if (navToggle && navMenu) {

    navToggle.addEventListener("click", () => {

        navToggle.classList.toggle("active");
        navMenu.classList.toggle("active");

    });

    // Menu item click করলে menu বন্ধ হবে
    document.querySelectorAll(".nav-link").forEach(link => {

        link.addEventListener("click", () => {

            navToggle.classList.remove("active");
            navMenu.classList.remove("active");

        });

    });

}

