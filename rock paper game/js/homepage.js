document.getElementById("play-btn").addEventListener("click", function () {
  let difficultyOptions = document.getElementById("difficulty-options");
  if (difficultyOptions.classList.contains("hidden")) {
    difficultyOptions.classList.remove("hidden");
    setTimeout(() => {
      difficultyOptions.style.opacity = "1";
      difficultyOptions.style.marginTop = "10px";
    }, 10);
  } else {
    difficultyOptions.style.opacity = "0";
    difficultyOptions.style.marginTop = "0px";
    setTimeout(() => difficultyOptions.classList.add("hidden"), 300);
  }
});

document.getElementById("dark-mode-btn").addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "darkMode",
    document.body.classList.contains("dark-mode")
  );
  loadLeaderboard();
});

// Load dark mode setting from localStorage
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// Redirect to the game page when clicking 'Easy'
document.getElementById("easy-btn").addEventListener("click", function () {
  window.location.href = "easy.html";
});
// Redirect to the game page when clicking 'medium'
document.getElementById("med-btn").addEventListener("click", function () {
  window.location.href = "medium.html";
});
// Redirect to the game page when clicking 'hard'
document.getElementById("hard-btn").addEventListener("click", function () {
  window.location.href = "hard.html";
});

// Logout functionality
document.getElementById("logout-btn").addEventListener("click", function () {
  localStorage.clear(); // Clears stored session data
  window.location.href = "login.html"; // Redirects to login page
});

// Apply dark mode styling
const style = document.createElement("style");
style.innerHTML = `
  .dark-mode {
        background-image: url(/images/bg3.png); /* Replace with actual image path */
    background-size: cover;   /* Ensures the image covers the entire screen */
    background-position: center center; /* Centers the image */
    background-repeat: no-repeat;  /* Prevents repetition */
    object-fit: cover; /* Crops the image properly */
    color: white !important;
    }
    
    .dark-mode .leaderboard {
        border-color: black;
    }
    .dark-mode #play-btn, .dark-mode .difficulty {
        background: transparent;
    }
    #difficulty-options.hidden {
        display: none;
    }
    #difficulty-options {
        transition: opacity 0.3s ease, margin-top 0.3s ease;
        opacity: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 0px;
    }
    .leaderboard {
        position: absolute;
        top: 20px;
        left: 20px;
    }
`;
document.head.appendChild(style);
const clickSound = new Audio("sounds/click.wav");

function playClickSound() {
  clickSound.currentTime = 0; // Reset sound for quick successive clicks
  clickSound.play();
}

// Add click sound to all buttons
document.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", playClickSound);
});
const bgMusic = new Audio("sounds/bg.mp3"); // Ensure 'background.mp3' is in your project folder
bgMusic.loop = true; // Loop the music
bgMusic.volume = 0.5; // Adjust volume

// Check if music was previously enabled
if (localStorage.getItem("musicEnabled") === "true") {
  bgMusic.play();
}

// Toggle music function
document.getElementById("music-btn").addEventListener("click", function () {
  if (bgMusic.paused) {
    bgMusic.play();
    localStorage.setItem("musicEnabled", "true");
    document.getElementById("music-btn").innerHTML =
      '<i class="bx bxs-volume-full"></i>';
  } else {
    bgMusic.pause();
    localStorage.setItem("musicEnabled", "false");
    document.getElementById("music-btn").innerHTML =
      '<i class="bx bxs-volume-mute"></i>';
  }
});
document.getElementById("feedback-btn").addEventListener("click", function () {
  window.open(
    "https://mail.google.com/mail/?view=cm&fs=1&to=rockpapersaga@gmail.com&su=Feedback",
    "_blank"
  );
});
